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

export function saveAuth(data: AuthUser) {
  if (!data || !data.access_token) return
  try {
    sessionStorage.setItem("user", JSON.stringify(data))
  } catch (storageError) {
    console.error("Unable to persist auth session", storageError)
  }
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null
  const raw = sessionStorage.getItem("user")
  return raw ? JSON.parse(raw) : null
}

export const getCurrentUser = getUser

export function logout() {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("user")
    window.location.href = "/login"
  }
}

export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false
  const raw = sessionStorage.getItem("user")
  if (!raw) return false
  try {
    return !!JSON.parse(raw).access_token
  } catch {
    return false
  }
}

export const isAuthenticated = isLoggedIn
export const requireAuth = isLoggedIn

export function isEmailVerified(): boolean {
  const user = getUser()
  return user?.email_verified ?? false
}
