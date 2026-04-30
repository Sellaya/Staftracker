import { NextResponse } from "next/server";
import path from "path";
import { hashPassword, readUsersDb, writeUsersDb } from "@/lib/auth";
import { generateWorkerId, readJsonFile, withFileLock, writeJsonFileAtomic } from "@/lib/json-db";

export const dynamic = "force-dynamic";

const workersPath = path.join(process.cwd(), "workers.json");
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const firstName = String(body?.firstName || "").trim();
    const lastName = String(body?.lastName || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const phone = String(body?.phone || "").trim();
    const password = String(body?.password || "");
    const legalStatus = String(body?.legalStatus || "").trim();
    const linkedin = String(body?.linkedin || "").trim();
    const postalCode = String(body?.postalCode || "").trim().toUpperCase();
    const neighborhoods = Array.isArray(body?.neighborhoods) ? body.neighborhoods : [];
    const primaryRoles = Array.isArray(body?.primaryRoles) ? body.primaryRoles : [];
    const yearsExperience = String(body?.yearsExperience || "");
    const bio = String(body?.bio || "");
    const smartServeHas = Boolean(body?.smartServeHas);
    const smartServeNumber = String(body?.smartServeNumber || "");
    const foodHandlerHas = Boolean(body?.foodHandlerHas);
    const foodHandlerNumber = String(body?.foodHandlerNumber || "");
    const resumeFileName = body?.resumeFileName ? String(body.resumeFileName) : null;
    const extraDocFileName = body?.extraDocFileName ? String(body.extraDocFileName) : null;

    if (!firstName || !lastName || !email || !phone || !password) {
      return NextResponse.json({ error: "All required fields must be filled." }, { status: 400 });
    }
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const usersDb = await readUsersDb();
    const existing = usersDb.users.find((u: any) => u.email?.toLowerCase() === email);
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const existingWorkers = await readJsonFile<any[]>(workersPath, []);
    const workerId = generateWorkerId(existingWorkers.map((w: any) => String(w.id || "")));
    const fullName = `${firstName} ${lastName}`.trim();
    const now = new Date().toISOString();

    const userRecord = {
      id: workerId,
      name: fullName,
      email,
      password: hashPassword(password),
      role: "worker",
      createdAt: now,
    };

    const workerRecord = {
      id: workerId,
      name: fullName,
      firstName,
      lastName,
      email,
      phone,
      address: "",
      status: "Pending",
      documentStatus: "Pending",
      reliability: 100,
      roles: primaryRoles,
      roleOverrides: [],
      flags: [],
      notes: [],
      shiftHistory: [],
      lifetimeEarnings: "$0.00",
      legalStatus,
      linkedin,
      postalCode,
      neighborhoods,
      yearsExperience,
      bio,
      smartServeHas,
      smartServeNumber,
      foodHandlerHas,
      foodHandlerNumber,
      resumeFileName,
      extraDocFileName,
      createdAt: now,
    };

    await withFileLock("users", async () => {
      const latestUsers = await readUsersDb();
      latestUsers.users.push(userRecord);
      await writeUsersDb(latestUsers);
    });

    await withFileLock(workersPath, async () => {
      const workers = await readJsonFile<any[]>(workersPath, []);
      workers.push(workerRecord);
      await writeJsonFileAtomic(workersPath, workers);
    });

    return NextResponse.json({ success: true, id: workerId }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to submit worker profile." }, { status: 500 });
  }
}
