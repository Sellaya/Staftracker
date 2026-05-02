import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import path from 'path';
import { recordLog } from '@/lib/audit';
import { forbidden, getSessionUserFromRequest, hasRole, unauthorized } from '@/lib/auth';
import { generateId, readJsonFile, withFileLock, writeJsonFileAtomic } from '@/lib/json-db';
import { getSupabaseServerClient, hasSupabaseEnv } from '@/lib/supabase';
import { findClientForActor, nextTableId } from '@/lib/supabase-db';

const clientsPath = path.join(process.cwd(), 'clients.json');

async function resolveActorClient(actor: { id: string; email: string }) {
  const clients = await readJsonFile<any[]>(clientsPath, []);
  return (
    clients.find(
      (c: any) => c.createdByUserId === actor.id || c.email?.toLowerCase() === actor.email.toLowerCase()
    ) || null
  );
}

const invoicePath = path.join(process.cwd(), 'invoices.json');
const shiftPath = path.join(process.cwd(), 'shifts.json');

async function readDB(p: string) {
  return readJsonFile<any[]>(p, []);
}

async function writeInvoices(data: any) {
  await writeJsonFileAtomic(invoicePath, data);
}

function toInvoiceDto(row: Record<string, unknown>) {
  return {
    ...row,
    clientId: row.client_id ?? row.clientId ?? null,
    clientName: row.client_name ?? row.clientName ?? null,
    shiftCount: row.shift_count ?? row.shiftCount ?? 0,
    shiftIds: row.shift_ids ?? row.shiftIds ?? [],
    dueDate: row.due_date ?? row.dueDate ?? null,
    createdAt: row.created_at ?? row.createdAt ?? null,
  };
}

export async function GET(request: Request) {
  const actor = getSessionUserFromRequest(request);
  if (!actor) return unauthorized();
  if (!hasRole(actor, ['admin', 'super_admin', 'user'])) return forbidden();
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');
  if (hasSupabaseEnv()) {
    const supabase = getSupabaseServerClient();
    let query = supabase.from("invoices").select("*");
    if (actor.role === "user") {
      const own = await findClientForActor(actor);
      if (!own) return NextResponse.json([]);
      query = query.eq("client_id", own.id);
    } else if (clientId) {
      query = query.eq("client_id", clientId);
    }
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json((data || []).map((row: Record<string, unknown>) => toInvoiceDto(row)));
  }

  const invoices = await readDB(invoicePath);
  if (actor.role === "user") {
    const own = await resolveActorClient(actor);
    if (!own) return NextResponse.json([]);
    return NextResponse.json(invoices.filter((i: any) => i.clientId === own.id));
  }
  if (clientId) {
    return NextResponse.json(invoices.filter((i: any) => i.clientId === clientId));
  }
  return NextResponse.json(invoices);
}

export async function POST(request: Request) {
  try {
    const actor = getSessionUserFromRequest(request);
    if (!actor) return unauthorized();
    if (!hasRole(actor, ['admin', 'super_admin', 'user'])) return forbidden();
    const { clientId, clientName, shiftIds } = await request.json();
    if (typeof clientId !== "string" || typeof clientName !== "string") {
      return NextResponse.json({ error: "Missing required invoice fields" }, { status: 400 });
    }
    const selectedShiftIds = Array.isArray(shiftIds) ? shiftIds : [];

    if (hasSupabaseEnv()) {
      const supabase = getSupabaseServerClient();
      let shiftsQuery = supabase
        .from("shifts")
        .select("*")
        .eq("client_id", clientId)
        .eq("is_approved", true)
        .neq("is_invoiced", true);
      if (selectedShiftIds.length > 0) shiftsQuery = shiftsQuery.in("id", selectedShiftIds);
      const { data: shiftsToBill, error: shiftsError } = await shiftsQuery;
      if (shiftsError) return NextResponse.json({ error: shiftsError.message }, { status: 500 });
      if (!shiftsToBill || shiftsToBill.length === 0) {
        return NextResponse.json({ error: "No approved unbilled shifts found for this client" }, { status: 400 });
      }
      const amount = shiftsToBill.reduce((acc: number, s: Record<string, unknown>) => {
        const hours = Number(s.hours || 0);
        const rate = Number(s.rate || 25);
        return acc + hours * rate;
      }, 0);
      const invoiceId = await nextTableId("INV", "invoices");
      const newInvoice = {
        id: invoiceId,
        client_id: clientId,
        client_name: clientName,
        amount,
        status: "Pending",
        created_at: new Date().toISOString(),
        shift_count: shiftsToBill.length,
        shift_ids: shiftsToBill.map((s: Record<string, unknown>) => s.id),
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      };
      const { data: createdInvoice, error: invoiceError } = await supabase.from("invoices").insert(newInvoice).select("*").single();
      if (invoiceError) return NextResponse.json({ error: invoiceError.message }, { status: 500 });
      const shiftIdsToUpdate = shiftsToBill.map((s: Record<string, unknown>) => s.id);
      const { error: updateShiftError } = await supabase
        .from("shifts")
        .update({ is_invoiced: true, invoice_id: invoiceId })
        .in("id", shiftIdsToUpdate as string[]);
      if (updateShiftError) return NextResponse.json({ error: updateShiftError.message }, { status: 500 });
      await recordLog('GENERATE_INVOICE', `Generated invoice ${invoiceId} for ${clientName} ($${amount})`, actor.email, actor.id);
      return NextResponse.json(toInvoiceDto(createdInvoice));
    }

    const allShifts = await readDB(shiftPath);
    
    // Filter for shifts that are Approved and NOT already Invoiced
    const shiftsToBill = allShifts.filter((s: any) => 
      s.clientId === clientId && 
      s.isApproved === true && 
      s.isInvoiced !== true &&
      (selectedShiftIds.length === 0 || selectedShiftIds.includes(s.id))
    );
    
    if (shiftsToBill.length === 0) {
      return NextResponse.json({ error: "No approved unbilled shifts found for this client" }, { status: 400 });
    }

    const amount = shiftsToBill.reduce((acc: number, s: any) => acc + (s.hours * (s.rate || 25)), 0);
    const existingInvoices = await readDB(invoicePath);
    
    const newInvoice = {
      id: generateId('INV', existingInvoices.map((inv: any) => String(inv.id || ""))),
      clientId,
      clientName,
      amount,
      status: "Pending",
      createdAt: new Date().toISOString(),
      shiftCount: shiftsToBill.length,
      shiftIds: shiftsToBill.map((s: any) => s.id),
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    };

    // Mark shifts as Invoiced and store the invoice ID
    const updatedShifts = allShifts.map((s: any) => 
      shiftsToBill.some((ts: any) => ts.id === s.id) ? { ...s, isInvoiced: true, invoiceId: newInvoice.id } : s
    );
    await withFileLock(shiftPath, async () => {
      await writeJsonFileAtomic(shiftPath, updatedShifts);
    });

    await withFileLock(invoicePath, async () => {
      const invoices = await readDB(invoicePath);
      invoices.unshift(newInvoice);
      await writeInvoices(invoices);
    });

    await recordLog('GENERATE_INVOICE', `Generated invoice ${newInvoice.id} for ${clientName} ($${amount})`, actor.email, actor.id);

    return NextResponse.json(newInvoice);
  } catch {
    return NextResponse.json({ error: "Failed to generate invoice" }, { status: 500 });
  }
}
