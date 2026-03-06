import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('fast_session')

  if (!sessionCookie && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (sessionCookie && request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/statistics', request.url))
  }

  if (request.nextUrl.pathname === '/' || request.nextUrl.pathname === '/dashboard') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
