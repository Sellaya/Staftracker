import { NextResponse, NextRequest } from "next/server";
export const dynamic = "force-dynamic";
import path from "path";
import { recordLog } from "@/lib/audit";
import { forbidden, getSessionUserFromRequest, hasRole, unauthorized } from "@/lib/auth";
import { generateWorkerId, readJsonFile, withFileLock, writeJsonFileAtomic } from "@/lib/json-db";
import { getSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase";
import {
  computeAggregateDocumentStatus,
  workerDbRowToApp,
  workerFileShapeToDb,
} from "@/lib/worker-supabase";
import { nextTableId } from "@/lib/supabase-db";

const dbPath = path.join(process.cwd(), "workers.json");

async function readDB() {
  return readJsonFile<any[]>(dbPath, []);
}

async function writeDB(data: any) {
  await writeJsonFileAtomic(dbPath, data);
}

export async function GET(request: Request) {
  const actor = getSessionUserFromRequest(request);
  if (!actor) return unauthorized();
  if (!hasRole(actor, ["admin", "super_admin"])) {
    return forbidden("Only admins can list workers");
  }
  if (hasSupabaseEnv()) {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.from("workers").select("*");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json((data || []).map((row: Record<string, unknown>) => workerDbRowToApp(row)));
  }
  const workers = await readDB();
  return NextResponse.json(workers);
}

export async function POST(request: Request) {
  try {
    const actor = getSessionUserFromRequest(request);
    if (!actor) return unauthorized();
    if (!hasRole(actor, ["admin", "super_admin"])) {
      return forbidden("Only admins can create worker records");
    }
    const body = await request.json();
    if (typeof body?.name !== "string" || typeof body?.email !== "string") {
      return NextResponse.json({ error: "Missing required worker fields" }, { status: 400 });
    }

    const now = new Date().toISOString();
    let newId: string;
    if (hasSupabaseEnv()) {
      newId = await nextTableId("W", "workers");
    } else {
      const workers = await readDB();
      newId = generateWorkerId(workers.map((w: any) => String(w.id || "")));
    }
    const newWorker = {
      ...body,
      id: newId,
      status: body.status || "Active",
      documentStatus: body.documentStatus || "Pending",
      reliability: Number.isFinite(body.reliability) ? body.reliability : 100,
      flags: Array.isArray(body.flags) ? body.flags : [],
      notes: Array.isArray(body.notes) ? body.notes : [],
      shiftHistory: Array.isArray(body.shiftHistory) ? body.shiftHistory : [],
      lifetimeEarnings: body.lifetimeEarnings || "$0.00",
      roleOverrides: Array.isArray(body.roleOverrides) ? body.roleOverrides : [],
      createdAt: body.createdAt || now,
    };

    if (hasSupabaseEnv()) {
      const supabase = getSupabaseServerClient();
      const payload = workerFileShapeToDb(newWorker as Record<string, unknown>);
      const { error } = await supabase.from("workers").insert(payload);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await recordLog("CREATE_WORKER", `Created new worker: ${newWorker.name}`, actor.email, actor.id);
      return NextResponse.json(newWorker);
    }

    await withFileLock(dbPath, async () => {
      const list = await readDB();
      list.push(newWorker);
      await writeDB(list);
    });

    await recordLog("CREATE_WORKER", `Created new worker: ${newWorker.name}`, actor.email, actor.id);
    return NextResponse.json(newWorker);
  } catch {
    return NextResponse.json({ error: "Failed to create worker" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const actor = getSessionUserFromRequest(request);
    if (!actor) return unauthorized();
    if (!hasRole(actor, ["admin", "super_admin"])) return forbidden("Only admins can delete workers");
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    if (hasSupabaseEnv()) {
      const supabase = getSupabaseServerClient();
      const { data: row } = await supabase.from("workers").select("name").eq("id", id).maybeSingle();
      const { error } = await supabase.from("workers").delete().eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await supabase.from("users").delete().eq("id", id);
      await recordLog("DELETE_WORKER", `Deleted worker: ${(row as { name?: string })?.name || id}`, actor.email, actor.id);
      return NextResponse.json({ success: true });
    }

    const workers = await readDB();
    const workerToDelete = workers.find((w: any) => w.id === id);
    if (!workerToDelete) return NextResponse.json({ error: "Worker not found" }, { status: 404 });
    await withFileLock(dbPath, async () => {
      const latest = await readDB();
      await writeDB(latest.filter((w: any) => w.id !== id));
    });
    await recordLog("DELETE_WORKER", `Deleted worker: ${workerToDelete?.name || id}`, actor.email, actor.id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete worker" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const actor = getSessionUserFromRequest(request);
    if (!actor) return unauthorized();
    if (!hasRole(actor, ["admin", "super_admin", "worker"])) return forbidden();
    const updatedWorker = await request.json();
    if (!updatedWorker?.id) return NextResponse.json({ error: "Missing worker ID" }, { status: 400 });

    const isAdmin = hasRole(actor, ["admin", "super_admin"]);
    if (!isAdmin && actor.id !== updatedWorker.id) {
      return forbidden("Workers can only update their own profile");
    }

    const adminAllowed = [
      "name",
      "email",
      "phone",
      "status",
      "documentStatus",
      "reliability",
      "flags",
      "notes",
      "shiftHistory",
      "lifetimeEarnings",
      "roleOverrides",
      "roles",
      "documents",
      "firstName",
      "lastName",
      "address",
      "bio",
      "linkedin",
      "postalCode",
      "neighborhoods",
      "legalStatus",
      "yearsExperience",
      "smartServeHas",
      "smartServeNumber",
      "foodHandlerHas",
      "foodHandlerNumber",
    ];
    const workerAllowed = ["firstName", "lastName", "phone", "address", "bio", "linkedin", "postalCode", "neighborhoods"];
    const allowed = isAdmin ? adminAllowed : workerAllowed;
    const patch: Record<string, any> = {};
    for (const key of allowed) if (updatedWorker[key] !== undefined) patch[key] = updatedWorker[key];

    if (hasSupabaseEnv()) {
      const supabase = getSupabaseServerClient();
      const { data: row, error: fetchErr } = await supabase.from("workers").select("*").eq("id", updatedWorker.id).maybeSingle();
      if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
      if (!row) return NextResponse.json({ error: "Worker not found" }, { status: 404 });

      const prev = workerDbRowToApp(row as Record<string, unknown>);
      let next: Record<string, unknown> = { ...prev, ...patch, id: prev.id };
      if (isAdmin && patch.documents !== undefined) {
        next.documentStatus = computeAggregateDocumentStatus((next.documents as unknown[]) || []);
      }
      if (isAdmin && next.documentStatus === "Approved" && prev.status === "Pending") {
        next = { ...next, status: "Active" };
      }
      if (isAdmin && patch.status === "Active" && next.documentStatus !== "Approved") {
        return NextResponse.json(
          { error: "Cannot mark a worker Active until documents are approved." },
          { status: 400 }
        );
      }

      const updateFields = workerFileShapeToDb(next);
      delete updateFields.id;
      const { data: saved, error: upErr } = await supabase
        .from("workers")
        .update(updateFields)
        .eq("id", updatedWorker.id)
        .select("*")
        .single();
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
      await recordLog("UPDATE_WORKER", `Updated worker details: ${String(next.name)}`, actor.email, actor.id);
      return NextResponse.json(workerDbRowToApp(saved as Record<string, unknown>));
    }

    const workers = await readDB();
    const index = workers.findIndex((w: any) => w.id === updatedWorker.id);
    if (index === -1) return NextResponse.json({ error: "Worker not found" }, { status: 404 });

    let next = { ...workers[index], ...patch, id: workers[index].id };
    if (isAdmin && patch.documents !== undefined) {
      next.documentStatus = computeAggregateDocumentStatus(next.documents || []);
    }
    if (isAdmin && next.documentStatus === "Approved" && workers[index].status === "Pending") {
      next = { ...next, status: "Active" };
    }
    if (isAdmin && patch.status === "Active" && next.documentStatus !== "Approved") {
      return NextResponse.json(
        { error: "Cannot mark a worker Active until documents are approved." },
        { status: 400 }
      );
    }
    await withFileLock(dbPath, async () => {
      const latest = await readDB();
      const latestIndex = latest.findIndex((w: any) => w.id === updatedWorker.id);
      if (latestIndex !== -1) {
        latest[latestIndex] = next;
        await writeDB(latest);
      }
    });
    await recordLog("UPDATE_WORKER", `Updated worker details: ${next.name}`, actor.email, actor.id);

    return NextResponse.json(next);
  } catch {
    return NextResponse.json({ error: "Failed to update worker" }, { status: 500 });
  }
}
