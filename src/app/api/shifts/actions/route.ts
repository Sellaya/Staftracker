import { NextResponse } from "next/server";
import path from "path";
import { forbidden, getSessionUserFromRequest, hasRole, unauthorized } from "@/lib/auth";
import { generateId, readJsonFile, withFileLock, writeJsonFileAtomic } from "@/lib/json-db";
import { recordLog } from "@/lib/audit";
import { hasSupabaseEnv } from "@/lib/supabase";
import { postShiftActionSupabase } from "@/lib/shifts-actions-supabase";

export const dynamic = "force-dynamic";

const shiftsPath = path.join(process.cwd(), "shifts.json");
const timesheetsPath = path.join(process.cwd(), "timesheets.json");

function hoursBetweenTimes(start?: unknown, end?: unknown, fallback = 0): number {
  const parse = (value: unknown) => {
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
    if (!match) return null;
    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const meridiem = match[3]?.toUpperCase();
    if (meridiem === "PM" && hours < 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    return hours * 60 + minutes;
  };
  const startMinutes = parse(start);
  const endMinutes = parse(end);
  if (startMinutes == null || endMinutes == null) return fallback;
  const diff = endMinutes >= startMinutes ? endMinutes - startMinutes : endMinutes + 24 * 60 - startMinutes;
  return Number((diff / 60).toFixed(2));
}

type ShiftAction =
  | "worker_check_in"
  | "worker_check_out"
  | "client_approve_timesheet"
  | "client_flag_issue"
  | "admin_approve_timesheet"
  | "admin_reject_timesheet"
  | "admin_override_assignment"
  | "admin_finalize_payment"
  | "admin_mark_paid"
  | "admin_mark_invoiced";

export async function POST(request: Request) {
  const actor = getSessionUserFromRequest(request);
  if (!actor) return unauthorized();

  try {
    const body = await request.json();

    if (hasSupabaseEnv()) {
      return postShiftActionSupabase(body as Record<string, unknown>, actor);
    }

    const shiftId = String(body?.shiftId || "");
    const action = String(body?.action || "") as ShiftAction;
    if (!shiftId || !action) {
      return NextResponse.json({ error: "Missing shiftId or action" }, { status: 400 });
    }

    const shifts = await readJsonFile<any[]>(shiftsPath, []);
    const shiftIndex = shifts.findIndex((s: any) => s.id === shiftId);
    if (shiftIndex === -1) return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    const shift = shifts[shiftIndex];
    const nowIso = new Date().toISOString();

    if ((action === "worker_check_in" || action === "worker_check_out") && !hasRole(actor, ["worker"])) {
      return forbidden("Only workers can perform this action");
    }
    if ((action === "client_approve_timesheet" || action === "client_flag_issue") && !hasRole(actor, ["user", "admin", "super_admin"])) {
      return forbidden("Only client/company users can approve timesheets");
    }
    if (action.startsWith("admin_") && !hasRole(actor, ["admin", "super_admin"])) {
      return forbidden("Only admins can perform this action");
    }

    if (action === "worker_check_in") {
      if (shift.workerId !== actor.id) return forbidden("Worker can only check in to their own shift");
      if (shift.status !== "Upcoming") {
        return NextResponse.json({ error: "Shift must be Upcoming before check-in" }, { status: 400 });
      }
      shifts[shiftIndex] = {
        ...shift,
        status: "Active",
        actualCheckIn: body?.actualCheckIn || new Date().toLocaleTimeString(),
        gpsStatus: body?.gpsStatus || "Verified",
      };
      await recordLog("WORKER_CHECK_IN", `Worker ${actor.id} checked in for shift ${shift.id}`, actor.email, actor.id);
    }

    if (action === "worker_check_out") {
      if (shift.workerId !== actor.id) return forbidden("Worker can only check out from their own shift");
      if (shift.status !== "Active") {
        return NextResponse.json({ error: "Shift must be Active before check-out" }, { status: 400 });
      }

      const completedShift = {
        ...shift,
        status: "Completed",
        actualCheckOut: body?.actualCheckOut || new Date().toLocaleTimeString(),
      };
      const billableHours = hoursBetweenTimes(completedShift.actualCheckIn, completedShift.actualCheckOut, Number(shift.hours || 0));

      const timesheets = await readJsonFile<any[]>(timesheetsPath, []);
      const timesheetId = shift.timesheetId || generateId("TS", timesheets.map((t: any) => String(t.id || "")));
      const timesheet = {
        id: timesheetId,
        shiftId: shift.id,
        workerId: shift.workerId,
        workerName: shift.workerName,
        clientId: shift.clientId || null,
        clientName: shift.clientName || null,
        venueName: shift.venueName,
        role: shift.role,
        date: shift.date,
        scheduledStart: shift.scheduledStart,
        scheduledEnd: shift.scheduledEnd,
        actualCheckIn: completedShift.actualCheckIn || null,
        actualCheckOut: completedShift.actualCheckOut || null,
        hours: billableHours,
        rate: shift.rate || 0,
        status: "pending_client_approval",
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      const existingTsIndex = timesheets.findIndex((t: any) => t.id === timesheetId);
      if (existingTsIndex >= 0) timesheets[existingTsIndex] = timesheet;
      else timesheets.unshift(timesheet);
      await withFileLock(timesheetsPath, async () => {
        await writeJsonFileAtomic(timesheetsPath, timesheets);
      });

      shifts[shiftIndex] = {
        ...completedShift,
        hours: billableHours,
        timesheetId,
        paymentStatus: shift.paymentStatus || "pending",
        invoiceStatus: shift.invoiceStatus || "pending",
      };
      await recordLog("WORKER_CHECK_OUT", `Worker ${actor.id} checked out from shift ${shift.id}`, actor.email, actor.id);
    }

    if (action === "client_approve_timesheet" || action === "admin_approve_timesheet") {
      if (shift.status !== "Completed") {
        return NextResponse.json({ error: "Shift must be Completed before timesheet approval" }, { status: 400 });
      }
      if (!shift.timesheetId) {
        return NextResponse.json({ error: "No timesheet found for shift" }, { status: 400 });
      }
      if (action === "admin_approve_timesheet" && !hasRole(actor, ["admin", "super_admin"])) {
        return forbidden("Only admins can approve timesheets");
      }
      if (actor.role === "user") {
        const clients = await readJsonFile<any[]>(path.join(process.cwd(), "clients.json"), []);
        const own = clients.find(
          (c: any) => c.createdByUserId === actor.id || c.email?.toLowerCase() === actor.email.toLowerCase()
        );
        if (!own || shift.clientId !== own.id) {
          return forbidden("You can only approve timesheets for your own shifts");
        }
      }

      const timesheets = await readJsonFile<any[]>(timesheetsPath, []);
      const tsIndex = timesheets.findIndex((t: any) => t.id === shift.timesheetId);
      if (tsIndex === -1) return NextResponse.json({ error: "Timesheet not found" }, { status: 404 });

      timesheets[tsIndex] = {
        ...timesheets[tsIndex],
        status: action === "admin_approve_timesheet" ? "approved_by_admin" : "approved_by_client",
        approvedAt: nowIso,
        approvedBy: actor.id,
        updatedAt: nowIso,
      };
      await withFileLock(timesheetsPath, async () => {
        await writeJsonFileAtomic(timesheetsPath, timesheets);
      });

      shifts[shiftIndex] = { ...shift, isApproved: true, isFlagged: false, flagReason: undefined };
      await recordLog(
        action === "admin_approve_timesheet" ? "ADMIN_APPROVE_TIMESHEET" : "CLIENT_APPROVE_TIMESHEET",
        `${action === "admin_approve_timesheet" ? "Admin" : "Client"} approved timesheet ${shift.timesheetId}`,
        actor.email,
        actor.id
      );
    }

    if (action === "admin_reject_timesheet" || action === "client_flag_issue") {
      if (shift.status !== "Completed") {
        return NextResponse.json({ error: "Shift must be Completed before timesheet review" }, { status: 400 });
      }
      if (!shift.timesheetId) {
        return NextResponse.json({ error: "No timesheet found for shift" }, { status: 400 });
      }
      if (action === "admin_reject_timesheet" && !hasRole(actor, ["admin", "super_admin"])) {
        return forbidden("Only admins can reject timesheets");
      }
      if (actor.role === "user") {
        const clients = await readJsonFile<any[]>(path.join(process.cwd(), "clients.json"), []);
        const own = clients.find(
          (c: any) => c.createdByUserId === actor.id || c.email?.toLowerCase() === actor.email.toLowerCase()
        );
        if (!own || shift.clientId !== own.id) {
          return forbidden("You can only flag timesheets for your own shifts");
        }
      }
      const reason = String(body?.reason || body?.flagReason || "Timesheet requires admin review").trim();
      const timesheets = await readJsonFile<any[]>(timesheetsPath, []);
      const tsIndex = timesheets.findIndex((t: any) => t.id === shift.timesheetId);
      if (tsIndex === -1) return NextResponse.json({ error: "Timesheet not found" }, { status: 404 });

      timesheets[tsIndex] = {
        ...timesheets[tsIndex],
        status: action === "admin_reject_timesheet" ? "rejected_by_admin" : "issue_flagged",
        rejectionReason: action === "admin_reject_timesheet" ? reason : timesheets[tsIndex].rejectionReason,
        issueReason: action === "client_flag_issue" ? reason : timesheets[tsIndex].issueReason,
        updatedAt: nowIso,
      };
      await withFileLock(timesheetsPath, async () => {
        await writeJsonFileAtomic(timesheetsPath, timesheets);
      });

      shifts[shiftIndex] = {
        ...shift,
        isApproved: false,
        isFlagged: true,
        flagReason: reason,
      };
      await recordLog(
        action === "admin_reject_timesheet" ? "ADMIN_REJECT_TIMESHEET" : "CLIENT_FLAG_TIMESHEET",
        `${action === "admin_reject_timesheet" ? "Admin rejected" : "Client flagged"} timesheet ${shift.timesheetId}: ${reason}`,
        actor.email,
        actor.id
      );
    }

    if (action === "admin_override_assignment") {
      const workerId = String(body?.workerId || "");
      const workerName = String(body?.workerName || "");
      if (!workerId || !workerName) return NextResponse.json({ error: "Missing worker override details" }, { status: 400 });
      shifts[shiftIndex] = {
        ...shift,
        workerId,
        workerName,
        status: "Upcoming",
      };
      await recordLog("ADMIN_OVERRIDE_ASSIGNMENT", `Admin override assigned ${workerId} to shift ${shift.id}`, actor.email, actor.id);
    }

    if (action === "admin_finalize_payment") {
      if (!shift.isApproved) {
        return NextResponse.json({ error: "Timesheet must be client-approved before payment finalization" }, { status: 400 });
      }
      shifts[shiftIndex] = { ...shift, paymentStatus: "finalized" };
      await recordLog("ADMIN_FINALIZE_PAYMENT", `Payment finalized for shift ${shift.id}`, actor.email, actor.id);
    }

    if (action === "admin_mark_paid") {
      shifts[shiftIndex] = { ...shift, paymentStatus: "paid" };
      await recordLog("ADMIN_MARK_PAID", `Worker marked paid for shift ${shift.id}`, actor.email, actor.id);
    }

    if (action === "admin_mark_invoiced") {
      shifts[shiftIndex] = { ...shift, invoiceStatus: "invoiced", isInvoiced: true };
      await recordLog("ADMIN_MARK_INVOICED", `Client invoiced for shift ${shift.id}`, actor.email, actor.id);
    }

    await withFileLock(shiftsPath, async () => {
      await writeJsonFileAtomic(shiftsPath, shifts);
    });

    return NextResponse.json(shifts[shiftIndex]);
  } catch {
    return NextResponse.json({ error: "Failed to process shift action" }, { status: 500 });
  }
}
