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

async function writeDB(data: any) {
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2));
}

export async function GET() {
  const db = await readDB();
  return NextResponse.json(db.users);
}

export async function POST(request: Request) {
  try {
    const user = await request.json();
    const db = await readDB();
    
    // Simple validation: check if email exists
    const existingUser = db.users.find((u: any) => u.email === user.email);
    if (existingUser) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }

    const newUser = {
      ...user,
      id: "W-" + Math.floor(1000 + Math.random() * 9000).toString(),
      createdAt: new Date().toISOString()
    };
    
    db.users.push(newUser);
    await writeDB(db);
    
    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
