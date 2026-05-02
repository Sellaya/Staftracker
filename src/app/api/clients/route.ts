import { NextResponse, NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';
import path from 'path';
import { recordLog } from '@/lib/audit';
import { forbidden, getSessionUserFromRequest, hasRole, unauthorized } from '@/lib/auth';
import { generateId, readJsonFile, withFileLock, writeJsonFileAtomic } from '@/lib/json-db';
import { getSupabaseServerClient, hasSupabaseEnv } from '@/lib/supabase';
import { findClientForActor, nextTableId } from '@/lib/supabase-db';

const dbPath = path.join(process.cwd(), 'clients.json');

const readDB = () => readJsonFile<any[]>(dbPath, []);
const writeDB = (data: any[]) => writeJsonFileAtomic(dbPath, data);

function toClientDto(row: Record<string, unknown>) {
  return {
    ...row,
    contactName: row.contact_name ?? row.contactName ?? "",
    paymentMethod: row.payment_method ?? row.paymentMethod ?? "",
    taxId: row.tax_id ?? row.taxId ?? "",
    customRates: row.custom_rates ?? row.customRates ?? [],
    preferredWorkers: row.preferred_workers ?? row.preferredWorkers ?? [],
    venueCount: row.venue_count ?? row.venueCount ?? 0,
    billingEmail: row.billing_email ?? row.billingEmail ?? "",
    venueType: row.venue_type ?? row.venueType ?? "",
    staffingRoles: row.staffing_roles ?? row.staffingRoles ?? [],
    staffingFrequency: row.staffing_frequency ?? row.staffingFrequency ?? "",
    createdByUserId: row.created_by_user_id ?? row.createdByUserId ?? null,
    createdAt: row.created_at ?? row.createdAt ?? null,
  };
}

async function resolveActorClient(actor: { id: string; email: string }) {
  const clients = await readDB();
  return clients.find((c: any) => c.createdByUserId === actor.id || c.email?.toLowerCase() === actor.email.toLowerCase()) || null;
}

export async function GET(request: Request) {
  const actor = getSessionUserFromRequest(request);
  if (!actor) return unauthorized();
  if (!hasRole(actor, ['admin', 'super_admin', 'user'])) return forbidden();
  if (hasSupabaseEnv()) {
    const supabase = getSupabaseServerClient();
    if (actor.role === "user") {
      const own = await findClientForActor(actor);
      return NextResponse.json(own ? [toClientDto(own)] : []);
    }
    const { data, error } = await supabase.from("clients").select("*");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json((data || []).map((row: Record<string, unknown>) => toClientDto(row)));
  }
  const clients = await readDB();
  if (actor.role === "user") {
    const own = clients.find((c: any) => c.createdByUserId === actor.id || c.email?.toLowerCase() === actor.email.toLowerCase());
    return NextResponse.json(own ? [own] : []);
  }
  return NextResponse.json(clients);
}

export async function POST(request: Request) {
  const actor = getSessionUserFromRequest(request);
  if (!actor) return unauthorized();
  if (!hasRole(actor, ['admin', 'super_admin', 'user'])) return forbidden();
  if (actor.role === "user") return forbidden("Client accounts are created through signup flow");
  const body = await request.json();
  if (typeof body?.name !== 'string' || typeof body?.contactName !== 'string' || typeof body?.email !== 'string') {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (hasSupabaseEnv()) {
    const supabase = getSupabaseServerClient();
    const id = await nextTableId("C", "clients");
    const newClient = {
      id,
      name: body.name.trim(),
      contact_name: body.contactName.trim(),
      email: body.email.toLowerCase().trim(),
      phone: String(body.phone || '').trim(),
      status: ["Active", "Suspended", "Pending Payment"].includes(body.status) ? body.status : "Active",
      payment_method: String(body.paymentMethod || "Credit Card"),
      address: String(body.address || ""),
      industry: String(body.industry || ""),
      tax_id: String(body.taxId || ""),
      notes: String(body.notes || ""),
      custom_rates: Array.isArray(body.customRates) ? body.customRates : [],
      preferred_workers: Array.isArray(body.preferredWorkers) ? body.preferredWorkers : [],
      invoices: Array.isArray(body.invoices) ? body.invoices : [],
      venue_count: Number.isFinite(body.venueCount) ? body.venueCount : 0,
      created_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from("clients").insert(newClient).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await recordLog('CREATE_CLIENT', `Created new client: ${newClient.name}`, actor.email, actor.id);
    return NextResponse.json(toClientDto(data));
  }

  const clients = await readDB();
  const newClient = {
    id: generateId('C', clients.map((c: any) => String(c.id || ""))),
    name: body.name.trim(),
    contactName: body.contactName.trim(),
    email: body.email.toLowerCase().trim(),
    phone: String(body.phone || '').trim(),
    status: ["Active", "Suspended", "Pending Payment"].includes(body.status) ? body.status : "Active",
    paymentMethod: String(body.paymentMethod || "Credit Card"),
    address: String(body.address || ""),
    industry: String(body.industry || ""),
    taxId: String(body.taxId || ""),
    notes: String(body.notes || ""),
    customRates: Array.isArray(body.customRates) ? body.customRates : [],
    preferredWorkers: Array.isArray(body.preferredWorkers) ? body.preferredWorkers : [],
    invoices: Array.isArray(body.invoices) ? body.invoices : [],
    venueCount: Number.isFinite(body.venueCount) ? body.venueCount : 0,
  };

  await withFileLock(dbPath, async () => {
    const latestClients = await readDB();
    latestClients.push(newClient);
    await writeDB(latestClients);
  });

  await recordLog('CREATE_CLIENT', `Created new client: ${newClient.name}`, actor.email, actor.id);
  return NextResponse.json(newClient);
}

export async function DELETE(request: NextRequest) {
  const actor = getSessionUserFromRequest(request);
  if (!actor) return unauthorized();
  if (!hasRole(actor, ['admin', 'super_admin'])) return forbidden("Only admins can delete clients");
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

  if (hasSupabaseEnv()) {
    const supabase = getSupabaseServerClient();
    const { data: existing, error: findError } = await supabase.from("clients").select("*").eq("id", id).limit(1);
    if (findError) return NextResponse.json({ error: findError.message }, { status: 500 });
    const clientToDelete = existing?.[0];
    if (!clientToDelete) return NextResponse.json({ error: "Client not found" }, { status: 404 });
    const { error: deleteError } = await supabase.from("clients").delete().eq("id", id);
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
    await recordLog('DELETE_CLIENT', `Deleted client: ${clientToDelete?.name || id}`, actor.email, actor.id);
    return NextResponse.json({ success: true });
  }
  const clients = await readDB();
  const clientToDelete = clients.find((c: any) => c.id === id);
  if (!clientToDelete) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  await withFileLock(dbPath, async () => {
    const latest = await readDB();
    await writeDB(latest.filter((c: any) => c.id !== id));
  });
  await recordLog('DELETE_CLIENT', `Deleted client: ${clientToDelete?.name || id}`, actor.email, actor.id);

  return NextResponse.json({ success: true });
}
export async function PUT(request: Request) {
  try {
    const actor = getSessionUserFromRequest(request);
    if (!actor) return unauthorized();
    if (!hasRole(actor, ['admin', 'super_admin', 'user'])) return forbidden();
    const updatedClient = await request.json();
    if (!updatedClient?.id) return NextResponse.json({ error: "Missing client ID" }, { status: 400 });
    if (hasSupabaseEnv()) {
      const supabase = getSupabaseServerClient();
      const { data: existingRows, error: existingError } = await supabase.from("clients").select("*").eq("id", updatedClient.id).limit(1);
      if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
      const existing = existingRows?.[0];
      if (!existing) return NextResponse.json({ error: "Client not found" }, { status: 404 });
      if (actor.role === "user") {
        const own = await findClientForActor(actor);
        if (!own || own.id !== updatedClient.id) return forbidden("You can only update your own client account");
      }

      const allowed = ["name","contactName","email","phone","status","paymentMethod","address","industry","taxId","notes","customRates","preferredWorkers","invoices","venueCount"];
      const patch: Record<string, unknown> = {};
      for (const key of allowed) {
        if (updatedClient[key] !== undefined) patch[key] = updatedClient[key];
      }
      const mappedPatch = {
        name: patch.name,
        contact_name: patch.contactName,
        email: patch.email,
        phone: patch.phone,
        status: patch.status,
        payment_method: patch.paymentMethod,
        address: patch.address,
        industry: patch.industry,
        tax_id: patch.taxId,
        notes: patch.notes,
        custom_rates: patch.customRates,
        preferred_workers: patch.preferredWorkers,
        invoices: patch.invoices,
        venue_count: patch.venueCount,
      };
      const { data, error } = await supabase.from("clients").update(mappedPatch).eq("id", updatedClient.id).select("*").single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await recordLog('UPDATE_CLIENT', `Updated client details for ${data.name}`, actor.email, actor.id);
      return NextResponse.json(toClientDto(data));
    }

    const clients = await readDB();
    
    const index = clients.findIndex((c: any) => c.id === updatedClient.id);
    if (index === -1) return NextResponse.json({ error: "Client not found" }, { status: 404 });
    if (actor.role === "user") {
      const own = await resolveActorClient(actor);
      if (!own || own.id !== updatedClient.id) return forbidden("You can only update your own client account");
    }
    
    const allowed = ["name","contactName","email","phone","status","paymentMethod","address","industry","taxId","notes","customRates","preferredWorkers","invoices","venueCount"];
    const sanitizedPatch: Record<string, any> = {};
    for (const key of allowed) if (updatedClient[key] !== undefined) sanitizedPatch[key] = updatedClient[key];
    const next = { ...clients[index], ...sanitizedPatch, id: clients[index].id };

    await withFileLock(dbPath, async () => {
      const latest = await readDB();
      const latestIndex = latest.findIndex((c: any) => c.id === updatedClient.id);
      if (latestIndex !== -1) {
        latest[latestIndex] = next;
        await writeDB(latest);
      }
    });

    await recordLog('UPDATE_CLIENT', `Updated client details for ${next.name}`, actor.email, actor.id);
    
    return NextResponse.json(next);
  } catch {
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
  }
}
