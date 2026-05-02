import { NextResponse, NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';
import path from 'path';
import { recordLog } from '@/lib/audit';
import { forbidden, getSessionUserFromRequest, hasRole, unauthorized } from '@/lib/auth';
import { generateId, readJsonFile, withFileLock, writeJsonFileAtomic } from '@/lib/json-db';
import { getSupabaseServerClient, hasSupabaseEnv } from '@/lib/supabase';
import { findClientForActor, nextTableId } from '@/lib/supabase-db';

const dbPath = path.join(process.cwd(), 'venues.json');
const clientsPath = path.join(process.cwd(), 'clients.json');

async function readDB() {
  return readJsonFile<any[]>(dbPath, []);
}

async function writeDB(data: any) {
  await writeJsonFileAtomic(dbPath, data);
}

function toVenueDto(row: Record<string, unknown>) {
  return {
    ...row,
    clientId: row.client_id ?? row.clientId ?? null,
    clientName: row.client_name ?? row.clientName ?? null,
    contactName: row.contact_name ?? row.contactName ?? "",
    venueType: row.venue_type ?? row.venueType ?? "",
    dressCode: row.dress_code ?? row.dressCode ?? "",
    parkingInfo: row.parking_info ?? row.parkingInfo ?? "",
    createdAt: row.created_at ?? row.createdAt ?? null,
  };
}

async function resolveActorClient(actor: { id: string; email: string }) {
  const clients = await readJsonFile<any[]>(clientsPath, []);
  return clients.find((c: any) => c.createdByUserId === actor.id || c.email?.toLowerCase() === actor.email.toLowerCase()) || null;
}

export async function GET(request: Request) {
  const actor = getSessionUserFromRequest(request);
  if (!actor) return unauthorized();
  if (!hasRole(actor, ['admin', 'super_admin', 'user'])) return forbidden();
  if (hasSupabaseEnv()) {
    const supabase = getSupabaseServerClient();
    if (actor.role === "user") {
      const own = await findClientForActor(actor);
      if (!own) return NextResponse.json([]);
      const { data, error } = await supabase.from("venues").select("*").eq("client_id", own.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json((data || []).map((row: Record<string, unknown>) => toVenueDto(row)));
    }
    const { data, error } = await supabase.from("venues").select("*");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json((data || []).map((row: Record<string, unknown>) => toVenueDto(row)));
  }

  const venues = await readDB();
  if (actor.role === "user") {
    const own = await resolveActorClient(actor);
    if (!own) return NextResponse.json([]);
    return NextResponse.json(venues.filter((v: any) => v.clientId === own.id));
  }
  return NextResponse.json(venues);
}

export async function POST(request: Request) {
  try {
    const actor = getSessionUserFromRequest(request);
    if (!actor) return unauthorized();
    if (!hasRole(actor, ['admin', 'super_admin', 'user'])) return forbidden();
    const body = await request.json();
    if (typeof body?.name !== "string" || typeof body?.clientId !== "string") {
      return NextResponse.json({ error: "Missing required venue fields" }, { status: 400 });
    }

    if (hasSupabaseEnv()) {
      const supabase = getSupabaseServerClient();
      const actorClient = actor.role === "user" ? await findClientForActor(actor) : null;
      if (actor.role === "user" && !actorClient) {
        return NextResponse.json({ error: "No client account linked to this user" }, { status: 400 });
      }
      if (actor.role === "user" && body.clientId && actorClient && body.clientId !== actorClient.id) {
        return forbidden("You can only create venues for your own account");
      }

      const id = await nextTableId("V", "venues");
      const payload = {
        id,
        client_id: actor.role === "user" && actorClient ? actorClient.id : body.clientId,
        client_name: actor.role === "user" && actorClient ? actorClient.name : body.clientName,
        name: body.name,
        address: body.address || "",
        gps: body.gps || "",
        status: body.status || "Active",
        contact_name: body.contactName || "",
        phone: body.phone || "",
        notes: body.notes || "",
        venue_type: body.venueType || "",
        departments: Array.isArray(body.departments) ? body.departments : [],
        instructions: body.instructions || "",
        dress_code: body.dressCode || "",
        parking_info: body.parkingInfo || "",
        created_at: new Date().toISOString(),
      };
      const { data, error } = await supabase.from("venues").insert(payload).select("*").single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await recordLog('CREATE_VENUE', `Created new venue: ${payload.name}`, actor.email, actor.id);
      return NextResponse.json(toVenueDto(data));
    }

    const actorClient = actor.role === "user" ? await resolveActorClient(actor) : null;
    if (actor.role === "user" && !actorClient) {
      return NextResponse.json({ error: "No client account linked to this user" }, { status: 400 });
    }
    if (actor.role === "user" && body.clientId && body.clientId !== actorClient.id) {
      return forbidden("You can only create venues for your own account");
    }

    const existingVenues = await readDB();
    const newVenue = {
      ...body,
      id: generateId('V', existingVenues.map((v: any) => String(v.id || ""))),
      status: body.status || "Active",
      clientId: actor.role === "user" ? actorClient.id : body.clientId,
      clientName: actor.role === "user" ? actorClient.name : body.clientName,
    };

    await withFileLock(dbPath, async () => {
      const venues = await readDB();
      venues.push(newVenue);
      await writeDB(venues);
    });

    await withFileLock(clientsPath, async () => {
      const clientsData = await readJsonFile<any[]>(clientsPath, []);
      const cIndex = clientsData.findIndex((c: any) => c.id === newVenue.clientId);
      if (cIndex !== -1) {
        clientsData[cIndex].venueCount = (clientsData[cIndex].venueCount || 0) + 1;
        await writeJsonFileAtomic(clientsPath, clientsData);
      }
    });

    await recordLog('CREATE_VENUE', `Created new venue: ${newVenue.name}`, actor.email, actor.id);
    return NextResponse.json(newVenue);
  } catch {
    return NextResponse.json({ error: "Failed to create venue" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const actor = getSessionUserFromRequest(request);
    if (!actor) return unauthorized();
    if (!hasRole(actor, ['admin', 'super_admin', 'user'])) return forbidden();
    const updatedVenue = await request.json();
    if (!updatedVenue?.id) return NextResponse.json({ error: "Missing venue ID" }, { status: 400 });

    if (hasSupabaseEnv()) {
      const supabase = getSupabaseServerClient();
      const { data: existingRows, error: existingError } = await supabase.from("venues").select("*").eq("id", updatedVenue.id).limit(1);
      if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
      const existing = existingRows?.[0];
      if (!existing) return NextResponse.json({ error: "Venue not found" }, { status: 404 });
      if (actor.role === "user") {
        const own = await findClientForActor(actor);
        if (!own || existing.client_id !== own.id) return forbidden("You can only update your own venues");
      }
      const patch = {
        name: updatedVenue.name,
        address: updatedVenue.address,
        status: updatedVenue.status,
        client_id: updatedVenue.clientId,
        contact_name: updatedVenue.contactName,
        phone: updatedVenue.phone,
        notes: updatedVenue.notes,
      };
      const { data, error } = await supabase.from("venues").update(patch).eq("id", updatedVenue.id).select("*").single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await recordLog('UPDATE_VENUE', `Updated venue details: ${data.name}`, actor.email, actor.id);
      return NextResponse.json(toVenueDto(data));
    }

    const venues = await readDB();
    
    const index = venues.findIndex((v: any) => v.id === updatedVenue.id);
    if (index === -1) return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    if (actor.role === "user") {
      const own = await resolveActorClient(actor);
      if (!own || venues[index].clientId !== own.id) return forbidden("You can only update your own venues");
    }
    
    const allowed = ["name","address","status","clientId","contactName","phone","notes"];
    const patch: Record<string, any> = {};
    for (const key of allowed) if (updatedVenue[key] !== undefined) patch[key] = updatedVenue[key];
    const next = { ...venues[index], ...patch, id: venues[index].id };
    await withFileLock(dbPath, async () => {
      const latest = await readDB();
      const latestIndex = latest.findIndex((v: any) => v.id === updatedVenue.id);
      if (latestIndex !== -1) {
        latest[latestIndex] = next;
        await writeDB(latest);
      }
    });
    await recordLog('UPDATE_VENUE', `Updated venue details: ${next.name}`, actor.email, actor.id);
    
    return NextResponse.json(next);
  } catch {
    return NextResponse.json({ error: "Failed to update venue" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const actor = getSessionUserFromRequest(request);
    if (!actor) return unauthorized();
    if (!hasRole(actor, ['admin', 'super_admin'])) return forbidden("Only admins can delete venues");
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    if (hasSupabaseEnv()) {
      const supabase = getSupabaseServerClient();
      const { data: existingRows, error: existingError } = await supabase.from("venues").select("*").eq("id", id).limit(1);
      if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
      const venueToDelete = existingRows?.[0];
      if (!venueToDelete) return NextResponse.json({ error: "Venue not found" }, { status: 404 });
      const { error: deleteError } = await supabase.from("venues").delete().eq("id", id);
      if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
      await recordLog('DELETE_VENUE', `Deleted venue: ${venueToDelete?.name || id}`, actor.email, actor.id);
      return NextResponse.json({ success: true });
    }
    const venues = await readDB();
    const venueToDelete = venues.find((v: any) => v.id === id);
    if (!venueToDelete) return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    await withFileLock(dbPath, async () => {
      const latest = await readDB();
      await writeDB(latest.filter((v: any) => v.id !== id));
    });

    await recordLog('DELETE_VENUE', `Deleted venue: ${venueToDelete?.name || id}`, actor.email, actor.id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete venue" }, { status: 500 });
  }
}
