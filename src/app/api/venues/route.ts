import { NextResponse, NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';
import fs from 'fs/promises';
import path from 'path';
import { recordLog } from '@/lib/audit';
import { forbidden, getSessionUserFromRequest, hasRole, unauthorized } from '@/lib/auth';
import { generateId, readJsonFile, withFileLock, writeJsonFileAtomic } from '@/lib/json-db';

const dbPath = path.join(process.cwd(), 'venues.json');
const clientsPath = path.join(process.cwd(), 'clients.json');

async function readDB() {
  return readJsonFile<any[]>(dbPath, []);
}

async function writeDB(data: any) {
  await writeJsonFileAtomic(dbPath, data);
}

export async function GET(request: Request) {
  const actor = getSessionUserFromRequest(request);
  if (!actor) return unauthorized();
  if (!hasRole(actor, ['admin', 'super_admin', 'user'])) return forbidden();
  const venues = await readDB();
  return NextResponse.json(venues);
}

export async function POST(request: Request) {
  try {
    const actor = getSessionUserFromRequest(request);
    if (!actor) return unauthorized();
    if (!hasRole(actor, ['admin', 'super_admin', 'user'])) return forbidden();
    const body = await request.json();
    if (typeof body?.name !== "string" || typeof body?.clientId !== "string") {
      return NextResponse.json({ error: "Missing required venue fields" }, { status: 400 });
    }

    const newVenue = {
      ...body,
      id: generateId('V'),
      status: body.status || "Active",
    };

    await withFileLock(dbPath, async () => {
      const venues = await readDB();
      venues.push(newVenue);
      await writeDB(venues);
    });

    await withFileLock(clientsPath, async () => {
      const clientsData = await readJsonFile<any[]>(clientsPath, []);
      const cIndex = clientsData.findIndex((c: any) => c.id === newVenue.clientId);
      if (cIndex !== -1) {
        clientsData[cIndex].venueCount = (clientsData[cIndex].venueCount || 0) + 1;
        await writeJsonFileAtomic(clientsPath, clientsData);
      }
    });

    await recordLog('CREATE_VENUE', `Created new venue: ${newVenue.name}`, actor.email, actor.id);
    return NextResponse.json(newVenue);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create venue" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const actor = getSessionUserFromRequest(request);
    if (!actor) return unauthorized();
    if (!hasRole(actor, ['admin', 'super_admin', 'user'])) return forbidden();
    const updatedVenue = await request.json();
    if (!updatedVenue?.id) return NextResponse.json({ error: "Missing venue ID" }, { status: 400 });
    let venues = await readDB();
    
    const index = venues.findIndex((v: any) => v.id === updatedVenue.id);
    if (index === -1) return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    
    const allowed = ["name","address","status","clientId","contactName","phone","notes"];
    const patch: Record<string, any> = {};
    for (const key of allowed) if (updatedVenue[key] !== undefined) patch[key] = updatedVenue[key];
    const next = { ...venues[index], ...patch, id: venues[index].id };
    await withFileLock(dbPath, async () => {
      const latest = await readDB();
      const latestIndex = latest.findIndex((v: any) => v.id === updatedVenue.id);
      if (latestIndex !== -1) {
        latest[latestIndex] = next;
        await writeDB(latest);
      }
    });
    await recordLog('UPDATE_VENUE', `Updated venue details: ${next.name}`, actor.email, actor.id);
    
    return NextResponse.json(next);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update venue" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const actor = getSessionUserFromRequest(request);
    if (!actor) return unauthorized();
    if (!hasRole(actor, ['admin', 'super_admin'])) return forbidden("Only admins can delete venues");
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    const venues = await readDB();
    const venueToDelete = venues.find((v: any) => v.id === id);
    if (!venueToDelete) return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    await withFileLock(dbPath, async () => {
      const latest = await readDB();
      await writeDB(latest.filter((v: any) => v.id !== id));
    });

    await recordLog('DELETE_VENUE', `Deleted venue: ${venueToDelete?.name || id}`, actor.email, actor.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete venue" }, { status: 500 });
  }
}
