import { NextResponse, NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';
import path from 'path';
import { recordLog } from '@/lib/audit';
import { forbidden, getSessionUserFromRequest, hasRole, unauthorized } from '@/lib/auth';
import { generateWorkerId, readJsonFile, withFileLock, writeJsonFileAtomic } from '@/lib/json-db';

const dbPath = path.join(process.cwd(), 'workers.json');

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
  const workers = await readDB();
  return NextResponse.json(workers);
}

export async function POST(request: Request) {
  try {
    const actor = getSessionUserFromRequest(request);
    if (!actor) return unauthorized();
    if (!hasRole(actor, ['admin', 'super_admin', 'user'])) return forbidden();
    const body = await request.json();
    if (typeof body?.name !== "string" || typeof body?.email !== "string") {
      return NextResponse.json({ error: "Missing required worker fields" }, { status: 400 });
    }
    const workers = await readDB();
    const newWorker = {
      ...body,
      id: generateWorkerId(workers.map((w: any) => String(w.id || ""))),
      status: body.status || "Active",
      documentStatus: body.documentStatus || "Pending",
      reliability: Number.isFinite(body.reliability) ? body.reliability : 100,
      flags: Array.isArray(body.flags) ? body.flags : [],
      notes: Array.isArray(body.notes) ? body.notes : [],
      shiftHistory: Array.isArray(body.shiftHistory) ? body.shiftHistory : [],
      lifetimeEarnings: body.lifetimeEarnings || "$0.00",
      roleOverrides: Array.isArray(body.roleOverrides) ? body.roleOverrides : [],
    };
    await withFileLock(dbPath, async () => {
      const workers = await readDB();
      workers.push(newWorker);
      await writeDB(workers);
    });

    await recordLog('CREATE_WORKER', `Created new worker: ${newWorker.name}`, actor.email, actor.id);
    return NextResponse.json(newWorker);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create worker" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const actor = getSessionUserFromRequest(request);
    if (!actor) return unauthorized();
    if (!hasRole(actor, ['admin', 'super_admin'])) return forbidden("Only admins can delete workers");
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    const workers = await readDB();
    const workerToDelete = workers.find((w: any) => w.id === id);
    if (!workerToDelete) return NextResponse.json({ error: "Worker not found" }, { status: 404 });
    await withFileLock(dbPath, async () => {
      const latest = await readDB();
      await writeDB(latest.filter((w: any) => w.id !== id));
    });
    await recordLog('DELETE_WORKER', `Deleted worker: ${workerToDelete?.name || id}`, actor.email, actor.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete worker" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const actor = getSessionUserFromRequest(request);
    if (!actor) return unauthorized();
    if (!hasRole(actor, ['admin', 'super_admin', 'user', 'worker'])) return forbidden();
    const updatedWorker = await request.json();
    if (!updatedWorker?.id) return NextResponse.json({ error: "Missing worker ID" }, { status: 400 });
    const workers = await readDB();
    const index = workers.findIndex((w: any) => w.id === updatedWorker.id);
    
    if (index === -1) return NextResponse.json({ error: "Worker not found" }, { status: 404 });

    const isCompanyUser = hasRole(actor, ['admin', 'super_admin', 'user']);
    if (!isCompanyUser && actor.id !== updatedWorker.id) {
      return forbidden("Workers can only update their own profile");
    }

    const allowed = isCompanyUser
      ? ["name","email","phone","status","documentStatus","reliability","flags","notes","shiftHistory","lifetimeEarnings","roleOverrides","firstName","lastName","address","bio","linkedin","postalCode","neighborhoods","legalStatus","yearsExperience","smartServeHas","smartServeNumber","foodHandlerHas","foodHandlerNumber"]
      : ["firstName","lastName","phone","address","bio","linkedin","postalCode","neighborhoods"];
    const patch: Record<string, any> = {};
    for (const key of allowed) if (updatedWorker[key] !== undefined) patch[key] = updatedWorker[key];
    const next = { ...workers[index], ...patch, id: workers[index].id };
    await withFileLock(dbPath, async () => {
      const latest = await readDB();
      const latestIndex = latest.findIndex((w: any) => w.id === updatedWorker.id);
      if (latestIndex !== -1) {
        latest[latestIndex] = next;
        await writeDB(latest);
      }
    });
    await recordLog('UPDATE_WORKER', `Updated worker details: ${next.name}`, actor.email, actor.id);
    
    return NextResponse.json(next);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update worker" }, { status: 500 });
  }
}
