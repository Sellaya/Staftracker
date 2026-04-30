import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import fs from 'fs/promises';
import path from 'path';

const jobsPath = path.join(process.cwd(), 'jobs.json');

export async function POST(request: Request) {
  try {
    const { jobId, workerId, workerName } = await request.json();
    const data = await fs.readFile(jobsPath, 'utf8');
    const jobs = JSON.parse(data);

    const index = jobs.findIndex((j: any) => j.id === jobId);
    if (index === -1) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    if (!jobs[index].applicants) jobs[index].applicants = [];
    
    // Avoid double applications
    if (jobs[index].applicants.some((a: any) => a.id === workerId)) {
       return NextResponse.json({ message: "Already applied" }, { status: 200 });
    }

    jobs[index].applicants.push({
      id: workerId,
      name: workerName,
      appliedAt: "Just now",
      rating: 5.0,
      reliability: 100
    });

    await fs.writeFile(jobsPath, JSON.stringify(jobs, null, 2));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to apply" }, { status: 500 });
  }
}
