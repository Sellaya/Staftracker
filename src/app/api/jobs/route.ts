import { NextResponse, NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';
import path from 'path';
import { recordLog } from '@/lib/audit';
import { forbidden, getSessionUserFromRequest, hasRole, unauthorized } from '@/lib/auth';
import { generateId, readJsonFile, withFileLock, writeJsonFileAtomic } from '@/lib/json-db';
import { getSupabaseServerClient, hasSupabaseEnv } from '@/lib/supabase';
import { findClientForActor, nextTableId } from '@/lib/supabase-db';
import { workerMayAccessOpenMarketplace } from '@/lib/worker-marketplace';
import { jobRowToClientJob } from '@/lib/job-client-dto';
import { normalizeApplicants } from '@/lib/jobs-shared';

function mapJobsForClient(jobs: any[]) {
  return jobs.map((j) => ({ ...j, applicants: normalizeApplicants(j.applicants) }));
}

const dbPath = path.join(process.cwd(), 'jobs.json');
const clientsPath = path.join(process.cwd(), 'clients.json');
const venuesPath = path.join(process.cwd(), 'venues.json');

async function readDB() {
  return readJsonFile<any[]>(dbPath, []);
}

async function writeDB(data: any) {
  await writeJsonFileAtomic(dbPath, data);
}

async function resolveActorClient(actor: { id: string; email: string }) {
  const clients = await readJsonFile<any[]>(clientsPath, []);
  return clients.find((c: any) => c.createdByUserId === actor.id || c.email?.toLowerCase() === actor.email.toLowerCase()) || null;
}

export async function GET(request: Request) {
  const actor = getSessionUserFromRequest(request);
  if (!actor) return unauthorized();
  if (hasSupabaseEnv()) {
    const supabase = getSupabaseServerClient();
    if (actor.role === "user") {
      const own = await findClientForActor(actor);
      if (!own) return NextResponse.json([]);
      const { data, error } = await supabase.from("jobs").select("*").eq("client_id", own.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json((data || []).map((row: Record<string, unknown>) => jobRowToClientJob(row)));
    }
    if (actor.role === "worker") {
      const ok = await workerMayAccessOpenMarketplace(actor.id);
      if (!ok) return NextResponse.json([]);
      const { data, error } = await supabase.from("jobs").select("*").eq("status", "Open");
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json((data || []).map((row: Record<string, unknown>) => jobRowToClientJob(row)));
    }
    const { data, error } = await supabase.from("jobs").select("*");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json((data || []).map((row: Record<string, unknown>) => jobRowToClientJob(row)));
  }
  const jobs = await readDB();
  if (actor.role === "user") {
    const own = await resolveActorClient(actor);
    if (!own) return NextResponse.json([]);
    return NextResponse.json(mapJobsForClient(jobs.filter((j: any) => j.clientId === own.id)));
  }
  if (actor.role === "worker") {
    const ok = await workerMayAccessOpenMarketplace(actor.id);
    if (!ok) return NextResponse.json([]);
    return NextResponse.json(mapJobsForClient(jobs.filter((j: any) => j.status === "Open")));
  }
  return NextResponse.json(mapJobsForClient(jobs));
}

export async function POST(request: Request) {
  try {
    const actor = getSessionUserFromRequest(request);
    if (!actor) return unauthorized();
    if (!hasRole(actor, ['admin', 'super_admin', 'user'])) return forbidden();
    const newJob = await request.json();
    if (typeof newJob?.role !== "string" || typeof newJob?.venueName !== "string") {
      return NextResponse.json({ error: "Missing required job fields" }, { status: 400 });
    }

    if (hasSupabaseEnv()) {
      const supabase = getSupabaseServerClient();
      let scopedClientId = newJob.clientId;
      let scopedClientName = newJob.clientName;
      if (actor.role === "user") {
        const own = await findClientForActor(actor);
        if (!own) return NextResponse.json({ error: "No client account linked to this user" }, { status: 400 });
        scopedClientId = own.id;
        scopedClientName = own.name;
      }
      if (!scopedClientId) return NextResponse.json({ error: "Missing client context" }, { status: 400 });
      if (newJob.venueId) {
        const { data: venueRows, error: venueError } = await supabase
          .from("venues")
          .select("id, client_id")
          .eq("id", newJob.venueId)
          .limit(1);
        if (venueError) return NextResponse.json({ error: venueError.message }, { status: 500 });
        const venue = venueRows?.[0] as { client_id?: string } | undefined;
        if (!venue || venue.client_id !== scopedClientId) {
          return forbidden("Venue does not belong to your client account");
        }
      }
      const id = newJob.id || await nextTableId("J", "jobs");
      const payload = {
        id,
        client_id: scopedClientId,
        client_name: scopedClientName,
        venue_id: newJob.venueId || null,
        venue_name: newJob.venueName,
        role: newJob.role,
        status: newJob.status || "Open",
        date: newJob.date || null,
        start_time: newJob.startTime || null,
        end_time: newJob.endTime || null,
        hours: Number.isFinite(newJob.hours) ? newJob.hours : null,
        rate: Number.isFinite(newJob.rate) ? newJob.rate : Number.isFinite(newJob.hourlyRate) ? newJob.hourlyRate : null,
        headcount: Number.isFinite(newJob.headcount) ? newJob.headcount : null,
        description: newJob.description || "",
        requirements: newJob.requirements || "",
        assigned_worker_id: newJob.assignedWorkerId || null,
        assigned_worker_name: newJob.assignedWorkerName || null,
        applicants: Array.isArray(newJob.applicants) ? newJob.applicants : [],
        created_at: new Date().toISOString(),
        is_urgent: Boolean(newJob.isUrgent ?? newJob.is_urgent),
        instructions: String(newJob.instructions ?? ""),
        uniform: String(newJob.uniform ?? ""),
        parking: String(newJob.parking ?? ""),
      };
      const { data, error } = await supabase.from("jobs").insert(payload).select("*").single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await recordLog('CREATE_JOB', `Created new job: ${payload.role} at ${payload.venue_name}`, actor.email, actor.id);
      return NextResponse.json(jobRowToClientJob(data as Record<string, unknown>));
    }

    let scopedClientId = newJob.clientId;
    let scopedClientName = newJob.clientName;
    if (actor.role === "user") {
      const own = await resolveActorClient(actor);
      if (!own) return NextResponse.json({ error: "No client account linked to this user" }, { status: 400 });
      scopedClientId = own.id;
      scopedClientName = own.name;
    }
    if (!scopedClientId) return NextResponse.json({ error: "Missing client context" }, { status: 400 });

    const venues = await readJsonFile<any[]>(venuesPath, []);
    const venue = venues.find((v: any) => v.id === newJob.venueId || v.name === newJob.venueName);
    if (venue && venue.clientId !== scopedClientId) {
      return forbidden("Venue does not belong to your client account");
    }

    let nextJob: any = null;
    await withFileLock(dbPath, async () => {
      const jobs = await readDB();
      nextJob = {
      ...newJob,
      id: newJob.id || generateId('J', jobs.map((j: any) => String(j.id || ""))),
      clientId: scopedClientId,
      clientName: scopedClientName,
      venueId: newJob.venueId ?? null,
      headcount: Number.isFinite(Number(newJob.headcount)) ? Number(newJob.headcount) : 1,
      applicants: Array.isArray(newJob.applicants) ? normalizeApplicants(newJob.applicants) : [],
      };
      jobs.unshift(nextJob);
      await writeDB(jobs);
    });
    if (!nextJob) return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
    await recordLog('CREATE_JOB', `Created new job: ${nextJob.role} at ${nextJob.venueName}`, actor.email, actor.id);

    return NextResponse.json(nextJob);
  } catch {
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const actor = getSessionUserFromRequest(request);
    if (!actor) return unauthorized();
    const updatedJob = await request.json();
    if (!updatedJob?.id) return NextResponse.json({ error: "Missing job ID" }, { status: 400 });

    if (hasSupabaseEnv()) {
      const supabase = getSupabaseServerClient();
      const { data: existingRows, error: existingError } = await supabase.from("jobs").select("*").eq("id", updatedJob.id).limit(1);
      if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
      const existing = existingRows?.[0];
      if (!existing) return NextResponse.json({ error: "Job not found" }, { status: 404 });
      if (actor.role === "user") {
        const own = await findClientForActor(actor);
        if (!own || existing.client_id !== own.id) return forbidden("You can only update jobs from your own account");
        updatedJob.clientId = own.id;
        updatedJob.clientName = own.name;
      }
      const isUser = actor.role === "user";
      const patch = {
        client_id: updatedJob.clientId,
        client_name: updatedJob.clientName,
        venue_id: updatedJob.venueId,
        venue_name: updatedJob.venueName,
        role: updatedJob.role,
        status:
          isUser && ["Filled", "filled", "Cancelled", "cancelled"].includes(String(existing.status))
            ? existing.status
            : updatedJob.status,
        date: updatedJob.date,
        start_time: updatedJob.startTime,
        end_time: updatedJob.endTime,
        hours: updatedJob.hours,
        rate: updatedJob.rate ?? updatedJob.hourlyRate,
        headcount: updatedJob.headcount,
        description: updatedJob.description,
        requirements: updatedJob.requirements,
        assigned_worker_id: isUser ? existing.assigned_worker_id : updatedJob.assignedWorkerId,
        assigned_worker_name: isUser ? existing.assigned_worker_name : updatedJob.assignedWorkerName,
        applicants: isUser ? existing.applicants : updatedJob.applicants,
        is_urgent: Boolean(updatedJob.isUrgent ?? updatedJob.is_urgent),
        instructions: String(updatedJob.instructions ?? ""),
        uniform: String(updatedJob.uniform ?? ""),
        parking: String(updatedJob.parking ?? ""),
      };
      const isAdminActor = hasRole(actor, ["admin", "super_admin"]);
      if (isAdminActor) {
        const prevAw = String(existing.assigned_worker_id ?? "");
        const nextAw = String(patch.assigned_worker_id ?? "");
        const prevNm = String(existing.assigned_worker_name ?? "");
        const nextNm = String(patch.assigned_worker_name ?? "");
        const prevSt = String(existing.status ?? "").toLowerCase();
        const nextSt = String(patch.status ?? "").toLowerCase();
        const filledFlip =
          (prevSt !== "filled" && nextSt === "filled") || (prevSt === "filled" && nextSt === "open");
        if (prevAw !== nextAw || prevNm !== nextNm || filledFlip) {
          return NextResponse.json(
            {
              error:
                "Staffing changes must use POST /api/jobs/assignment (confirm_applicant, admin_direct_assign, reject_applicant, or unassign).",
            },
            { status: 400 }
          );
        }
      }
      const { data, error } = await supabase.from("jobs").update(patch).eq("id", updatedJob.id).select("*").single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (!existing.assigned_worker_id && updatedJob.assignedWorkerId) {
        await recordLog('ASSIGN_JOB', `Assigned worker ${updatedJob.assignedWorkerName} to job ${updatedJob.id}`, actor.email, actor.id);
      } else {
        await recordLog('UPDATE_JOB', `Updated job details for ${updatedJob.id}`, actor.email, actor.id);
      }
      return NextResponse.json(jobRowToClientJob(data as Record<string, unknown>));
    }

    const jobs = await readDB();
    
    const index = jobs.findIndex((j: any) => j.id === updatedJob.id);
    if (index === -1) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    if (actor.role === "user") {
      const own = await resolveActorClient(actor);
      if (!own || jobs[index].clientId !== own.id) return forbidden("You can only update jobs from your own account");
      updatedJob.clientId = own.id;
      updatedJob.clientName = own.name;
    }
    
    const oldJob = jobs[index];
    const isAdminActor = hasRole(actor, ["admin", "super_admin"]);
    if (isAdminActor) {
      const assignChanged =
        String(updatedJob.assignedWorkerId ?? "") !== String(oldJob.assignedWorkerId ?? "") ||
        String(updatedJob.assignedWorkerName ?? "") !== String(oldJob.assignedWorkerName ?? "") ||
        (updatedJob.status === "Filled" && oldJob.status !== "Filled") ||
        (oldJob.status === "Filled" && updatedJob.status === "Open");
      if (assignChanged) {
        return NextResponse.json(
          {
            error:
              "Staffing changes must use POST /api/jobs/assignment (confirm_applicant, admin_direct_assign, reject_applicant, or unassign).",
          },
          { status: 400 }
        );
      }
    }
    let merged = { ...oldJob, ...updatedJob, id: oldJob.id };
    if (actor.role === "user") {
      merged = {
        ...merged,
        applicants: oldJob.applicants,
        assignedWorkerId: oldJob.assignedWorkerId,
        assignedWorkerName: oldJob.assignedWorkerName,
      };
      if (oldJob.status === "Filled" || oldJob.status === "Cancelled") {
        merged.status = oldJob.status;
      }
    }
    jobs[index] = merged;
    await withFileLock(dbPath, async () => {
      const latest = await readDB();
      const latestIndex = latest.findIndex((j: any) => j.id === updatedJob.id);
      if (latestIndex !== -1) {
        latest[latestIndex] = jobs[index];
        await writeDB(latest);
      }
    });
    
    // Log assignment specifically if it changed
    if (!oldJob.assignedWorkerId && merged.assignedWorkerId) {
      await recordLog('ASSIGN_JOB', `Assigned worker ${merged.assignedWorkerName} to job ${updatedJob.id}`, actor.email, actor.id);
    } else {
      await recordLog('UPDATE_JOB', `Updated job details for ${updatedJob.id}`, actor.email, actor.id);
    }

    return NextResponse.json(mapJobsForClient([jobs[index]])[0]);
  } catch {
    return NextResponse.json({ error: "Failed to update job" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const actor = getSessionUserFromRequest(request);
    if (!actor) return unauthorized();
    if (!hasRole(actor, ['admin', 'super_admin'])) return forbidden();
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    if (hasSupabaseEnv()) {
      const supabase = getSupabaseServerClient();
      const { data: existingRows, error: existingError } = await supabase.from("jobs").select("*").eq("id", id).limit(1);
      if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
      const jobToDelete = existingRows?.[0];
      if (!jobToDelete) return NextResponse.json({ error: "Job not found" }, { status: 404 });
      const { error: deleteError } = await supabase.from("jobs").delete().eq("id", id);
      if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
      await recordLog('DELETE_JOB', `Deleted job: ${jobToDelete?.role || id}`, actor.email, actor.id);
      return NextResponse.json({ success: true });
    }
    const jobs = await readDB();
    const jobToDelete = jobs.find((j: any) => j.id === id);
    if (!jobToDelete) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    await withFileLock(dbPath, async () => {
      const latest = await readDB();
      await writeDB(latest.filter((j: any) => j.id !== id));
    });

    await recordLog('DELETE_JOB', `Deleted job: ${jobToDelete?.role || id}`, actor.email, actor.id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete job" }, { status: 500 });
  }
}
