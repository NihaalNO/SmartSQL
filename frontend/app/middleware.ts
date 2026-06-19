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
    '/moderator/dashboard'
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

  // Helper function to check if a redirect URL is safe (same origin or relative)
  function isSafeRedirect(redirect: string, requestUrl: URL): boolean {
    // Check for protocol-relative URLs
    if (redirect.startsWith('//')) {
      return false;
    }
    try {
      const url = new URL(redirect, requestUrl.origin);
      return url.origin === requestUrl.origin;
    } catch {
      // If it's a relative URL (no protocol), it's safe if it doesn't contain '://' (to avoid javascript: or data:)
      return !redirect.includes('://');
    }
  }

  // Redirect to login if trying to access protected route without auth
  if (isProtectedPath && !token) {
    let redirect = request.nextUrl.searchParams.get('redirect');
    if (!redirect) {
      redirect = pathname;
    }
    const safeRedirect = isSafeRedirect(redirect, request.nextUrl) ? redirect : '/dashboard';
    const url = new URL('/login', request.url)
    url.searchParams.set('redirect', safeRedirect)
    return NextResponse.redirect(url)
  }

  // Check email verification for protected paths (if authenticated)
  // Allow /dashboard even when unverified — dashboard can show its own banner
  if (isProtectedPath && token && pathname !== '/dashboard') {
    try {
      // Call our auth/me endpoint to get user data including email verification status
      const authResp = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (authResp.ok) {
        const userData = await authResp.json()
        // If user exists but email is not verified, redirect to email verification page
        if (userData && !userData.email_verified) {
          let redirect = request.nextUrl.searchParams.get('redirect');
          if (!redirect) {
            redirect = pathname;
          }
          const safeRedirect = isSafeRedirect(redirect, request.nextUrl) ? redirect : '/dashboard';
          const url = new URL('/verify-email-warning', request.url)
          url.searchParams.set('redirect', safeRedirect)
          return NextResponse.redirect(url)
        }
      }
      // If auth fails, they'll be caught by the !token check above and redirected to login
    } catch (error) {
      // If we can't check verification status, continue with auth check only
      console.warn('Could not verify email status:', error)
    }
  }

  // Redirect to moderator login if trying to access mod route without mod auth
  if (isModeratorPath && !modToken) {
    let redirect = request.nextUrl.searchParams.get('redirect');
    if (!redirect) {
      redirect = pathname;
    }
    const safeRedirect = isSafeRedirect(redirect, request.nextUrl) ? redirect : '/dashboard';
    const url = new URL('/moderator/login', request.url)
    url.searchParams.set('redirect', safeRedirect)
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
