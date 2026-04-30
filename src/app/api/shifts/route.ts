import { NextResponse, NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';
import fs from 'fs/promises';
import path from 'path';
import { recordLog } from '@/lib/audit';

const dbPath = path.join(process.cwd(), 'shifts.json');

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
  const shifts = await readDB();
  return NextResponse.json(shifts);
}

export async function POST(request: Request) {
  try {
    const newShift = await request.json();
    const shifts = await readDB();
    
    newShift.id = `S-${Math.floor(Math.random() * 9000) + 1000}`;
    
    shifts.unshift(newShift);
    await writeDB(shifts);
    
    const userEmail = request.headers.get('x-user-email') || 'system';
    const userId = request.headers.get('x-user-id') || 'system';
    await recordLog('CREATE_SHIFT', `Created new shift: ${newShift.role} at ${newShift.venueName}`, userEmail, userId);
    
    return NextResponse.json(newShift);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create shift" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const updatedShift = await request.json();
    let shifts = await readDB();
    
    const index = shifts.findIndex((s: any) => s.id === updatedShift.id);
    if (index === -1) return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    
    shifts[index] = { ...shifts[index], ...updatedShift };
    await writeDB(shifts);
    
    const userEmail = request.headers.get('x-user-email') || 'system';
    const userId = request.headers.get('x-user-id') || 'system';
    
    if (updatedShift.status === "Cancelled") {
      await recordLog('CANCEL_SHIFT', `Cancelled shift ${updatedShift.id}`, userEmail, userId);
    } else if (updatedShift.isApproved) {
      await recordLog('APPROVE_SHIFT', `Approved hours for shift ${updatedShift.id}`, userEmail, userId);
    } else {
      await recordLog('UPDATE_SHIFT', `Updated shift details for ${updatedShift.id}`, userEmail, userId);
    }
    
    return NextResponse.json(shifts[index]);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update shift" }, { status: 500 });
  }
}
