import { NextResponse } from 'next/server';
import { createSessionToken, readUsersDb, sanitizeUser, setSessionCookie, verifyPassword, writeUsersDb, hashPassword } from '@/lib/auth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (typeof email !== "string" || typeof password !== "string" || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
    }

    const db = await readUsersDb();
    
    const user = db.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const { valid, needsUpgrade } = verifyPassword(password, String(user.password || ""));
    if (!valid) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

    if (needsUpgrade) {
      user.password = hashPassword(password);
      await writeUsersDb(db);
    }

    const userWithoutPassword = sanitizeUser(user);
    
    const response = NextResponse.json(userWithoutPassword, { status: 200 });
    const token = createSessionToken(userWithoutPassword);
    setSessionCookie(response, token);

    return response;
  } catch (error) {
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
