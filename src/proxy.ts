import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const protectedPaths = ["/dashboard", "/worker"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected) {
    const sessionCookie = request.cookies.get("session");

    if (!sessionCookie) {
      const loginUrl = pathname.startsWith("/worker") ? "/login/worker" : "/";
      return NextResponse.redirect(new URL(loginUrl, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/worker/:path*"],
};
