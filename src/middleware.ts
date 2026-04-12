import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('fast_session');

  // Redirect unauthenticated users to login (except login page itself)
  if (!sessionCookie && !pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect root to statistics (or login if no session)
  if (pathname === '/' || pathname === '/dashboard') {
    return NextResponse.redirect(
      new URL(sessionCookie ? '/statistics' : '/login', request.url)
    );
  }

  // /developer requires a session — the page itself verifies the developer email
  if (pathname.startsWith('/developer') && !sessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
