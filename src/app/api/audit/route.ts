import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import fs from 'fs/promises';
import path from 'path';
import { forbidden, getSessionUserFromRequest, hasRole, unauthorized } from '@/lib/auth';

const logPath = path.join(process.cwd(), 'audit_logs.json');

export async function GET(request: Request) {
  const actor = getSessionUserFromRequest(request);
  if (!actor) return unauthorized();
  if (!hasRole(actor, ['admin', 'super_admin'])) return forbidden();
  try {
    const data = await fs.readFile(logPath, 'utf8');
    const db = JSON.parse(data);
    return NextResponse.json(db.logs);
  } catch (error) {
    return NextResponse.json({ logs: [] });
  }
}
