import { NextResponse } from "next/server";
import path from "path";
import { forbidden, getSessionUserFromRequest, hasRole, unauthorized } from "@/lib/auth";
import { readJsonFile, withFileLock, writeJsonFileAtomic } from "@/lib/json-db";
import { getSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase";
import { appWorkerPatchToDb, workerDbRowToApp } from "@/lib/worker-supabase";

export const dynamic = "force-dynamic";

const workersPath = path.join(process.cwd(), "workers.json");

async function readWorkers() {
  return readJsonFile<any[]>(workersPath, []);
}

function normalizeDocument(doc: any) {
  const fileData = typeof doc?.fileData === "string" && doc.fileData.startsWith("data:")
    ? doc.fileData
    : undefined;
  return {
    id: String(doc?.id || `DOC-${Date.now()}`),
    type: String(doc?.type || "").trim(),
    fileName: String(doc?.fileName || "").trim(),
    fileType: String(doc?.fileType || "").trim(),
    fileSize: Number.isFinite(Number(doc?.fileSize)) ? Number(doc.fileSize) : 0,
    ...(fileData ? { fileData } : {}),
    uploadedAt: new Date(doc?.uploadedAt || Date.now()).toISOString(),
    status: "Pending" as const,
  };
}

function sanitizeDocuments(documents: any[]): any[] {
  const normalized = documents
    .map(normalizeDocument)
    .filter((d) => d.type.length > 0 && d.fileName.length > 0);
  return normalized.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

export async function GET(request: Request) {
  const actor = getSessionUserFromRequest(request);
  if (!actor) return unauthorized();
  if (!hasRole(actor, ["worker"])) return forbidden("Worker access only");

  if (hasSupabaseEnv()) {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.from("workers").select("*").eq("id", actor.id).maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Worker profile not found" }, { status: 404 });
    return NextResponse.json(workerDbRowToApp(data as Record<string, unknown>));
  }

  const workers = await readWorkers();
  const worker = workers.find((w: any) => w.id === actor.id);
  if (!worker) return NextResponse.json({ error: "Worker profile not found" }, { status: 404 });
  return NextResponse.json(worker);
}

export async function PUT(request: Request) {
  const actor = getSessionUserFromRequest(request);
  if (!actor) return unauthorized();
  if (!hasRole(actor, ["worker"])) return forbidden("Worker access only");

  try {
    const body = await request.json();
    const allowed = ["firstName", "lastName", "phone", "address", "bio", "linkedin", "postalCode", "neighborhoods", "documents"];

    const patch: Record<string, any> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) patch[key] = body[key];
    }

    if (patch.postalCode !== undefined) {
      patch.postalCode = String(patch.postalCode).trim().toUpperCase().slice(0, 7);
    }
    if (patch.neighborhoods !== undefined) {
      patch.neighborhoods = Array.isArray(patch.neighborhoods)
        ? patch.neighborhoods.map((n: any) => String(n).trim()).filter(Boolean)
        : [];
    }
    if (patch.documents !== undefined) {
      if (!Array.isArray(patch.documents)) {
        return NextResponse.json({ error: "Documents must be an array" }, { status: 400 });
      }
      patch.documents = sanitizeDocuments(patch.documents);
      patch.documentStatus = "Pending";
    }

    if (hasSupabaseEnv()) {
      const supabase = getSupabaseServerClient();
      const { data: row, error: fetchErr } = await supabase.from("workers").select("*").eq("id", actor.id).maybeSingle();
      if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
      if (!row) return NextResponse.json({ error: "Worker profile not found" }, { status: 404 });

      const dbPatch = appWorkerPatchToDb(patch as Record<string, unknown>);
      if (patch.documents !== undefined) {
        dbPatch.documents = patch.documents;
        dbPatch.document_status = "Pending";
      }

      const { data: updated, error: upErr } = await supabase
        .from("workers")
        .update(dbPatch)
        .eq("id", actor.id)
        .select("*")
        .single();
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
      return NextResponse.json(workerDbRowToApp(updated as Record<string, unknown>));
    }

    const workers = await readWorkers();
    const index = workers.findIndex((w: any) => w.id === actor.id);
    if (index === -1) return NextResponse.json({ error: "Worker profile not found" }, { status: 404 });

    const nextWorker = { ...workers[index], ...patch, id: workers[index].id };
    await withFileLock(workersPath, async () => {
      const latest = await readWorkers();
      const latestIndex = latest.findIndex((w: any) => w.id === actor.id);
      if (latestIndex !== -1) {
        latest[latestIndex] = nextWorker;
        await writeJsonFileAtomic(workersPath, latest);
      }
    });

    return NextResponse.json(nextWorker);
  } catch {
    return NextResponse.json({ error: "Failed to update worker profile" }, { status: 500 });
  }
}
