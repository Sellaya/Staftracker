import { NextResponse, NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';
import fs from 'fs/promises';
import path from 'path';
import { recordLog } from '@/lib/audit';

const dbPath = path.join(process.cwd(), 'workers.json');

async function readDB() {
  try {
    const data = await fs.readFile(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function writeDB(data: any) {
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2));
}

export async function GET() {
  const workers = await readDB();
  return NextResponse.json(workers);
}

export async function POST(request: Request) {
  try {
    const newWorker = await request.json();
    const workers = await readDB();
    
    newWorker.id = `W-${Math.floor(Math.random() * 9000) + 1000}`;
    newWorker.status = newWorker.status || "Active";
    newWorker.documentStatus = newWorker.documentStatus || "Pending";
    newWorker.rating = 5.0;
    newWorker.reliability = 100;
    newWorker.flags = [];
    newWorker.notes = [];
    newWorker.shiftHistory = [];
    newWorker.lifetimeEarnings = "$0.00";
    newWorker.roleOverrides = [];

    workers.push(newWorker);
    await writeDB(workers);
    
    // Audit log
    const userEmail = request.headers.get('x-user-email') || 'system';
    const userId = request.headers.get('x-user-id') || 'system';
    await recordLog('CREATE_WORKER', `Created new worker: ${newWorker.name}`, userEmail, userId);
    
    return NextResponse.json(newWorker);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create worker" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    // Simple RBAC check (Only Super Admin can delete workers)
    const usersPath = path.join(process.cwd(), 'users.json');
    const usersData = JSON.parse(await fs.readFile(usersPath, 'utf8'));
    const actingUser = usersData.users.find((u: any) => u.id === userId);
    
    if (!actingUser || actingUser.role !== 'super_admin') {
      return NextResponse.json({ error: "Unauthorized: Only Super Admins can delete workers" }, { status: 403 });
    }

    let workers = await readDB();
    const workerToDelete = workers.find((w: any) => w.id === id);
    workers = workers.filter((w: any) => w.id !== id);
    await writeDB(workers);

    // Audit log
    const userEmail = request.headers.get('x-user-email') || 'system';
    await recordLog('DELETE_WORKER', `Deleted worker: ${workerToDelete?.name || id}`, userEmail, userId || 'system');

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete worker" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const updatedWorker = await request.json();
    const workers = await readDB();
    const index = workers.findIndex((w: any) => w.id === updatedWorker.id);
    
    if (index === -1) return NextResponse.json({ error: "Worker not found" }, { status: 404 });
    
    workers[index] = { ...workers[index], ...updatedWorker };
    await writeDB(workers);
    
    // Audit log
    const userEmail = request.headers.get('x-user-email') || 'system';
    const userId = request.headers.get('x-user-id') || 'system';
    await recordLog('UPDATE_WORKER', `Updated worker details: ${updatedWorker.name}`, userEmail, userId);
    
    return NextResponse.json(workers[index]);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update worker" }, { status: 500 });
  }
}
