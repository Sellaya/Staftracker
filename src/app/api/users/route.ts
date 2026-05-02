import { NextResponse, NextRequest } from "next/server";
export const dynamic = "force-dynamic";
import { recordLog } from "@/lib/audit";
import {
  forbidden,
  getSessionUserFromRequest,
  hashPassword,
  hasRole,
  readUsersDb,
  sanitizeUser,
  unauthorized,
  writeUsersDb,
} from "@/lib/auth";
import { generateId, withFileLock } from "@/lib/json-db";
import { getSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase";
import { nextTableId } from "@/lib/supabase-db";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(request: Request) {
  const actor = getSessionUserFromRequest(request);
  if (!actor) return unauthorized();
  if (!hasRole(actor, ["admin", "super_admin"])) return forbidden();

  if (hasSupabaseEnv()) {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.from("users").select("id, name, email, role, created_at");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const safe = (data || []).map((u: Record<string, unknown>) =>
      sanitizeUser({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
      })
    );
    return NextResponse.json(safe);
  }

  const db = await readUsersDb();
  const safeUsers = db.users.map((user: any) => sanitizeUser(user));
  return NextResponse.json(safeUsers);
}

export async function POST(request: Request) {
  try {
    const actor = getSessionUserFromRequest(request);
    if (!actor) return unauthorized();
    if (!hasRole(actor, ["admin", "super_admin"])) return forbidden("Only admins can manage users");

    const newUser = await request.json();
    if (typeof newUser?.name !== "string" || typeof newUser?.email !== "string" || typeof newUser?.password !== "string") {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!EMAIL_REGEX.test(newUser.email)) return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    const role = ["admin", "super_admin", "user", "worker"].includes(newUser.role) ? newUser.role : "user";

    const emailLower = newUser.email.toLowerCase().trim();
    const now = new Date().toISOString();

    if (hasSupabaseEnv()) {
      const supabase = getSupabaseServerClient();
      const { data: dup } = await supabase.from("users").select("id").ilike("email", emailLower).limit(1);
      if (dup && dup.length > 0) return NextResponse.json({ error: "Email already exists" }, { status: 400 });

      const id = await nextTableId("U", "users");
      const { error } = await supabase.from("users").insert({
        id,
        name: newUser.name.trim(),
        email: emailLower,
        password: hashPassword(newUser.password),
        role,
        created_at: now,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      await recordLog("CREATE_USER", `Created portal user: ${newUser.name.trim()} (${role})`, actor.email, actor.id);
      return NextResponse.json(sanitizeUser({ id, name: newUser.name.trim(), email: emailLower, role }));
    }

    const db = await readUsersDb();
    if (db.users.find((u: any) => u.email?.toLowerCase() === emailLower)) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }

    const createdUser = {
      id: generateId("U", db.users.map((u: any) => String(u.id || ""))),
      name: newUser.name.trim(),
      email: emailLower,
      role,
      createdAt: now,
      password: hashPassword(newUser.password),
    };

    await withFileLock("users", async () => {
      const fresh = await readUsersDb();
      fresh.users.push(createdUser);
      await writeUsersDb(fresh);
    });

    await recordLog("CREATE_USER", `Created portal user: ${createdUser.name} (${createdUser.role})`, actor.email, actor.id);

    return NextResponse.json(sanitizeUser(createdUser));
  } catch {
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const actor = getSessionUserFromRequest(request);
    if (!actor) return unauthorized();
    if (!hasRole(actor, ["admin", "super_admin"])) return forbidden("Only admins can delete users");

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    if (hasSupabaseEnv()) {
      const supabase = getSupabaseServerClient();
      const { data: rows } = await supabase.from("users").select("id, role, email, name").eq("id", id).limit(1);
      const userToDelete = rows?.[0] as { role?: string; email?: string; name?: string } | undefined;
      if (!userToDelete) return NextResponse.json({ error: "User not found" }, { status: 404 });

      const { data: superRows } = await supabase.from("users").select("id").eq("role", "super_admin");
      const superAdmins = superRows || [];
      if (userToDelete.role === "super_admin" && superAdmins.length <= 1) {
        return NextResponse.json({ error: "Cannot delete the last Super Admin" }, { status: 400 });
      }

      const { error } = await supabase.from("users").delete().eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      await recordLog("DELETE_USER", `Deleted portal user: ${userToDelete.name} (${userToDelete.email})`, actor.email, actor.id);
      return NextResponse.json({ success: true });
    }

    const db = await readUsersDb();
    const userToDelete = db.users.find((u: any) => u.id === id);
    if (!userToDelete) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const superAdmins = db.users.filter((u: any) => u.role === "super_admin");
    if (userToDelete.role === "super_admin" && superAdmins.length <= 1) {
      return NextResponse.json({ error: "Cannot delete the last Super Admin" }, { status: 400 });
    }

    db.users = db.users.filter((c: any) => c.id !== id);
    await writeUsersDb(db);

    await recordLog("DELETE_USER", `Deleted portal user: ${userToDelete.name} (${userToDelete.email})`, actor.email, actor.id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
