/**
 * Moderator panel auth helpers — stored separately from the main app session
 * so admin panel login/logout never affects regular user sessions.
 */

const MOD_TOKEN_KEY = "mod_token"
const MOD_USER_KEY  = "mod_user"

export interface ModUser {
  user_id:   number
  full_name: string
  email:     string
  role:      string
  token:     string
}

export function saveModAuth(data: {
  access_token: string
  user_id:      number
  full_name:    string
  email:        string
  role:         string
}) {
  if (typeof window === "undefined") return
  sessionStorage.setItem(MOD_TOKEN_KEY, data.access_token)
  sessionStorage.setItem(MOD_USER_KEY, JSON.stringify({
    user_id:   data.user_id,
    full_name: data.full_name,
    email:     data.email,
    role:      data.role,
    token:     data.access_token,
  }))
}

export function getModUser(): ModUser | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(MOD_USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function getModToken(): string | null {
  if (typeof window === "undefined") return null
  return sessionStorage.getItem(MOD_TOKEN_KEY)
}

export function isModLoggedIn(): boolean {
  const user = getModUser()
  return !!user && user.role === "admin"
}

export function modLogout() {
  if (typeof window === "undefined") return
  sessionStorage.removeItem(MOD_TOKEN_KEY)
  sessionStorage.removeItem(MOD_USER_KEY)
}

/** True when a session existed but has since been cleared (e.g. tab closed, token expired). */
export function hadModSession(): boolean {
  if (typeof window === "undefined") return false
  // sessionStorage is tab-scoped — if the key is gone now it was never set in this tab
  return sessionStorage.getItem(MOD_USER_KEY) !== null
}
