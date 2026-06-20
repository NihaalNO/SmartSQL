import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // All auth is client-side (sessionStorage). The middleware only handles
  // moderator routes which still use a server-checkable cookie.
  if (pathname.startsWith('/moderator/dashboard')) {
    const modToken = request.cookies.get('mod_token')?.value
    if (!modToken) {
      return NextResponse.redirect(new URL('/moderator/login', request.url))
    }
  }

  if (pathname === '/moderator/login') {
    const modToken = request.cookies.get('mod_token')?.value
    if (modToken) {
      return NextResponse.redirect(new URL('/moderator/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
}
