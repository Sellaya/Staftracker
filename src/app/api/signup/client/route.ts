import { NextResponse } from "next/server";
import path from "path";
import { hashPassword, readUsersDb, writeUsersDb } from "@/lib/auth";
import { generateId, readJsonFile, withFileLock, writeJsonFileAtomic } from "@/lib/json-db";
import { getSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase";
import { nextTableId } from "@/lib/supabase-db";

export const dynamic = "force-dynamic";

const clientsPath = path.join(process.cwd(), "clients.json");
const venuesPath = path.join(process.cwd(), "venues.json");
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const companyName = String(body?.companyName || "").trim();
    const firstName = String(body?.firstName || "").trim();
    const lastName = String(body?.lastName || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const phone = String(body?.phone || "").trim();
    const password = String(body?.password || "");
    const billingEmail = String(body?.billingEmail || "").trim().toLowerCase();

    const venueName = String(body?.venueName || "").trim();
    const venueType = String(body?.venueType || "").trim();
    const address = String(body?.address || "").trim();

    const roles = Array.isArray(body?.roles) ? body.roles.map((r: unknown) => String(r)) : [];
    const frequency = String(body?.frequency || "").trim();
    const uniform = String(body?.uniform || "").trim();
    const instructions = String(body?.instructions || "").trim();
    const parking = String(body?.parking || "").trim();

    if (!companyName || !firstName || !lastName || !email || !phone || !password) {
      return NextResponse.json({ error: "Please complete all required account fields." }, { status: 400 });
    }
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Invalid work email." }, { status: 400 });
    }
    if (billingEmail && !EMAIL_REGEX.test(billingEmail)) {
      return NextResponse.json({ error: "Invalid billing email." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }
    if (!venueName || !address) {
      return NextResponse.json({ error: "Venue name and venue address are required." }, { status: 400 });
    }

    let userId = "";
    let clientId = "";
    let venueId = "";
    const contactName = `${firstName} ${lastName}`.trim();
    const now = new Date().toISOString();

    if (hasSupabaseEnv()) {
      const supabase = getSupabaseServerClient();
      const { data: existing, error: existingError } = await supabase.from("users").select("id,email").ilike("email", email).limit(1);
      if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
      if (existing && existing.length > 0) {
        return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
      }
      userId = await nextTableId("U", "users");
      clientId = await nextTableId("C", "clients");
      venueId = await nextTableId("V", "venues");

      const { error: userInsertError } = await supabase.from("users").insert({
        id: userId,
        name: contactName,
        email,
        password: hashPassword(password),
        role: "user",
        created_at: now,
      });
      if (userInsertError) return NextResponse.json({ error: userInsertError.message }, { status: 500 });

      const { error: clientInsertError } = await supabase.from("clients").insert({
        id: clientId,
        name: companyName,
        contact_name: contactName,
        email,
        phone,
        status: "Active",
        payment_method: "Credit Card",
        address,
        industry: "Hospitality",
        tax_id: "",
        notes: "",
        custom_rates: [],
        preferred_workers: [],
        invoices: [],
        venue_count: 1,
        billing_email: billingEmail || email,
        venue_type: venueType,
        staffing_roles: roles,
        staffing_frequency: frequency,
        logistics: { uniform, instructions, parking },
        created_by_user_id: userId,
        created_at: now,
      });
      if (clientInsertError) {
        await supabase.from("users").delete().eq("id", userId);
        return NextResponse.json({ error: clientInsertError.message }, { status: 500 });
      }

      const { error: venueInsertError } = await supabase.from("venues").insert({
        id: venueId,
        client_id: clientId,
        client_name: companyName,
        name: venueName,
        address,
        contact_name: contactName,
        phone,
        notes: [uniform, instructions, parking].filter(Boolean).join(" | "),
        status: "Active",
        venue_type: venueType,
        created_at: now,
      });
      if (venueInsertError) {
        await supabase.from("clients").delete().eq("id", clientId);
        await supabase.from("users").delete().eq("id", userId);
        return NextResponse.json({ error: venueInsertError.message }, { status: 500 });
      }

      return NextResponse.json(
        { success: true, userId, clientId, venueId, message: "Client account and first venue created successfully." },
        { status: 201 },
      );
    }

    const usersDb = await readUsersDb();
    const existingUser = usersDb.users.find((u: Record<string, unknown>) => String(u.email || "").toLowerCase() === email);
    if (existingUser) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const existingClients = await readJsonFile<Record<string, unknown>[]>(clientsPath, []);
    const existingVenues = await readJsonFile<Record<string, unknown>[]>(venuesPath, []);
    userId = generateId("U", usersDb.users.map((u: Record<string, unknown>) => String(u.id || "")));
    clientId = generateId("C", existingClients.map((c) => String(c.id || "")));
    venueId = generateId("V", existingVenues.map((v) => String(v.id || "")));

    const userRecord = {
      id: userId,
      name: contactName,
      email,
      password: hashPassword(password),
      role: "user",
      createdAt: now,
    };

    const clientRecord = {
      id: clientId,
      name: companyName,
      contactName,
      email,
      phone,
      status: "Active",
      paymentMethod: "Credit Card",
      address,
      industry: "Hospitality",
      taxId: "",
      notes: "",
      customRates: [],
      preferredWorkers: [],
      invoices: [],
      venueCount: 1,
      billingEmail: billingEmail || email,
      venueType,
      staffingRoles: roles,
      staffingFrequency: frequency,
      logistics: { uniform, instructions, parking },
      createdByUserId: userId,
      createdAt: now,
    };

    const venueRecord = {
      id: venueId,
      clientId,
      clientName: companyName,
      name: venueName,
      address,
      contactName,
      phone,
      notes: [uniform, instructions, parking].filter(Boolean).join(" | "),
      status: "Active",
      venueType,
      createdAt: now,
    };

    await withFileLock("users", async () => {
      const latestUsers = await readUsersDb();
      latestUsers.users.push(userRecord);
      await writeUsersDb(latestUsers);
    });

    await withFileLock(clientsPath, async () => {
      const clients = await readJsonFile<Record<string, unknown>[]>(clientsPath, []);
      clients.push(clientRecord);
      await writeJsonFileAtomic(clientsPath, clients);
    });

    await withFileLock(venuesPath, async () => {
      const venues = await readJsonFile<Record<string, unknown>[]>(venuesPath, []);
      venues.push(venueRecord);
      await writeJsonFileAtomic(venuesPath, venues);
    });

    return NextResponse.json(
      { success: true, userId, clientId, venueId, message: "Client account and first venue created successfully." },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "Failed to create client account." }, { status: 500 });
  }
}
