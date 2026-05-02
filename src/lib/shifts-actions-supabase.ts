import { NextResponse } from "next/server";
import { recordLog } from "@/lib/audit";
import { forbidden, hasRole, type SessionUser } from "@/lib/auth";
import { shiftRowToClient } from "@/lib/shift-dto";
import { getSupabaseServerClient } from "@/lib/supabase";
import { findClientForActor, nextTableId } from "@/lib/supabase-db";

type ShiftAction =
  | "worker_check_in"
  | "worker_check_out"
  | "client_approve_timesheet"
  | "admin_override_assignment"
  | "admin_finalize_payment"
  | "admin_mark_paid"
  | "admin_mark_invoiced";

/** Week 2: parity with `shifts/actions` JSON path — updates `shifts` + `timesheets` in Postgres. */
export async function postShiftActionSupabase(
  body: Record<string, unknown>,
  actor: SessionUser,
): Promise<NextResponse> {
  const shiftId = String(body?.shiftId || "");
  const action = String(body?.action || "") as ShiftAction;
  const nowIso = new Date().toISOString();

  const supabase = getSupabaseServerClient();
  const { data: row, error: fetchErr } = await supabase.from("shifts").select("*").eq("id", shiftId).maybeSingle();
  if (fetchErr || !row) {
    return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  }
  const shift = row as Record<string, unknown>;
  const workerIdStr = String(shift.worker_id ?? shift.workerId ?? "");
  const shiftStatus = String(shift.status ?? "");

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
    if (workerIdStr !== actor.id) return forbidden("Worker can only check in to their own shift");
    if (shiftStatus !== "Upcoming") {
      return NextResponse.json({ error: "Shift must be Upcoming before check-in" }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("shifts")
      .update({
        status: "Active",
        actual_check_in: String(body?.actualCheckIn || new Date().toLocaleTimeString()),
        gps_status: String(body?.gpsStatus || "Verified"),
      })
      .eq("id", shiftId)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await recordLog("WORKER_CHECK_IN", `Worker ${actor.id} checked in for shift ${shiftId}`, actor.email, actor.id);
    return NextResponse.json(shiftRowToClient(data as Record<string, unknown>));
  }

  if (action === "worker_check_out") {
    if (workerIdStr !== actor.id) return forbidden("Worker can only check out from their own shift");
    if (shiftStatus !== "Active") {
      return NextResponse.json({ error: "Shift must be Active before check-out" }, { status: 400 });
    }

    const actualCheckIn = shift.actual_check_in ?? shift.actualCheckIn;
    const actualCheckOut = String(body?.actualCheckOut || new Date().toLocaleTimeString());

    let timesheetId = String(shift.timesheet_id ?? shift.timesheetId ?? "").trim();
    if (!timesheetId) {
      timesheetId = await nextTableId("TS", "timesheets");
    }

    const tsPayload = {
      id: timesheetId,
      shift_id: shiftId,
      worker_id: workerIdStr,
      worker_name: String(shift.worker_name ?? shift.workerName ?? ""),
      client_id: shift.client_id ?? shift.clientId ?? null,
      client_name: String(shift.client_name ?? shift.clientName ?? ""),
      venue_name: String(shift.venue_name ?? shift.venueName ?? ""),
      role: String(shift.role ?? ""),
      date: shift.date ?? null,
      scheduled_start: shift.scheduled_start ?? shift.scheduledStart ?? null,
      scheduled_end: shift.scheduled_end ?? shift.scheduledEnd ?? null,
      actual_check_in: actualCheckIn ?? null,
      actual_check_out: actualCheckOut,
      hours: Number(shift.hours ?? 0),
      rate: Number(shift.rate ?? 0),
      status: "pending_client_approval",
      created_at: nowIso,
      updated_at: nowIso,
    };

    const { error: upsertTsErr } = await supabase.from("timesheets").upsert(tsPayload, { onConflict: "id" });
    if (upsertTsErr) return NextResponse.json({ error: upsertTsErr.message }, { status: 500 });

    const { data: updated, error: updErr } = await supabase
      .from("shifts")
      .update({
        status: "Completed",
        actual_check_out: actualCheckOut,
        timesheet_id: timesheetId,
        payment_status: String(shift.payment_status ?? shift.paymentStatus ?? "pending"),
        invoice_status: String(shift.invoice_status ?? shift.invoiceStatus ?? "pending"),
      })
      .eq("id", shiftId)
      .select("*")
      .single();
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    await recordLog("WORKER_CHECK_OUT", `Worker ${actor.id} checked out from shift ${shiftId}`, actor.email, actor.id);
    return NextResponse.json(shiftRowToClient(updated as Record<string, unknown>));
  }

  if (action === "client_approve_timesheet") {
    if (shiftStatus !== "Completed") {
      return NextResponse.json({ error: "Shift must be Completed before timesheet approval" }, { status: 400 });
    }
    const tid = String(shift.timesheet_id ?? shift.timesheetId ?? "");
    if (!tid) return NextResponse.json({ error: "No timesheet found for shift" }, { status: 400 });

    if (hasRole(actor, ["user"])) {
      const own = await findClientForActor(actor);
      const cid = String(shift.client_id ?? shift.clientId ?? "");
      if (!own || String(own.id) !== cid) return forbidden("You can only approve timesheets for your own shifts");
    }

    const { error: tsErr } = await supabase
      .from("timesheets")
      .update({
        status: "approved_by_client",
        approved_at: nowIso,
        approved_by: actor.id,
        updated_at: nowIso,
      })
      .eq("id", tid);

    if (tsErr) return NextResponse.json({ error: tsErr.message }, { status: 500 });

    const { data: approvedShift, error: shErr } = await supabase
      .from("shifts")
      .update({ is_approved: true })
      .eq("id", shiftId)
      .select("*")
      .single();
    if (shErr) return NextResponse.json({ error: shErr.message }, { status: 500 });

    await recordLog("CLIENT_APPROVE_TIMESHEET", `Client approved timesheet ${tid}`, actor.email, actor.id);
    return NextResponse.json(shiftRowToClient(approvedShift as Record<string, unknown>));
  }

  if (action === "admin_override_assignment") {
    const workerId = String(body?.workerId || "");
    const workerName = String(body?.workerName || "");
    if (!workerId || !workerName) return NextResponse.json({ error: "Missing worker override details" }, { status: 400 });
    const { data, error } = await supabase
      .from("shifts")
      .update({
        worker_id: workerId,
        worker_name: workerName,
        status: "Upcoming",
      })
      .eq("id", shiftId)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await recordLog("ADMIN_OVERRIDE_ASSIGNMENT", `Admin override assigned ${workerId} to shift ${shiftId}`, actor.email, actor.id);
    return NextResponse.json(shiftRowToClient(data as Record<string, unknown>));
  }

  if (action === "admin_finalize_payment") {
    const approved = Boolean(shift.is_approved ?? shift.isApproved);
    if (!approved) {
      return NextResponse.json({ error: "Timesheet must be client-approved before payment finalization" }, { status: 400 });
    }
    const { data, error } = await supabase.from("shifts").update({ payment_status: "finalized" }).eq("id", shiftId).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await recordLog("ADMIN_FINALIZE_PAYMENT", `Payment finalized for shift ${shiftId}`, actor.email, actor.id);
    return NextResponse.json(shiftRowToClient(data as Record<string, unknown>));
  }

  if (action === "admin_mark_paid") {
    const { data, error } = await supabase.from("shifts").update({ payment_status: "paid" }).eq("id", shiftId).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await recordLog("ADMIN_MARK_PAID", `Worker marked paid for shift ${shiftId}`, actor.email, actor.id);
    return NextResponse.json(shiftRowToClient(data as Record<string, unknown>));
  }

  if (action === "admin_mark_invoiced") {
    const { data, error } = await supabase
      .from("shifts")
      .update({ invoice_status: "invoiced", is_invoiced: true })
      .eq("id", shiftId)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await recordLog("ADMIN_MARK_INVOICED", `Client invoiced for shift ${shiftId}`, actor.email, actor.id);
    return NextResponse.json(shiftRowToClient(data as Record<string, unknown>));
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
