import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'clients.json');

const readDB = () => {
  if (!fs.existsSync(dbPath)) return [];
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
};

const writeDB = (data: any) => {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
};

export async function GET() {
  const clients = readDB();
  return NextResponse.json(clients);
}

export async function POST(request: Request) {
  const newClient = await request.json();
  const clients = readDB();
  
  // Assign ID and default values if not provided
  newClient.id = `C-${Math.floor(Math.random() * 10000)}`;
  newClient.status = newClient.status || "Active";
  newClient.feePercentage = newClient.feePercentage || 20;
  newClient.customRates = newClient.customRates || [];
  newClient.preferredWorkers = newClient.preferredWorkers || [];
  newClient.invoices = newClient.invoices || [];
  newClient.venueCount = newClient.venueCount || 0;

  clients.push(newClient);
  writeDB(clients);
  
  return NextResponse.json(newClient);
}
