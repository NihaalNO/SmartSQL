import Cookies from "js-cookie"

export interface AuthUser {
  user_id: number
  full_name: string
  email: string
  role: string
  access_token: string
  email_verified: boolean
}

export function saveAuth(data: AuthUser) {
  if (!data || !data.access_token) {
    return;
  }

  try {
    Cookies.set("token", data.access_token, {
      expires: 1,
      path: "/",
      sameSite: "lax"
    });
  } catch (cookieError) {
    try {
      const cookieString = `token=${data.access_token}; expires=${new Date(Date.now() + 86400000).toUTCString()}; path=/; samesite=lax`;
      document.cookie = cookieString;
    } catch (manualError) {
      console.error("Unable to persist auth cookie", manualError);
    }
  }

  try {
    sessionStorage.setItem("user", JSON.stringify(data));
  } catch (storageError) {
    console.error("Unable to persist auth session", storageError);
  }
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null
  const raw = sessionStorage.getItem("user")
  return raw ? JSON.parse(raw) : null
}

export function logout() {
  Cookies.remove("token", { path: "/" })
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("user")
    window.location.href = "/login"
  }
}

export function isLoggedIn(): boolean {
  return !!Cookies.get("token")
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
