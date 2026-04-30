import { NextResponse, NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';
import fs from 'fs/promises';
import path from 'path';
import { recordLog } from '@/lib/audit';

const dbPath = path.join(process.cwd(), 'users.json');

async function readDB() {
  try {
    const data = await fs.readFile(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { users: [] };
  }
}

async function writeDB(data: any) {
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2));
}

export async function GET() {
  const db = await readDB();
  // Strip passwords before sending to frontend
  const safeUsers = db.users.map(({ password, ...user }: any) => user);
  return NextResponse.json(safeUsers);
}

export async function POST(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    const db = await readDB();
    
    const actingUser = db.users.find((u: any) => u.id === userId);
    if (!actingUser || actingUser.role !== 'super_admin') {
      return NextResponse.json({ error: "Unauthorized: Only Super Admins can manage users" }, { status: 403 });
    }

    const newUser = await request.json();
    
    // Check if email exists
    if (db.users.find((u: any) => u.email === newUser.email)) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }

    newUser.id = `U-${Math.floor(Math.random() * 100000)}`;
    newUser.createdAt = new Date().toISOString();
    
    db.users.push(newUser);
    await writeDB(db);
    
    // Audit log
    const userEmail = request.headers.get('x-user-email') || 'system';
    await recordLog('CREATE_USER', `Created portal user: ${newUser.name} (${newUser.role})`, userEmail, userId || 'system');
    
    const { password, ...safeUser } = newUser;
    return NextResponse.json(safeUser);
  } catch (error) {
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const db = await readDB();

    const actingUser = db.users.find((u: any) => u.id === userId);
    if (!actingUser || actingUser.role !== 'super_admin') {
      return NextResponse.json({ error: "Unauthorized: Only Super Admins can delete users" }, { status: 403 });
    }

    // Prevent deleting the very last super_admin or oneself ideally, but for now just prevent general deletion fails
    const userToDelete = db.users.find((u: any) => u.id === id);
    if (!userToDelete) return NextResponse.json({ error: "User not found" }, { status: 404 });
    
    const superAdmins = db.users.filter((u: any) => u.role === "super_admin");
    if (userToDelete.role === "super_admin" && superAdmins.length <= 1) {
      return NextResponse.json({ error: "Cannot delete the last Super Admin" }, { status: 400 });
    }

    db.users = db.users.filter((c: any) => c.id !== id);
    await writeDB(db);

    // Audit log
    const userEmail = request.headers.get('x-user-email') || 'system';
    await recordLog('DELETE_USER', `Deleted portal user: ${userToDelete.name} (${userToDelete.email})`, userEmail, userId || 'system');

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
