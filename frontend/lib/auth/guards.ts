import { getAuthUser } from "./session"

export function requireAuth(): boolean {
  return !!getAuthUser()
}

export function getLoginRedirectUrl(currentPath: string): string {
  if (currentPath.includes("/login") || currentPath.includes("/register")) {
    return currentPath
  }

  return `/login?redirect=${encodeURIComponent(currentPath)}`
}
