import { NextResponse } from "next/server";
import { recordLog } from "@/lib/audit";
import { jobRowToClientJob } from "@/lib/job-client-dto";
import {
  APPLICANT_AUTO_REJECT_REASON,
  applicantsAfterUnassign,
  applicantsFromDbColumn,
  type JobApplicant,
} from "@/lib/jobs-shared";
import { getSupabaseServerClient } from "@/lib/supabase";
import { nextTableId } from "@/lib/supabase-db";
import { workerMayAccessOpenMarketplace } from "@/lib/worker-marketplace";

type AssignmentAction = "confirm_applicant" | "admin_direct_assign" | "reject_applicant" | "unassign";

export type AssignmentBody = {
  jobId: string;
  workerId: string;
  action: AssignmentAction;
  rejectReason: string;
  workerNameBody: string;
};

type SessionActor = { email: string; id: string };

async function readWorkerName(supabase: ReturnType<typeof getSupabaseServerClient>, workerId: string) {
  const { data } = await supabase.from("workers").select("name").eq("id", workerId).maybeSingle();
  return String((data as { name?: string } | null)?.name || "");
}

export async function assignmentPostSupabase(body: AssignmentBody, actor: SessionActor): Promise<NextResponse> {
  const supabase = getSupabaseServerClient();
  const { jobId, workerId, action, rejectReason, workerNameBody } = body;

  const { data: row, error: fetchErr } = await supabase.from("jobs").select("*").eq("id", jobId).maybeSingle();
  if (fetchErr || !row) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  const job = row as Record<string, unknown>;

  if (action === "reject_applicant") {
    const apps = applicantsFromDbColumn(job.applicants);
    const target = apps.find((a) => a.id === workerId);
    if (!target) return NextResponse.json({ error: "Applicant not found" }, { status: 404 });
    if (target.status === "rejected") {
      return NextResponse.json(jobRowToClientJob(job));
    }
    if (target.status !== "pending_admin") {
      return NextResponse.json({ error: "Only pending applications can be rejected" }, { status: 400 });
    }
    const next = apps.map((a) =>
      a.id === workerId
        ? { ...a, status: "rejected" as const, rejectionReason: rejectReason || "Not selected for this shift" }
        : a
    );
    const { data: updated, error } = await supabase
      .from("jobs")
      .update({ applicants: next })
      .eq("id", jobId)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await recordLog("REJECT_APPLICANT", `Rejected applicant ${workerId} for job ${jobId}`, actor.email, actor.id);
    return NextResponse.json(jobRowToClientJob(updated as Record<string, unknown>));
  }

  if (action === "unassign") {
    const status = String(job.status ?? "");
    const aw = job.assigned_worker_id ?? job.assignedWorkerId;
    if (status !== "Filled" || !aw) {
      return NextResponse.json({ error: "Job is not in a filled state" }, { status: 400 });
    }
    const wid = String(aw);
    const reopened = applicantsAfterUnassign(applicantsFromDbColumn(job.applicants), wid);
    const { data: updated, error } = await supabase
      .from("jobs")
      .update({
        assigned_worker_id: null,
        assigned_worker_name: null,
        status: "Open",
        applicants: reopened,
      })
      .eq("id", jobId)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await recordLog("UNASSIGN_JOB", `Unassigned worker from job ${jobId}`, actor.email, actor.id);

    await supabase
      .from("shifts")
      .update({ status: "Cancelled" })
      .eq("job_id", jobId)
      .eq("worker_id", wid)
      .in("status", ["Upcoming", "Active"]);

    return NextResponse.json(jobRowToClientJob(updated as Record<string, unknown>));
  }

  if (String(job.status ?? "") !== "Open") {
    return NextResponse.json({ error: "Job is not open for assignment" }, { status: 400 });
  }
  if (job.assigned_worker_id || job.assignedWorkerId) {
    return NextResponse.json({ error: "Job already has an assignee" }, { status: 400 });
  }

  const workerName =
    workerNameBody || (await readWorkerName(supabase, workerId)) || "Worker";

  if (action === "confirm_applicant") {
    const apps = applicantsFromDbColumn(job.applicants);
    const self = apps.find((a) => a.id === workerId);
    if (!self || self.status !== "pending_admin") {
      return NextResponse.json({ error: "Worker has no pending application for this job" }, { status: 400 });
    }
  }

  const cleared = await workerMayAccessOpenMarketplace(workerId);
  if (!cleared) {
    return NextResponse.json({ error: "Worker must be active with approved documents" }, { status: 400 });
  }

  const apps = applicantsFromDbColumn(job.applicants);
  const nextApps: JobApplicant[] = apps.map((a) => {
    if (a.id === workerId) {
      return { ...a, status: "confirmed", name: workerName || a.name };
    }
    if (a.status === "pending_admin") {
      return {
        ...a,
        status: "rejected",
        rejectionReason: APPLICANT_AUTO_REJECT_REASON,
      };
    }
    return a;
  });
  if (!nextApps.some((a) => a.id === workerId)) {
    nextApps.unshift({
      id: workerId,
      name: workerName,
      reliability: 100,
      appliedAt: new Date().toISOString(),
      status: "confirmed",
    });
  }

  const { data: updated, error } = await supabase
    .from("jobs")
    .update({
      applicants: nextApps,
      assigned_worker_id: workerId,
      assigned_worker_name: workerName,
      status: "Filled",
    })
    .eq("id", jobId)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await recordLog("ASSIGN_JOB", `Confirmed ${workerName} (${workerId}) for job ${jobId}`, actor.email, actor.id);

  const { data: dupRows } = await supabase
    .from("shifts")
    .select("id")
    .eq("job_id", jobId)
    .eq("worker_id", workerId)
    .neq("status", "Cancelled");
  if (!dupRows?.length) {
    const shiftId = await nextTableId("S", "shifts");
    const rate = Number(job.rate ?? job.hourly_rate ?? job.hourlyRate ?? 0);
    const { error: insErr } = await supabase.from("shifts").insert({
      id: shiftId,
      job_id: jobId,
      client_id: job.client_id ?? job.clientId ?? null,
      client_name: job.client_name ?? job.clientName ?? null,
      venue_id: job.venue_id ?? job.venueId ?? null,
      venue_name: job.venue_name ?? job.venueName ?? "",
      role: job.role,
      date: job.date,
      scheduled_start: job.start_time ?? job.startTime ?? null,
      scheduled_end: job.end_time ?? job.endTime ?? null,
      hours: job.hours,
      rate,
      status: "Upcoming",
      worker_id: workerId,
      worker_name: workerName,
      is_flagged: false,
      is_approved: false,
      is_invoiced: false,
      payment_status: "pending",
      invoice_status: "pending",
      timesheet_id: null,
      created_at: new Date().toISOString(),
    });
    if (insErr) {
      await recordLog(
        "ASSIGN_SHIFT_FAIL",
        `Shift insert failed for job ${jobId}: ${insErr.message}`,
        actor.email,
        actor.id
      );
    }
  }

  return NextResponse.json(jobRowToClientJob(updated as Record<string, unknown>));
}
