import { getAuthUser, isModAuthenticated } from "./session";

/**
 * Check if user is authenticated for main application
 */
export function requireAuth(): boolean {
  const user = getAuthUser();
  return !!user;
}

/**
 * Check if user is authenticated as moderator/admin
 */
export function requireModAuth(): boolean {
  return isModAuthenticated();
}

/**
 * Check if user has specific role (main app)
 */
export function requireRole(role: string): boolean {
  const user = getAuthUser();
  return !!user && user.role === role;
}

/**
 * Check if user has any of the specified roles (main app)
 */
export function requireAnyRole(roles: string[]): boolean {
  const user = getAuthUser();
  return !!user && roles.includes(user.role);
}

/**
 * Get redirect URL for login protection
 */
export function getLoginRedirectUrl(currentPath: string): string {
  // Don't redirect if already on login or register pages
  if (currentPath.includes('/login') || currentPath.includes('/register')) {
    return currentPath;
  }

  // For moderator paths, redirect to moderator login
  if (currentPath.startsWith('/moderator')) {
    return `/moderator/login?redirect=${encodeURIComponent(currentPath)}`;
  }

  // For main app paths, redirect to main login
  return `/login?redirect=${encodeURIComponent(currentPath)}`;
}