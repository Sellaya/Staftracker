import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Paths that require authentication
  const protectedPaths = ['/dashboard', '/worker/dashboard'];
  
  const isProtected = protectedPaths.some(p => pathname.startsWith(p));
  
  if (isProtected) {
    const userCookie = request.cookies.get('user');
    const userIdHeader = request.headers.get('x-user-id');
    
    if (!userCookie && !userIdHeader) {
      // Redirect to appropriate login page
      const loginUrl = pathname.startsWith('/worker') ? '/login/worker' : '/login';
      return NextResponse.redirect(new URL(loginUrl, request.url));
    }

    // Optional: Role-based check
    if (userCookie) {
      try {
        const user = JSON.parse(userCookie.value);
        if (pathname.startsWith('/dashboard') && user.role !== 'admin' && user.role !== 'super_admin') {
           return NextResponse.redirect(new URL('/login', request.url));
        }
        if (pathname.startsWith('/worker') && user.role !== 'worker') {
           return NextResponse.redirect(new URL('/login/worker', request.url));
        }
      } catch (e) {}
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/worker/:path*'],
};
