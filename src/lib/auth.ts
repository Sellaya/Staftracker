import crypto from "crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const USERS_DB_PATH = path.join(process.cwd(), "users.json");
const SESSION_COOKIE = "session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const PBKDF2_ITERATIONS = 120000;
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = "sha512";
function getSessionSecret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
    throw new Error("SESSION_SECRET must be set in production");
  }
  return "dev-only-session-secret";
}

export type AppRole = "super_admin" | "admin" | "user" | "worker";

export type SessionUser = {
  id: string;
  email: string;
  role: AppRole;
  name: string;
};

type SessionPayload = SessionUser & {
  exp: number;
};

type UsersDb = { users: Array<Record<string, any>> };

function b64UrlEncode(input: string): string {
  return Buffer.from(input).toString("base64url");
}

function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function sign(value: string): string {
  return crypto.createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader.split(";").reduce<Record<string, string>>((acc, chunk) => {
    const [k, ...rest] = chunk.trim().split("=");
    if (!k) return acc;
    acc[k] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
}

function normalizeRole(role: unknown): AppRole {
  if (role === "super_admin" || role === "admin" || role === "user" || role === "worker") {
    return role;
  }
  return "user";
}

function ensureSessionUser(user: any): SessionUser {
  return {
    id: String(user.id || ""),
    email: String(user.email || ""),
    role: normalizeRole(user.role),
    name: String(user.name || ""),
  };
}

export function sanitizeUser(user: any): SessionUser {
  return ensureSessionUser(user);
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST)
    .toString("hex");
  return `pbkdf2:${PBKDF2_DIGEST}:${PBKDF2_ITERATIONS}:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedPassword: string): { valid: boolean; needsUpgrade: boolean } {
  if (!storedPassword) return { valid: false, needsUpgrade: false };

  if (!storedPassword.startsWith("pbkdf2:")) {
    return { valid: storedPassword === password, needsUpgrade: storedPassword === password };
  }

  const [, digest, iterationsRaw, salt, expectedHash] = storedPassword.split(":");
  const iterations = Number(iterationsRaw);
  if (!digest || !iterations || !salt || !expectedHash) return { valid: false, needsUpgrade: false };
  const computed = crypto.pbkdf2Sync(password, salt, iterations, PBKDF2_KEYLEN, digest).toString("hex");
  return { valid: crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(expectedHash)), needsUpgrade: false };
}

export async function readUsersDb(): Promise<UsersDb> {
  try {
    const raw = await fs.readFile(USERS_DB_PATH, "utf8");
    const parsed = safeJsonParse<UsersDb>(raw);
    if (!parsed || !Array.isArray(parsed.users)) return { users: [] };
    return parsed;
  } catch {
    return { users: [] };
  }
}

export async function writeUsersDb(db: UsersDb): Promise<void> {
  await fs.writeFile(USERS_DB_PATH, JSON.stringify(db, null, 2));
}

export function createSessionToken(user: SessionUser): string {
  const payload: SessionPayload = {
    ...ensureSessionUser(user),
    exp: Date.now() + SESSION_TTL_SECONDS * 1000,
  };
  const payloadB64 = b64UrlEncode(JSON.stringify(payload));
  const sig = sign(payloadB64);
  return `${payloadB64}.${sig}`;
}

export function getSessionUserFromRequest(request: Request | NextRequest): SessionUser | null {
  const cookies = parseCookies(request.headers.get("cookie"));
  const token = cookies[SESSION_COOKIE];
  if (!token || !token.includes(".")) return null;
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;
  const expectedSig = sign(payloadB64);
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
  const parsed = safeJsonParse<SessionPayload>(Buffer.from(payloadB64, "base64url").toString("utf8"));
  if (!parsed || parsed.exp < Date.now()) return null;
  return ensureSessionUser(parsed);
}

export function hasRole(user: SessionUser | null, allowedRoles: AppRole[]): boolean {
  if (!user) return false;
  return allowedRoles.includes(user.role);
}

export function unauthorized(message = "Unauthorized"): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Forbidden"): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}
