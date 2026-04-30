import { NextResponse } from "next/server";
import { getSessionUserFromRequest, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = getSessionUserFromRequest(request);
  if (!user) return unauthorized();
  return NextResponse.json(user);
}
