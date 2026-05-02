import { NextResponse } from "next/server";
import path from "path";
import { forbidden, getSessionUserFromRequest, hasRole, unauthorized } from "@/lib/auth";
import { readJsonFile } from "@/lib/json-db";
import { getSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase";
import { findClientForActor } from "@/lib/supabase-db";
import { timesheetRowToClient } from "@/lib/timesheet-dto";

export const dynamic = "force-dynamic";

const timesheetsPath = path.join(process.cwd(), "timesheets.json");
const clientsPath = path.join(process.cwd(), "clients.json");

async function resolveActorClient(actor: { id: string; email: string }) {
  const clients = await readJsonFile<any[]>(clientsPath, []);
  return (
    clients.find(
      (c: any) => c.createdByUserId === actor.id || c.email?.toLowerCase() === actor.email.toLowerCase(),
    ) || null
  );
}

export async function GET(request: Request) {
  const actor = getSessionUserFromRequest(request);
  if (!actor) return unauthorized();

  if (hasSupabaseEnv()) {
    const supabase = getSupabaseServerClient();

    if (hasRole(actor, ["admin", "super_admin"])) {
      const { data, error } = await supabase.from("timesheets").select("*").order("updated_at", { ascending: false });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json((data || []).map((row) => timesheetRowToClient(row as Record<string, unknown>)));
    }
    if (hasRole(actor, ["user"])) {
      const own = await findClientForActor(actor);
      if (!own) return NextResponse.json([]);
      const { data, error } = await supabase
        .from("timesheets")
        .select("*")
        .eq("client_id", own.id)
        .order("updated_at", { ascending: false });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json((data || []).map((row) => timesheetRowToClient(row as Record<string, unknown>)));
    }
    if (hasRole(actor, ["worker"])) {
      const { data, error } = await supabase
        .from("timesheets")
        .select("*")
        .eq("worker_id", actor.id)
        .order("updated_at", { ascending: false });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json((data || []).map((row) => timesheetRowToClient(row as Record<string, unknown>)));
    }
    return forbidden();
  }

  const timesheets = await readJsonFile<any[]>(timesheetsPath, []);
  if (hasRole(actor, ["admin", "super_admin"])) {
    return NextResponse.json(timesheets);
  }
  if (hasRole(actor, ["user"])) {
    const own = await resolveActorClient(actor);
    if (!own) return NextResponse.json([]);
    return NextResponse.json(timesheets.filter((t: any) => t.clientId === own.id));
  }
  if (hasRole(actor, ["worker"])) {
    return NextResponse.json(timesheets.filter((t: any) => t.workerId === actor.id));
  }
  return forbidden();
}
