import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import path from 'path';
import { forbidden, getSessionUserFromRequest, hasRole, unauthorized } from '@/lib/auth';
import { readJsonFile, withFileLock, writeJsonFileAtomic } from '@/lib/json-db';

const jobsPath = path.join(process.cwd(), 'jobs.json');

export async function POST(request: Request) {
  try {
    const actor = getSessionUserFromRequest(request);
    if (!actor) return unauthorized();
    if (!hasRole(actor, ['worker'])) return forbidden("Only workers can apply for jobs");
    const { jobId, workerId, workerName } = await request.json();
    if (typeof jobId !== "string") return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
    if (workerId && workerId !== actor.id) return forbidden("Worker identity mismatch");
    const jobs = await readJsonFile<any[]>(jobsPath, []);

    const index = jobs.findIndex((j: any) => j.id === jobId);
    if (index === -1) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    if (!jobs[index].applicants) jobs[index].applicants = [];
    
    // Avoid double applications
    if (jobs[index].applicants.some((a: any) => a.id === actor.id)) {
       return NextResponse.json({ message: "Already applied" }, { status: 200 });
    }

    jobs[index].applicants.push({
      id: actor.id,
      name: workerName || actor.name,
      appliedAt: "Just now",
      reliability: 100
    });

    await withFileLock(jobsPath, async () => {
      await writeJsonFileAtomic(jobsPath, jobs);
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to apply" }, { status: 500 });
  }
}
