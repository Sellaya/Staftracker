import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import fs from 'fs/promises';
import path from 'path';

const logPath = path.join(process.cwd(), 'audit_logs.json');

export async function GET() {
  try {
    const data = await fs.readFile(logPath, 'utf8');
    const db = JSON.parse(data);
    return NextResponse.json(db.logs);
  } catch (error) {
    return NextResponse.json({ logs: [] });
  }
}
