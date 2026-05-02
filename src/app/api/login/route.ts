import { NextResponse } from 'next/server';
import { createSessionToken, readUsersDb, sanitizeUser, setSessionCookie, verifyPassword, writeUsersDb, hashPassword } from '@/lib/auth';
import { getSupabaseServerClient, hasSupabaseEnv } from '@/lib/supabase';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (typeof email !== "string" || typeof password !== "string" || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
    }

    let user: Record<string, unknown> | null = null;
    if (hasSupabaseEnv()) {
      const supabase = getSupabaseServerClient();
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .ilike("email", email.toLowerCase())
        .limit(1);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      user = (data && data[0]) || null;
    } else {
      const db = await readUsersDb();
      user = db.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase()) || null;
      if (user) {
        const { valid, needsUpgrade } = verifyPassword(password, String(user.password || ""));
        if (!valid) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
        if (needsUpgrade) {
          user.password = hashPassword(password);
          await writeUsersDb(db);
        }
      }
    }
    if (!user) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    if (hasSupabaseEnv()) {
      const { valid } = verifyPassword(password, String(user.password || ""));
      if (!valid) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    const userWithoutPassword = sanitizeUser(user);
    
    const response = NextResponse.json(userWithoutPassword, { status: 200 });
    const token = createSessionToken(userWithoutPassword);
    setSessionCookie(response, token);

    return response;
  } catch {
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
