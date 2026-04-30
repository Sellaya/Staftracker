import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const dbPath = path.join(process.cwd(), 'users.json');

async function readDB() {
  try {
    const data = await fs.readFile(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { users: [] };
  }
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    const db = await readDB();
    
    const user = db.users.find((u: any) => u.email === email && u.password === password);
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Don't send password back
    const { password: _, ...userWithoutPassword } = user;
    
    const response = NextResponse.json(userWithoutPassword, { status: 200 });
    
    // Set cookie for middleware
    response.cookies.set('user', JSON.stringify(userWithoutPassword), {
      httpOnly: false, // In a real app, use true and HTTPS
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
