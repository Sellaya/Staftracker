import { NextResponse, NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';
import fs from 'fs/promises';
import path from 'path';
import { recordLog } from '@/lib/audit';
import { forbidden, getSessionUserFromRequest, hasRole, unauthorized } from '@/lib/auth';
import { generateId, readJsonFile, withFileLock, writeJsonFileAtomic } from '@/lib/json-db';

const dbPath = path.join(process.cwd(), 'clients.json');

const readDB = () => readJsonFile<any[]>(dbPath, []);
const writeDB = (data: any[]) => writeJsonFileAtomic(dbPath, data);

export async function GET(request: Request) {
  const actor = getSessionUserFromRequest(request);
  if (!actor) return unauthorized();
  if (!hasRole(actor, ['admin', 'super_admin', 'user'])) return forbidden();
  const clients = await readDB();
  return NextResponse.json(clients);
}

export async function POST(request: Request) {
  const actor = getSessionUserFromRequest(request);
  if (!actor) return unauthorized();
  if (!hasRole(actor, ['admin', 'super_admin', 'user'])) return forbidden();
  const body = await request.json();
  if (typeof body?.name !== 'string' || typeof body?.contactName !== 'string' || typeof body?.email !== 'string') {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const newClient = {
    id: generateId('C'),
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
    const clients = await readDB();
    clients.push(newClient);
    await writeDB(clients);
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
    const clients = await readDB();
    
    const index = clients.findIndex((c: any) => c.id === updatedClient.id);
    if (index === -1) return NextResponse.json({ error: "Client not found" }, { status: 404 });
    
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
  } catch (error) {
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
  }
}
