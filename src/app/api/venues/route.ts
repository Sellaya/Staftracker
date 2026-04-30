import { NextResponse, NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';
import fs from 'fs/promises';
import path from 'path';
import { recordLog } from '@/lib/audit';

const dbPath = path.join(process.cwd(), 'venues.json');

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
  const venues = await readDB();
  return NextResponse.json(venues);
}

export async function POST(request: Request) {
  try {
    const newVenue = await request.json();
    const venues = await readDB();
    
    newVenue.id = `V-${Math.floor(Math.random() * 9000) + 1000}`;
    newVenue.status = "Active";
    
    venues.push(newVenue);
    await writeDB(venues);
    
    const userEmail = request.headers.get('x-user-email') || 'system';
    const userId = request.headers.get('x-user-id') || 'system';
    await recordLog('CREATE_VENUE', `Created new venue: ${newVenue.name}`, userEmail, userId);
    
    // Increment venueCount in client
    const clientsPath = path.join(process.cwd(), 'clients.json');
    try {
      const clientsData = JSON.parse(await fs.readFile(clientsPath, 'utf8'));
      const cIndex = clientsData.findIndex((c: any) => c.id === newVenue.clientId);
      if (cIndex !== -1) {
        clientsData[cIndex].venueCount = (clientsData[cIndex].venueCount || 0) + 1;
        await fs.writeFile(clientsPath, JSON.stringify(clientsData, null, 2));
      }
    } catch (e) {}

    return NextResponse.json(newVenue);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create venue" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const updatedVenue = await request.json();
    let venues = await readDB();
    
    const index = venues.findIndex((v: any) => v.id === updatedVenue.id);
    if (index === -1) return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    
    venues[index] = { ...venues[index], ...updatedVenue };
    await writeDB(venues);
    
    const userEmail = request.headers.get('x-user-email') || 'system';
    const userId = request.headers.get('x-user-id') || 'system';
    await recordLog('UPDATE_VENUE', `Updated venue details: ${updatedVenue.name}`, userEmail, userId);
    
    return NextResponse.json(venues[index]);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update venue" }, { status: 500 });
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

    let venues = await readDB();
    const venueToDelete = venues.find((v: any) => v.id === id);
    venues = venues.filter((v: any) => v.id !== id);
    await writeDB(venues);

    const userEmail = request.headers.get('x-user-email') || 'system';
    await recordLog('DELETE_VENUE', `Deleted venue: ${venueToDelete?.name || id}`, userEmail, userId || 'system');

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete venue" }, { status: 500 });
  }
}
