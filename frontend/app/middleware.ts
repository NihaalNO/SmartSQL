import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Define protected route prefixes
  const protectedPaths = [
    '/dashboard',
    '/query',
    '/saved',
    '/live-db',
    '/history'
  ]

  // Define moderator/admin paths
  const moderatorPaths = [
    '/moderator'
  ]

  // Check if path is protected
  const isProtectedPath = protectedPaths.some(path =>
    pathname.startsWith(path)
  )

  const isModeratorPath = moderatorPaths.some(path =>
    pathname.startsWith(path)
  )

  // Get token from cookies
  const token = request.cookies.get('token')?.value
  const modToken = request.cookies.get('mod_token')?.value

  // Redirect to login if trying to access protected route without auth
  if (isProtectedPath && !token) {
    const url = new URL('/login', request.url)
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Redirect to moderator login if trying to access mod route without mod auth
  if (isModeratorPath && !modToken) {
    const url = new URL('/moderator/login', request.url)
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Prevent authenticated users from accessing login/register
  if ((pathname === '/login' || pathname === '/register') && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Prevent moderator authenticated users from accessing mod login
  if (pathname === '/moderator/login' && modToken) {
    return NextResponse.redirect(new URL('/moderator/dashboard', request.url))
  }

  return NextResponse.next()
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}