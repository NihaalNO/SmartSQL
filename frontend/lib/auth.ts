export interface AuthUser {
  user_id: number
  full_name: string
  email: string
  role: string
  access_token: string
  email_verified: boolean
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
  try { return !!JSON.parse(raw).access_token } catch { return false }
}

export function isEmailVerified(): boolean {
  const user = getUser()
  return user?.email_verified ?? false
}

export function getRole(): string {
  return getUser()?.role ?? ""
}

export function hasRole(...roles: string[]): boolean {
  return roles.includes(getRole())
}

// Convenience shorthands — admin has its own panel, not the main app
export const canSaveQueries = () => hasRole("analyst")
export const canUseLiveDb   = () => hasRole("analyst")
export const isAdmin        = () => hasRole("admin")
