import { NextResponse, NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';
import path from 'path';
import { recordLog } from '@/lib/audit';
import { forbidden, getSessionUserFromRequest, hasRole, unauthorized } from '@/lib/auth';
import { generateId, readJsonFile, withFileLock, writeJsonFileAtomic } from '@/lib/json-db';

const dbPath = path.join(process.cwd(), 'shifts.json');

async function readDB() {
  return readJsonFile<any[]>(dbPath, []);
}

async function writeDB(data: any) {
  await writeJsonFileAtomic(dbPath, data);
}

export async function GET(request: Request) {
  const actor = getSessionUserFromRequest(request);
  if (!actor) return unauthorized();
  const shifts = await readDB();
  return NextResponse.json(shifts);
}

export async function POST(request: Request) {
  try {
    const actor = getSessionUserFromRequest(request);
    if (!actor) return unauthorized();
    if (!hasRole(actor, ['admin', 'super_admin', 'user'])) return forbidden();
    const newShift = await request.json();
    if (typeof newShift?.role !== "string" || typeof newShift?.venueName !== "string") {
      return NextResponse.json({ error: "Missing required shift fields" }, { status: 400 });
    }
    const nextShift = { ...newShift, id: generateId('S') };
    await withFileLock(dbPath, async () => {
      const shifts = await readDB();
      shifts.unshift(nextShift);
      await writeDB(shifts);
    });
    await recordLog('CREATE_SHIFT', `Created new shift: ${nextShift.role} at ${nextShift.venueName}`, actor.email, actor.id);
    return NextResponse.json(nextShift);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create shift" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const actor = getSessionUserFromRequest(request);
    if (!actor) return unauthorized();
    const updatedShift = await request.json();
    if (!updatedShift?.id) return NextResponse.json({ error: "Missing shift ID" }, { status: 400 });
    let shifts = await readDB();
    
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
  } catch (error) {
    return NextResponse.json({ error: "Failed to update shift" }, { status: 500 });
  }
}
