import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import path from 'path';
import { recordLog } from '@/lib/audit';
import { forbidden, getSessionUserFromRequest, hasRole, unauthorized } from '@/lib/auth';
import { generateId, readJsonFile, withFileLock, writeJsonFileAtomic } from '@/lib/json-db';
import { getSupabaseServerClient, hasSupabaseEnv } from '@/lib/supabase';
import { findClientForActor, nextTableId } from '@/lib/supabase-db';
import { shiftRowToClient } from '@/lib/shift-dto';

const dbPath = path.join(process.cwd(), 'shifts.json');
const clientsPath = path.join(process.cwd(), 'clients.json');

async function resolveActorClient(actor: { id: string; email: string }) {
  const clients = await readJsonFile<any[]>(clientsPath, []);
  return (
    clients.find(
      (c: any) => c.createdByUserId === actor.id || c.email?.toLowerCase() === actor.email.toLowerCase()
    ) || null
  );
}

async function readDB() {
  return readJsonFile<any[]>(dbPath, []);
}

async function writeDB(data: any) {
  await writeJsonFileAtomic(dbPath, data);
}

const toShiftDto = shiftRowToClient;

export async function GET(request: Request) {
  const actor = getSessionUserFromRequest(request);
  if (!actor) return unauthorized();
  if (hasSupabaseEnv()) {
    const supabase = getSupabaseServerClient();
    if (actor.role === "worker") {
      const { data, error } = await supabase.from("shifts").select("*").eq("worker_id", actor.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json((data || []).map((row: Record<string, unknown>) => toShiftDto(row)));
    }
    if (actor.role === "user") {
      const own = await findClientForActor(actor);
      if (!own) return NextResponse.json([]);
      const { data, error } = await supabase.from("shifts").select("*").eq("client_id", own.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json((data || []).map((row: Record<string, unknown>) => toShiftDto(row)));
    }
    const { data, error } = await supabase.from("shifts").select("*");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json((data || []).map((row: Record<string, unknown>) => toShiftDto(row)));
  }
  const shifts = await readDB();
  if (actor.role === "worker") {
    return NextResponse.json(shifts.filter((s: any) => s.workerId === actor.id));
  }
  if (actor.role === "user") {
    const own = await resolveActorClient(actor);
    if (!own) return NextResponse.json([]);
    return NextResponse.json(shifts.filter((s: any) => s.clientId === own.id));
  }
  return NextResponse.json(shifts);
}

export async function POST(request: Request) {
  try {
    const actor = getSessionUserFromRequest(request);
    if (!actor) return unauthorized();
    if (!hasRole(actor, ['admin', 'super_admin', 'user'])) return forbidden();
    const newShift = await request.json();
    if (hasSupabaseEnv()) {
      const supabase = getSupabaseServerClient();
      const payload = {
        id: await nextTableId("S", "shifts"),
        job_id: newShift.jobId || null,
        client_id: newShift.clientId || null,
        client_name: newShift.clientName || null,
        venue_id: newShift.venueId || null,
        venue_name: newShift.venueName,
        role: newShift.role,
        date: newShift.date || null,
        scheduled_start: newShift.scheduledStart || null,
        scheduled_end: newShift.scheduledEnd || null,
        hours: Number.isFinite(newShift.hours) ? newShift.hours : null,
        rate: Number.isFinite(newShift.rate) ? newShift.rate : null,
        status: newShift.status || "Upcoming",
        worker_id: newShift.workerId || null,
        worker_name: newShift.workerName || null,
        actual_check_in: newShift.actualCheckIn || null,
        actual_check_out: newShift.actualCheckOut || null,
        gps_status: newShift.gpsStatus || null,
        is_flagged: Boolean(newShift.isFlagged),
        flag_reason: newShift.flagReason || null,
        timesheet_id: newShift.timesheetId || null,
        payment_status: newShift.paymentStatus || "pending",
        invoice_status: newShift.invoiceStatus || "pending",
        is_approved: Boolean(newShift.isApproved),
        is_invoiced: Boolean(newShift.isInvoiced),
        invoice_id: newShift.invoiceId || null,
        created_at: new Date().toISOString(),
      };
      const { data, error } = await supabase.from("shifts").insert(payload).select("*").single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await recordLog('CREATE_SHIFT', `Created new shift: ${payload.role} at ${payload.venue_name}`, actor.email, actor.id);
      return NextResponse.json(toShiftDto(data));
    }

    if (typeof newShift?.role !== "string" || typeof newShift?.venueName !== "string") {
      return NextResponse.json({ error: "Missing required shift fields" }, { status: 400 });
    }
    const shifts = await readDB();
    const nextShift = {
      ...newShift,
      id: generateId('S', shifts.map((s: any) => String(s.id || ""))),
      status: newShift.status || "Upcoming",
      timesheetId: newShift.timesheetId || null,
      paymentStatus: newShift.paymentStatus || "pending",
      invoiceStatus: newShift.invoiceStatus || "pending",
      isApproved: Boolean(newShift.isApproved),
      isInvoiced: Boolean(newShift.isInvoiced),
    };
    await withFileLock(dbPath, async () => {
      const latestShifts = await readDB();
      latestShifts.unshift(nextShift);
      await writeDB(latestShifts);
    });
    await recordLog('CREATE_SHIFT', `Created new shift: ${nextShift.role} at ${nextShift.venueName}`, actor.email, actor.id);
    return NextResponse.json(nextShift);
  } catch {
    return NextResponse.json({ error: "Failed to create shift" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const actor = getSessionUserFromRequest(request);
    if (!actor) return unauthorized();
    const updatedShift = await request.json();
    if (!updatedShift?.id) return NextResponse.json({ error: "Missing shift ID" }, { status: 400 });
    if (hasSupabaseEnv()) {
      const supabase = getSupabaseServerClient();
      const { data: existingRows, error: existingError } = await supabase.from("shifts").select("*").eq("id", updatedShift.id).limit(1);
      if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
      const existing = existingRows?.[0];
      if (!existing) return NextResponse.json({ error: "Shift not found" }, { status: 404 });
      const patch = {
        job_id: updatedShift.jobId,
        client_id: updatedShift.clientId,
        client_name: updatedShift.clientName,
        venue_id: updatedShift.venueId,
        venue_name: updatedShift.venueName,
        role: updatedShift.role,
        date: updatedShift.date,
        scheduled_start: updatedShift.scheduledStart,
        scheduled_end: updatedShift.scheduledEnd,
        hours: updatedShift.hours,
        rate: updatedShift.rate,
        status: updatedShift.status,
        worker_id: updatedShift.workerId,
        worker_name: updatedShift.workerName,
        actual_check_in: updatedShift.actualCheckIn,
        actual_check_out: updatedShift.actualCheckOut,
        gps_status: updatedShift.gpsStatus,
        is_flagged: updatedShift.isFlagged,
        flag_reason: updatedShift.flagReason,
        timesheet_id: updatedShift.timesheetId,
        payment_status: updatedShift.paymentStatus,
        invoice_status: updatedShift.invoiceStatus,
        is_approved: updatedShift.isApproved,
        is_invoiced: updatedShift.isInvoiced,
        invoice_id: updatedShift.invoiceId,
      };
      const { data, error } = await supabase.from("shifts").update(patch).eq("id", updatedShift.id).select("*").single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (updatedShift.status === "Cancelled") {
        await recordLog('CANCEL_SHIFT', `Cancelled shift ${updatedShift.id}`, actor.email, actor.id);
      } else if (updatedShift.isApproved) {
        await recordLog('APPROVE_SHIFT', `Approved hours for shift ${updatedShift.id}`, actor.email, actor.id);
      } else {
        await recordLog('UPDATE_SHIFT', `Updated shift details for ${updatedShift.id}`, actor.email, actor.id);
      }
      return NextResponse.json(toShiftDto(data));
    }
    const shifts = await readDB();
    
    const index = shifts.findIndex((s: any) => s.id === updatedShift.id);
    if (index === -1) return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    
    shifts[index] = { ...shifts[index], ...updatedShift, id: shifts[index].id };
    await withFileLock(dbPath, async () => {
      const latest = await readDB();
      const latestIndex = latest.findIndex((s: any) => s.id === updatedShift.id);
      if (latestIndex !== -1) {
        latest[latestIndex] = shifts[index];
        await writeDB(latest);
      }
    });
    
    if (updatedShift.status === "Cancelled") {
      await recordLog('CANCEL_SHIFT', `Cancelled shift ${updatedShift.id}`, actor.email, actor.id);
    } else if (updatedShift.isApproved) {
      await recordLog('APPROVE_SHIFT', `Approved hours for shift ${updatedShift.id}`, actor.email, actor.id);
    } else {
      await recordLog('UPDATE_SHIFT', `Updated shift details for ${updatedShift.id}`, actor.email, actor.id);
    }
    
    return NextResponse.json(shifts[index]);
  } catch {
    return NextResponse.json({ error: "Failed to update shift" }, { status: 500 });
  }
}
