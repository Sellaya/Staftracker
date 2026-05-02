import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import path from "path";
import { forbidden, getSessionUserFromRequest, hasRole, unauthorized } from "@/lib/auth";
import { applicantsFromDbColumn } from "@/lib/jobs-shared";
import { readJsonFile, withFileLock, writeJsonFileAtomic } from "@/lib/json-db";
import { getSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase";
import { workerMayAccessOpenMarketplace } from "@/lib/worker-marketplace";

const jobsPath = path.join(process.cwd(), "jobs.json");

export async function POST(request: Request) {
  try {
    const actor = getSessionUserFromRequest(request);
    if (!actor) return unauthorized();
    if (!hasRole(actor, ["worker"])) return forbidden("Only workers can apply for jobs");
    const cleared = await workerMayAccessOpenMarketplace(actor.id);
    if (!cleared) {
      return forbidden("Your account must be active and documents approved before you can apply.");
    }
    const { jobId, workerId, workerName } = await request.json();
    if (typeof jobId !== "string") return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
    if (workerId && workerId !== actor.id) return forbidden("Worker identity mismatch");

    if (hasSupabaseEnv()) {
      const supabase = getSupabaseServerClient();
      const { data: row, error } = await supabase.from("jobs").select("*").eq("id", jobId).maybeSingle();
      if (error || !row) return NextResponse.json({ error: "Job not found" }, { status: 404 });
      const job = row as Record<string, unknown>;
      if (String(job.status ?? "") !== "Open") {
        return NextResponse.json({ error: "This shift is not accepting applications" }, { status: 400 });
      }
      if (job.assigned_worker_id || job.assignedWorkerId) {
        return NextResponse.json({ error: "This shift is already staffed" }, { status: 400 });
      }
      const apps = applicantsFromDbColumn(job.applicants);
      const existing = apps.find((a) => a.id === actor.id);
      if (existing?.status === "pending_admin") {
        return NextResponse.json({ message: "Already applied", pending: true }, { status: 200 });
      }
      if (existing?.status === "confirmed") {
        return NextResponse.json({ error: "You are already confirmed on this job" }, { status: 400 });
      }
      const nextApps = [
        ...apps.filter((a) => a.id !== actor.id),
        {
          id: actor.id,
          name: workerName || actor.name,
          reliability: 100,
          appliedAt: new Date().toISOString(),
          status: "pending_admin" as const,
        },
      ];
      const { error: upErr } = await supabase.from("jobs").update({ applicants: nextApps }).eq("id", jobId);
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
      return NextResponse.json({ success: true, pending: true });
    }

    let result: NextResponse | null = null;

    await withFileLock(jobsPath, async () => {
      const jobs = await readJsonFile<any[]>(jobsPath, []);
      const index = jobs.findIndex((j: any) => j.id === jobId);
      if (index === -1) {
        result = NextResponse.json({ error: "Job not found" }, { status: 404 });
        return;
      }
      const job = jobs[index];
      if (job.status !== "Open") {
        result = NextResponse.json({ error: "This shift is not accepting applications" }, { status: 400 });
        return;
      }
      if (job.assignedWorkerId) {
        result = NextResponse.json({ error: "This shift is already staffed" }, { status: 400 });
        return;
      }

      const apps = applicantsFromDbColumn(job.applicants);
      const existing = apps.find((a) => a.id === actor.id);
      if (existing?.status === "pending_admin") {
        result = NextResponse.json({ message: "Already applied", pending: true }, { status: 200 });
        return;
      }
      if (existing?.status === "confirmed") {
        result = NextResponse.json({ error: "You are already confirmed on this job" }, { status: 400 });
        return;
      }

      const nextApps = [
        ...apps.filter((a) => a.id !== actor.id),
        {
          id: actor.id,
          name: workerName || actor.name,
          reliability: 100,
          appliedAt: new Date().toISOString(),
          status: "pending_admin" as const,
        },
      ];

      jobs[index] = { ...job, applicants: nextApps };
      await writeJsonFileAtomic(jobsPath, jobs);
      result = NextResponse.json({ success: true, pending: true });
    });

    return result ?? NextResponse.json({ error: "Failed to apply" }, { status: 500 });
  } catch {
    return NextResponse.json({ error: "Failed to apply" }, { status: 500 });
  }
}
