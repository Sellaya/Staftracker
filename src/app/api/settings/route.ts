import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'settings.json');

const readDB = () => {
  if (!fs.existsSync(dbPath)) return {};
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
};

const writeDB = (data: any) => {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
};

export async function GET() {
  const settings = readDB();
  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  const updatedSettings = await request.json();
  writeDB(updatedSettings);
  return NextResponse.json(updatedSettings);
}
