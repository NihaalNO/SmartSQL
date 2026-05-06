import Cookies from "js-cookie"

export interface AuthUser {
  user_id: number
  full_name: string
  email: string
  role: string
  access_token: string
}

export function saveAuth(data: AuthUser) {
  Cookies.set("token", data.access_token, { expires: 1 })
  if (typeof window !== "undefined") {
    sessionStorage.setItem("user", JSON.stringify(data))
  }
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null
  const raw = sessionStorage.getItem("user")
  return raw ? JSON.parse(raw) : null
}

export function logout() {
  Cookies.remove("token")
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("user")
    window.location.href = "/login"
  }
}

export function isLoggedIn(): boolean {
  return !!Cookies.get("token")
}

export function getRole(): string {
  return getUser()?.role ?? ""
}

export function hasRole(...roles: string[]): boolean {
  return roles.includes(getRole())
}

// Convenience shorthands
export const canSaveQueries = () => hasRole("admin", "analyst")
export const canUseLiveDb   = () => hasRole("admin", "analyst")
export const isAdmin        = () => hasRole("admin")
