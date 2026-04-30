import { NextResponse, NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';
import path from 'path';
import { recordLog } from '@/lib/audit';
import { forbidden, getSessionUserFromRequest, hasRole, unauthorized } from '@/lib/auth';
import { generateId, readJsonFile, withFileLock, writeJsonFileAtomic } from '@/lib/json-db';

const dbPath = path.join(process.cwd(), 'jobs.json');

async function readDB() {
  return readJsonFile<any[]>(dbPath, []);
}

async function writeDB(data: any) {
  await writeJsonFileAtomic(dbPath, data);
}

export async function GET(request: Request) {
  const actor = getSessionUserFromRequest(request);
  if (!actor) return unauthorized();
  const jobs = await readDB();
  return NextResponse.json(jobs);
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
    const nextJob = { ...newJob, id: newJob.id || generateId('J'), applicants: Array.isArray(newJob.applicants) ? newJob.applicants : [] };
    await withFileLock(dbPath, async () => {
      const jobs = await readDB();
      jobs.unshift(nextJob);
      await writeDB(jobs);
    });
    await recordLog('CREATE_JOB', `Created new job: ${nextJob.role} at ${nextJob.venueName}`, actor.email, actor.id);

    return NextResponse.json(nextJob);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const actor = getSessionUserFromRequest(request);
    if (!actor) return unauthorized();
    const updatedJob = await request.json();
    if (!updatedJob?.id) return NextResponse.json({ error: "Missing job ID" }, { status: 400 });
    let jobs = await readDB();
    
    const index = jobs.findIndex((j: any) => j.id === updatedJob.id);
    if (index === -1) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    
    const oldJob = jobs[index];
    jobs[index] = { ...oldJob, ...updatedJob, id: oldJob.id };
    await withFileLock(dbPath, async () => {
      const latest = await readDB();
      const latestIndex = latest.findIndex((j: any) => j.id === updatedJob.id);
      if (latestIndex !== -1) {
        latest[latestIndex] = jobs[index];
        await writeDB(latest);
      }
    });
    
    // Log assignment specifically if it changed
    if (!oldJob.assignedWorkerId && updatedJob.assignedWorkerId) {
      await recordLog('ASSIGN_JOB', `Assigned worker ${updatedJob.assignedWorkerName} to job ${updatedJob.id}`, actor.email, actor.id);
    } else {
      await recordLog('UPDATE_JOB', `Updated job details for ${updatedJob.id}`, actor.email, actor.id);
    }
    
    return NextResponse.json(jobs[index]);
  } catch (error) {
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
    const jobs = await readDB();
    const jobToDelete = jobs.find((j: any) => j.id === id);
    if (!jobToDelete) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    await withFileLock(dbPath, async () => {
      const latest = await readDB();
      await writeDB(latest.filter((j: any) => j.id !== id));
    });

    await recordLog('DELETE_JOB', `Deleted job: ${jobToDelete?.role || id}`, actor.email, actor.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete job" }, { status: 500 });
  }
}
