export interface AuthUser {
  user_id: number
  full_name: string
  email: string
  role: string
  access_token: string
  email_verified: boolean
}

const MAIN_USER_KEY = 'user'
const MOD_USER_KEY = 'mod_user'

/**
 * Main application authentication — sessionStorage only (cleared on tab close)
 */
export function saveAuth(data: AuthUser) {
  if (!data || !data.access_token) return
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(MAIN_USER_KEY, JSON.stringify(data))
  }
}

export function getAuthUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem(MAIN_USER_KEY)
  return raw ? JSON.parse(raw) : null
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem(MAIN_USER_KEY)
  if (!raw) return null
  try { return JSON.parse(raw).access_token } catch { return null }
}

export function clearAuth() {
  if (typeof window !== 'undefined') {
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
  const user = getModUser()
  return user?.token ?? null
}

export function clearModAuth() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(MOD_USER_KEY)
  }
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
