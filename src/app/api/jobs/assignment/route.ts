import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import path from "path";
import { recordLog } from "@/lib/audit";
import { forbidden, getSessionUserFromRequest, hasRole, unauthorized } from "@/lib/auth";
import { jobRowToClientJob } from "@/lib/job-client-dto";
import { generateId, readJsonFile, withFileLock, writeJsonFileAtomic } from "@/lib/json-db";
import { hasSupabaseEnv } from "@/lib/supabase";
import { assignmentPostSupabase, type AssignmentBody } from "@/lib/jobs-assignment-supabase";
import {
  APPLICANT_AUTO_REJECT_REASON,
  applicantsAfterUnassign,
  normalizeApplicants,
  type JobApplicant,
} from "@/lib/jobs-shared";
import { workerMayAccessOpenMarketplace } from "@/lib/worker-marketplace";

const jobsPath = path.join(process.cwd(), "jobs.json");
const shiftsPath = path.join(process.cwd(), "shifts.json");
const workersPath = path.join(process.cwd(), "workers.json");

type AssignmentAction = "confirm_applicant" | "admin_direct_assign" | "reject_applicant" | "unassign";

async function readWorkerNameMap(): Promise<Map<string, string>> {
  const workers = await readJsonFile<any[]>(workersPath, []);
  const map = new Map<string, string>();
  for (const w of workers) map.set(String(w.id), String(w.name || ""));
  return map;
}

