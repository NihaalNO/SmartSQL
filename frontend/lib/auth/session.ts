import Cookies from 'js-cookie'

export interface AuthUser {
  user_id: number
  full_name: string
  email: string
  role: string
  access_token: string
}

// Session keys
const MAIN_TOKEN_KEY = 'token'
const MAIN_USER_KEY = 'user'
const MOD_TOKEN_KEY = 'mod_token'
const MOD_USER_KEY = 'mod_user'

/**
 * Main application authentication
 */
export function saveAuth(data: AuthUser) {
  if (!data || !data.access_token) {
    console.error('Invalid data passed to saveAuth:', data)
    return
  }

  try {
    // Set HTTP-only equivalent via cookie (JS accessible for SPA)
    Cookies.set(MAIN_TOKEN_KEY, data.access_token, {
      expires: 1, // 1 day
      path: '/',
      sameSite: 'lax'
    })

    // Store user data in sessionStorage (more secure than localStorage)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(MAIN_USER_KEY, JSON.stringify(data))
    }
  } catch (error) {
    console.error('Error saving auth data:', error)

    // Fallback to direct cookie setting
    try {
      const cookieString = `${MAIN_TOKEN_KEY}=${data.access_token}; expires=${new Date(Date.now() + 86400000).toUTCString()}; path=/; samesite=lax`
      document.cookie = cookieString

      if (typeof window !== 'undefined') {
        sessionStorage.setItem(MAIN_USER_KEY, JSON.stringify(data))
      }
    } catch (fallbackError) {
      console.error('Fallback auth save also failed:', fallbackError)
    }
  }
}

export function getAuthUser(): AuthUser | null {
  if (typeof window === 'undefined') return null

  const raw = sessionStorage.getItem(MAIN_USER_KEY)
  return raw ? JSON.parse(raw) : null
}

export function getAuthToken(): string | null {
  return Cookies.get(MAIN_TOKEN_KEY) ?? null
}

export function clearAuth() {
  if (typeof window !== 'undefined') {
    Cookies.remove(MAIN_TOKEN_KEY, { path: '/' })
    sessionStorage.removeItem(MAIN_USER_KEY)
  }
}

export function isAuthenticated(): boolean {
  return !!getAuthToken()
}

/**
 * Moderator/Admin panel authentication (separate from main app)
 */
export function saveModAuth(data: {
  access_token: string
  user_id: number
  full_name: string
  email: string
  role: string
}) {
  if (typeof window === 'undefined') return

  try {
    sessionStorage.setItem(MOD_TOKEN_KEY, data.access_token)
    sessionStorage.setItem(MOD_USER_KEY, JSON.stringify({
      user_id: data.user_id,
      full_name: data.full_name,
      email: data.email,
      role: data.role,
      token: data.access_token,
    }))
  } catch (error) {
    console.error('Error saving moderator auth:', error)
  }
}

export function getModUser() {
  if (typeof window === 'undefined') return null

  try {
    const raw = sessionStorage.getItem(MOD_USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function getModToken() {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(MOD_TOKEN_KEY)
}

export function clearModAuth() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(MOD_TOKEN_KEY)
  sessionStorage.removeItem(MOD_USER_KEY)
}

export function isModAuthenticated(): boolean {
  const user = getModUser()
  return !!user && user.role === 'admin'
}

/**
 * Redirect URL utilities
 */
export function getRedirectUrl(request: Request): string {
  try {
    const url = new URL(request.url)
    return url.searchParams.get('redirect') || '/dashboard'
  } catch {
    return '/dashboard'
  }
}

export function setRedirectUrl(redirect: string): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('redirect_after_login', redirect)
  }
}

export function getAndClearRedirectUrl(): string {
  if (typeof window === 'undefined') return '/dashboard'

  const redirect = sessionStorage.getItem('redirect_after_login') || '/dashboard'
  sessionStorage.removeItem('redirect_after_login')
  return redirect
}