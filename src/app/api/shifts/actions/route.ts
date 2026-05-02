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

type ShiftAction =
  | "worker_check_in"
  | "worker_check_out"
  | "client_approve_timesheet"
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
    if (action === "client_approve_timesheet" && !hasRole(actor, ["user", "admin", "super_admin"])) {
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
        hours: shift.hours || 0,
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
        timesheetId,
        paymentStatus: shift.paymentStatus || "pending",
        invoiceStatus: shift.invoiceStatus || "pending",
      };
      await recordLog("WORKER_CHECK_OUT", `Worker ${actor.id} checked out from shift ${shift.id}`, actor.email, actor.id);
    }

    if (action === "client_approve_timesheet") {
      if (shift.status !== "Completed") {
        return NextResponse.json({ error: "Shift must be Completed before timesheet approval" }, { status: 400 });
      }
      if (!shift.timesheetId) {
        return NextResponse.json({ error: "No timesheet found for shift" }, { status: 400 });
      }

      const timesheets = await readJsonFile<any[]>(timesheetsPath, []);
      const tsIndex = timesheets.findIndex((t: any) => t.id === shift.timesheetId);
      if (tsIndex === -1) return NextResponse.json({ error: "Timesheet not found" }, { status: 404 });

      timesheets[tsIndex] = {
        ...timesheets[tsIndex],
        status: "approved_by_client",
        approvedAt: nowIso,
        approvedBy: actor.id,
        updatedAt: nowIso,
      };
      await withFileLock(timesheetsPath, async () => {
        await writeJsonFileAtomic(timesheetsPath, timesheets);
      });

      shifts[shiftIndex] = { ...shift, isApproved: true };
      await recordLog("CLIENT_APPROVE_TIMESHEET", `Client approved timesheet ${shift.timesheetId}`, actor.email, actor.id);
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
  } catch (error) {
    return NextResponse.json({ error: "Failed to process shift action" }, { status: 500 });
  }
}
