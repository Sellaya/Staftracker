import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'jobs.json');

const readDB = () => {
  if (!fs.existsSync(dbPath)) return [];
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
};

const writeDB = (data: any) => {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
};

export async function GET() {
  const jobs = readDB();
  return NextResponse.json(jobs);
}

export async function POST(request: Request) {
  const newJob = await request.json();
  const jobs = readDB();
  jobs.unshift(newJob); // Add to beginning
  writeDB(jobs);
  return NextResponse.json(newJob);
}

export async function PUT(request: Request) {
  const updatedJob = await request.json();
  let jobs = readDB();
  jobs = jobs.map((j: any) => j.id === updatedJob.id ? updatedJob : j);
  writeDB(jobs);
  return NextResponse.json(updatedJob);
}
