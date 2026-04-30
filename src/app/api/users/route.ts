import { NextResponse, NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';
import { recordLog } from '@/lib/audit';
import { forbidden, getSessionUserFromRequest, hashPassword, hasRole, readUsersDb, sanitizeUser, unauthorized, writeUsersDb } from '@/lib/auth';
import { generateId, withFileLock } from '@/lib/json-db';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(request: Request) {
  const actor = getSessionUserFromRequest(request);
  if (!actor) return unauthorized();
  if (!hasRole(actor, ['admin', 'super_admin'])) return forbidden();

  const db = await readUsersDb();
  // Strip passwords before sending to frontend
  const safeUsers = db.users.map((user: any) => sanitizeUser(user));
  return NextResponse.json(safeUsers);
}

export async function POST(request: Request) {
  try {
    const actor = getSessionUserFromRequest(request);
    if (!actor) return unauthorized();
    if (!hasRole(actor, ['admin', 'super_admin'])) return forbidden("Only admins can manage users");

    const newUser = await request.json();
    if (typeof newUser?.name !== "string" || typeof newUser?.email !== "string" || typeof newUser?.password !== "string") {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!EMAIL_REGEX.test(newUser.email)) return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    const role = ["admin", "super_admin", "user", "worker"].includes(newUser.role) ? newUser.role : "user";

    const db = await readUsersDb();
    // Check if email exists
    if (db.users.find((u: any) => u.email?.toLowerCase() === newUser.email.toLowerCase())) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }

    const createdUser = {
      id: generateId('U'),
      name: newUser.name.trim(),
      email: newUser.email.toLowerCase().trim(),
      role,
      createdAt: new Date().toISOString(),
      password: hashPassword(newUser.password)
    };

    await withFileLock('users', async () => {
      const fresh = await readUsersDb();
      fresh.users.push(createdUser);
      await writeUsersDb(fresh);
    });
    
    await recordLog('CREATE_USER', `Created portal user: ${createdUser.name} (${createdUser.role})`, actor.email, actor.id);
    
    return NextResponse.json(sanitizeUser(createdUser));
  } catch (error) {
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const actor = getSessionUserFromRequest(request);
    if (!actor) return unauthorized();
    if (!hasRole(actor, ['admin', 'super_admin'])) return forbidden("Only admins can delete users");

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const db = await readUsersDb();

    // Prevent deleting the very last super_admin or oneself ideally, but for now just prevent general deletion fails
    const userToDelete = db.users.find((u: any) => u.id === id);
    if (!userToDelete) return NextResponse.json({ error: "User not found" }, { status: 404 });
    
    const superAdmins = db.users.filter((u: any) => u.role === "super_admin");
    if (userToDelete.role === "super_admin" && superAdmins.length <= 1) {
      return NextResponse.json({ error: "Cannot delete the last Super Admin" }, { status: 400 });
    }

    db.users = db.users.filter((c: any) => c.id !== id);
    await writeUsersDb(db);

    await recordLog('DELETE_USER', `Deleted portal user: ${userToDelete.name} (${userToDelete.email})`, actor.email, actor.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