export async function POST(request: Request) {
  const actor = getSessionUserFromRequest(request);
  if (!actor) return unauthorized();
  if (!hasRole(actor, ["admin", "super_admin"])) {
    return forbidden("Only admins can manage shift assignments");
  }

  try {
    const body = await request.json();
    const jobId = String(body?.jobId || "");
    const workerId = String(body?.workerId || "");
    const action = String(body?.action || "") as AssignmentAction;
    const rejectReason = body?.rejectReason ? String(body.rejectReason) : "";
    const workerNameBody = String(body?.workerName || "").trim();

    if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
    if (action !== "unassign" && !workerId) {
      return NextResponse.json({ error: "Missing workerId" }, { status: 400 });
    }
    if (!["confirm_applicant", "admin_direct_assign", "reject_applicant", "unassign"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (hasSupabaseEnv()) {
      return assignmentPostSupabase(
        {
          jobId,
          workerId,
          action: action as AssignmentBody["action"],
          rejectReason,
          workerNameBody,
        },
        { email: actor.email, id: actor.id }
      );
    }

    type Err = { status: number; message: string };
    const outcome = { err: null as Err | null };
    let jobOut: Record<string, unknown> | null = null;
    let shouldCreateShift = false;
    let shiftWorkerId = "";
    let shiftWorkerName = "";
    let unassignWorkerId: string | null = null;

    await withFileLock(jobsPath, async () => {
      const jobs = await readJsonFile<any[]>(jobsPath, []);
      const idx = jobs.findIndex((j: any) => j.id === jobId);
      if (idx === -1) {
        outcome.err = { status: 404, message: "Job not found" };
        return;
      }
      const job = { ...jobs[idx] };
      const nameMap = await readWorkerNameMap();

      if (action === "reject_applicant") {
        const apps = normalizeApplicants(job.applicants);
        const ai = apps.findIndex((a) => a.id === workerId);
        if (ai === -1) {
          outcome.err = { status: 404, message: "Applicant not found" };
          return;
        }
        const target = apps[ai];
        if (target.status === "rejected") {
          jobOut = job;
          return;
        }
        if (target.status !== "pending_admin") {
          outcome.err = { status: 400, message: "Only pending applications can be rejected" };
          return;
        }
        const next: JobApplicant[] = apps.map((a, i) =>
          i === ai
            ? { ...a, status: "rejected", rejectionReason: rejectReason || "Not selected for this shift" }
            : a
        );
        job.applicants = next;
        jobs[idx] = job;
        await writeJsonFileAtomic(jobsPath, jobs);
        await recordLog("REJECT_APPLICANT", `Rejected applicant ${workerId} for job ${jobId}`, actor.email, actor.id);
        jobOut = job;
        return;
      }

      if (action === "unassign") {
        if (job.status !== "Filled" || !job.assignedWorkerId) {
          outcome.err = { status: 400, message: "Job is not in a filled state" };
          return;
        }
        const wid = String(job.assignedWorkerId);
        job.assignedWorkerId = null;
        job.assignedWorkerName = null;
        job.status = "Open";
        job.applicants = applicantsAfterUnassign(normalizeApplicants(job.applicants), wid);
        jobs[idx] = job;
        await writeJsonFileAtomic(jobsPath, jobs);
        await recordLog("UNASSIGN_JOB", `Unassigned worker from job ${jobId}`, actor.email, actor.id);
        jobOut = job;
        unassignWorkerId = wid;
        return;
      }

      if (job.status !== "Open") {
        outcome.err = { status: 400, message: "Job is not open for assignment" };
        return;
      }
      if (job.assignedWorkerId) {
        outcome.err = { status: 400, message: "Job already has an assignee" };
        return;
      }

      const workerName =
        workerNameBody || nameMap.get(workerId) || "Worker";

      if (action === "confirm_applicant") {
        const apps = normalizeApplicants(job.applicants);
        const self = apps.find((a) => a.id === workerId);
        if (!self || self.status !== "pending_admin") {
          outcome.err = { status: 400, message: "Worker has no pending application for this job" };
          return;
        }
      }

      const cleared = await workerMayAccessOpenMarketplace(workerId);
      if (!cleared) {
        outcome.err = { status: 400, message: "Worker must be active with approved documents" };
        return;
      }

      const apps = normalizeApplicants(job.applicants);
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

      const updated = {
        ...job,
        applicants: nextApps,
        assignedWorkerId: workerId,
        assignedWorkerName: workerName,
        status: "Filled",
      };
      jobs[idx] = updated;
      await writeJsonFileAtomic(jobsPath, jobs);
      await recordLog(
        "ASSIGN_JOB",
        `Confirmed ${workerName} (${workerId}) for job ${jobId}`,
        actor.email,
        actor.id
      );
      jobOut = updated;
      shouldCreateShift = true;
      shiftWorkerId = workerId;
      shiftWorkerName = workerName;
    });

    if (outcome.err) {
      return NextResponse.json({ error: outcome.err.message }, { status: outcome.err.status });
    }

    if (unassignWorkerId) {
      await withFileLock(shiftsPath, async () => {
        const shifts = await readJsonFile<any[]>(shiftsPath, []);
        const si = shifts.findIndex(
          (s: any) =>
            s.jobId === jobId &&
            s.workerId === unassignWorkerId &&
            (s.status === "Upcoming" || s.status === "Active")
        );
        if (si !== -1) {
          shifts[si] = { ...shifts[si], status: "Cancelled" };
          await writeJsonFileAtomic(shiftsPath, shifts);
        }
      });
    }

    if (shouldCreateShift && jobOut) {
      const filledJob = jobOut as Record<string, any>;
      await withFileLock(shiftsPath, async () => {
        const shifts = await readJsonFile<any[]>(shiftsPath, []);
        const dup = shifts.some(
          (s: any) =>
            s.jobId === jobId && s.workerId === shiftWorkerId && s.status !== "Cancelled"
        );
        if (!dup) {
          const nextShift = {
            jobId: filledJob.id,
            clientId: filledJob.clientId || null,
            clientName: filledJob.clientName || null,
            venueId: filledJob.venueId || null,
            venueName: filledJob.venueName,
            role: filledJob.role,
            date: filledJob.date,
            scheduledStart: filledJob.startTime,
            scheduledEnd: filledJob.endTime,
            hours: filledJob.hours,
            rate: filledJob.hourlyRate,
            status: "Upcoming",
            workerId: shiftWorkerId,
            workerName: shiftWorkerName,
            isFlagged: false,
            isApproved: false,
            isInvoiced: false,
            paymentStatus: "pending",
            invoiceStatus: "pending",
            timesheetId: null,
            id: generateId("S", shifts.map((s: any) => String(s.id || ""))),
          };
          shifts.unshift(nextShift);
          await writeJsonFileAtomic(shiftsPath, shifts);
        }
      });
    }

    if (!jobOut) {
      return NextResponse.json({ error: "Assignment failed" }, { status: 500 });
    }
    return NextResponse.json(jobRowToClientJob(jobOut as Record<string, unknown>));
  } catch {
    return NextResponse.json({ error: "Assignment failed" }, { status: 500 });
  }
}
