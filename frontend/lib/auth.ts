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
