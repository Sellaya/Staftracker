import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import fs from 'fs/promises';
import path from 'path';
import { forbidden, getSessionUserFromRequest, hasRole, unauthorized } from '@/lib/auth';
import { getSupabaseServerClient, hasSupabaseEnv } from '@/lib/supabase';

const logPath = path.join(process.cwd(), 'audit_logs.json');

function mapAuditRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    action: row.action,
    details: row.details,
    userEmail: row.user_email ?? row.userEmail,
    userId: row.user_id ?? row.userId,
    timestamp: row.timestamp,
  };
}

export async function GET(request: Request) {
  const actor = getSessionUserFromRequest(request);
  if (!actor) return unauthorized();
  if (!hasRole(actor, ['admin', 'super_admin'])) return forbidden();

  if (hasSupabaseEnv()) {
    try {
      const supabase = getSupabaseServerClient();
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1000);
      if (!error && data) {
        return NextResponse.json(data.map((row) => mapAuditRow(row as Record<string, unknown>)));
      }
      console.error('audit_logs read:', error?.message);
    } catch (e) {
      console.error(e);
    }
  }

  try {
    const raw = await fs.readFile(logPath, 'utf8');
    const db = JSON.parse(raw);
    return NextResponse.json(db.logs ?? []);
  } catch {
    return NextResponse.json([]);
  }
}
