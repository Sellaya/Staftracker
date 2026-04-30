import { NextResponse, NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';
import fs from 'fs';
import path from 'path';
import { recordLog } from '@/lib/audit';

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
  newClient.customRates = newClient.customRates || [];
  newClient.preferredWorkers = newClient.preferredWorkers || [];
  newClient.invoices = newClient.invoices || [];
  newClient.venueCount = newClient.venueCount || 0;

  clients.push(newClient);
  writeDB(clients);
  
  // Audit log
  const userEmail = request.headers.get('x-user-email') || 'system';
  const userId = request.headers.get('x-user-id') || 'system';
  await recordLog('CREATE_CLIENT', `Created new client: ${newClient.name}`, userEmail, userId);
  
  return NextResponse.json(newClient);
}

export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

  const userId = request.headers.get('x-user-id');
  
  // Simple RBAC check
  const usersPath = path.join(process.cwd(), 'users.json');
  const usersData = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
  const actingUser = usersData.users.find((u: any) => u.id === userId);
  
  if (!actingUser || actingUser.role !== 'super_admin') {
    return NextResponse.json({ error: "Unauthorized: Only Super Admins can delete clients" }, { status: 403 });
  }

  let clients = readDB();
  const userToDelete = clients.find((c: any) => c.id === id);
  clients = clients.filter((c: any) => c.id !== id);
  writeDB(clients);

  // Audit log
  const userEmail = request.headers.get('x-user-email') || 'system';
  await recordLog('DELETE_CLIENT', `Deleted client: ${userToDelete?.name || id}`, userEmail, userId || 'system');

  return NextResponse.json({ success: true });
}
