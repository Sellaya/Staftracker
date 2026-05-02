import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import path from "path";
import { forbidden, getSessionUserFromRequest, hasRole, unauthorized } from "@/lib/auth";
import { jobRowToClientJob } from "@/lib/job-client-dto";
import { applicantsFromDbColumn } from "@/lib/jobs-shared";
import { readJsonFile, withFileLock, writeJsonFileAtomic } from "@/lib/json-db";
import { getSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase";

const jobsPath = path.join(process.cwd(), "jobs.json");

export async function POST(request: Request) {
  try {
    const actor = getSessionUserFromRequest(request);
    if (!actor) return unauthorized();
    if (!hasRole(actor, ["worker"])) return forbidden("Only workers can withdraw applications");

    const body = await request.json();
    const jobId = String(body?.jobId || "");
    if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 });

    if (hasSupabaseEnv()) {
      const supabase = getSupabaseServerClient();
      const { data: row, error } = await supabase.from("jobs").select("*").eq("id", jobId).maybeSingle();
      if (error || !row) return NextResponse.json({ error: "Job not found" }, { status: 404 });
      const job = row as Record<string, unknown>;
      const apps = applicantsFromDbColumn(job.applicants);
      const i = apps.findIndex((a) => a.id === actor.id && a.status === "pending_admin");
      if (i === -1) {
        return NextResponse.json({ error: "No pending application to withdraw" }, { status: 400 });
      }
      const next = apps.map((a, k) => (k === i ? { ...a, status: "withdrawn" as const } : a));
      const { data: updated, error: upErr } = await supabase
        .from("jobs")
        .update({ applicants: next })
        .eq("id", jobId)
        .select("*")
        .single();
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
      return NextResponse.json(jobRowToClientJob(updated as Record<string, unknown>));
    }

    let out: NextResponse | null = null;

    await withFileLock(jobsPath, async () => {
      const jobs = await readJsonFile<any[]>(jobsPath, []);
      const idx = jobs.findIndex((j: any) => j.id === jobId);
      if (idx === -1) {
        out = NextResponse.json({ error: "Job not found" }, { status: 404 });
        return;
      }
      const job = { ...jobs[idx] };
      const apps = applicantsFromDbColumn(job.applicants);
      const i = apps.findIndex((a) => a.id === actor.id && a.status === "pending_admin");
      if (i === -1) {
        out = NextResponse.json({ error: "No pending application to withdraw" }, { status: 400 });
        return;
      }
      const next = apps.map((a, k) => (k === i ? { ...a, status: "withdrawn" as const } : a));
      job.applicants = next;
      jobs[idx] = job;
      await writeJsonFileAtomic(jobsPath, jobs);
      out = NextResponse.json(jobRowToClientJob(job as Record<string, unknown>));
    });

    return out ?? NextResponse.json({ error: "Withdraw failed" }, { status: 500 });
  } catch {
    return NextResponse.json({ error: "Withdraw failed" }, { status: 500 });
  }
}
