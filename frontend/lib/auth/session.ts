export interface AuthUser {
  user_id: number
  full_name: string
  email: string
  access_token: string
  email_verified: boolean
  created_at?: string
  updated_at?: string | null
  avatar_url?: string | null
}

const MAIN_USER_KEY = "user"

export function saveAuth(data: AuthUser) {
  if (!data || !data.access_token) return
  if (typeof window !== "undefined") {
    sessionStorage.setItem(MAIN_USER_KEY, JSON.stringify(data))
  }
}

export function getAuthUser(): AuthUser | null {
  if (typeof window === "undefined") return null
  const raw = sessionStorage.getItem(MAIN_USER_KEY)
  return raw ? JSON.parse(raw) : null
}

export const getCurrentUser = getAuthUser

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null
  const raw = sessionStorage.getItem(MAIN_USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw).access_token
  } catch {
    return null
  }
}

export function clearAuth() {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(MAIN_USER_KEY)
  }
}

export function isAuthenticated(): boolean {
  return !!getAuthToken()
}

export function requireAuth(): boolean {
  return isAuthenticated()
}

export function getRedirectUrl(request: Request): string {
  try {
    const url = new URL(request.url)
    return url.searchParams.get("redirect") || "/dashboard"
  } catch {
    return "/dashboard"
  }
}

export function setRedirectUrl(redirect: string): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem("redirect_after_login", redirect)
  }
}

export function getAndClearRedirectUrl(): string {
  if (typeof window === "undefined") return "/dashboard"

  const redirect = sessionStorage.getItem("redirect_after_login") || "/dashboard"
  sessionStorage.removeItem("redirect_after_login")
  return redirect
}
