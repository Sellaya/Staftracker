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
    
    return NextResponse.json(userWithoutPassword, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
