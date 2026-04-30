import { NextResponse, NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';
import fs from 'fs/promises';
import path from 'path';
import { recordLog } from '@/lib/audit';

const dbPath = path.join(process.cwd(), 'jobs.json');

async function readDB() {
  try {
    const data = await fs.readFile(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function writeDB(data: any) {
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2));
}

export async function GET() {
  const jobs = await readDB();
  return NextResponse.json(jobs);
}

export async function POST(request: Request) {
  try {
    const newJob = await request.json();
    const jobs = await readDB();
    
    jobs.unshift(newJob);
    await writeDB(jobs);
    
    // Audit log
    const userEmail = request.headers.get('x-user-email') || 'system';
    const userId = request.headers.get('x-user-id') || 'system';
    await recordLog('CREATE_JOB', `Created new job: ${newJob.role} at ${newJob.venueName}`, userEmail, userId);
    
    return NextResponse.json(newJob);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const updatedJob = await request.json();
    let jobs = await readDB();
    
    const index = jobs.findIndex((j: any) => j.id === updatedJob.id);
    if (index === -1) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    
    const oldJob = jobs[index];
    jobs[index] = { ...oldJob, ...updatedJob };
    await writeDB(jobs);
    
    // Audit log
    const userEmail = request.headers.get('x-user-email') || 'system';
    const userId = request.headers.get('x-user-id') || 'system';
    
    // Log assignment specifically if it changed
    if (!oldJob.assignedWorkerId && updatedJob.assignedWorkerId) {
      await recordLog('ASSIGN_JOB', `Assigned worker ${updatedJob.assignedWorkerName} to job ${updatedJob.id}`, userEmail, userId);
    } else {
      await recordLog('UPDATE_JOB', `Updated job details for ${updatedJob.id}`, userEmail, userId);
    }
    
    return NextResponse.json(jobs[index]);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update job" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const usersPath = path.join(process.cwd(), 'users.json');
    const usersData = JSON.parse(await fs.readFile(usersPath, 'utf8'));
    const actingUser = usersData.users.find((u: any) => u.id === userId);
    
    if (!actingUser || actingUser.role !== 'super_admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    let jobs = await readDB();
    const jobToDelete = jobs.find((j: any) => j.id === id);
    jobs = jobs.filter((j: any) => j.id !== id);
    await writeDB(jobs);

    const userEmail = request.headers.get('x-user-email') || 'system';
    await recordLog('DELETE_JOB', `Deleted job: ${jobToDelete?.role || id}`, userEmail, userId || 'system');

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete job" }, { status: 500 });
  }
}
