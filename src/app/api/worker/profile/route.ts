import { NextResponse } from "next/server";
import path from "path";
import { forbidden, getSessionUserFromRequest, hasRole, unauthorized } from "@/lib/auth";
import { readJsonFile, withFileLock, writeJsonFileAtomic } from "@/lib/json-db";

export const dynamic = "force-dynamic";

const workersPath = path.join(process.cwd(), "workers.json");

async function readWorkers() {
  return readJsonFile<any[]>(workersPath, []);
}

function normalizeDocument(doc: any) {
  return {
    id: String(doc?.id || `DOC-${Date.now()}`),
    type: String(doc?.type || "").trim(),
    fileName: String(doc?.fileName || "").trim(),
    uploadedAt: new Date(doc?.uploadedAt || Date.now()).toISOString(),
    // Worker cannot self-approve/reject. Always Pending on write.
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
    const workers = await readWorkers();
    const index = workers.findIndex((w: any) => w.id === actor.id);
    if (index === -1) return NextResponse.json({ error: "Worker profile not found" }, { status: 404 });

    const allowed = ["firstName", "lastName", "phone", "address", "bio", "linkedin", "postalCode", "neighborhoods", "documents"];
    const patch: Record<string, any> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) patch[key] = body[key];
    }

    if (patch.postalCode !== undefined) {
      patch.postalCode = String(patch.postalCode).trim().toUpperCase().slice(0, 3);
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
