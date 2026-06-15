import Cookies from "js-cookie"

console.log('lib/auth.ts loaded');
console.log('Cookies import:', typeof Cookies);

export interface AuthUser {
  user_id: number
  full_name: string
  email: string
  role: string
  access_token: string
  email_verified: boolean
}

export function saveAuth(data: AuthUser) {
  console.error('!!! SAVEAUTH FUNCTION ENTERED !!!');
  console.error('saveAuth called with:', JSON.stringify(data));

  if (!data || !data.access_token) {
    console.error('Invalid data passed to saveAuth:', data);
    return;
  }

  try {
    console.error('About to set cookie with Cookies.set');
    Cookies.set("token", data.access_token, {
      expires: 1,
      path: "/",
      sameSite: "lax"
    });
    console.error('Cookie set via Cookies.set');

    // Verify
    const cookieCheck = Cookies.get("token");
    console.error('Cookie verification:', cookieCheck ? 'SET' : 'NOT SET', 'value length:', cookieCheck ? cookieCheck.length : 0);
  } catch (cookieError) {
    console.error('Error in Cookies.set:', cookieError);

    // Fallback
    try {
      const cookieString = `token=${data.access_token}; expires=${new Date(Date.now() + 86400000).toUTCString()}; path=/; samesite=lax`;
      console.error('Setting cookie manually:', cookieString);
      document.cookie = cookieString;

      // Verify manual setting
      const manualCheck = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];
      console.error('Manual cookie verification:', manualCheck ? 'SET' : 'NOT SET');
    } catch (manualError) {
      console.error('Error in manual cookie setting:', manualError);
    }
  }

  try {
    console.error('About to set sessionStorage');
    sessionStorage.setItem("user", JSON.stringify(data));
    console.error('sessionStorage set successfully');

    // Verify
    const storageCheck = sessionStorage.getItem("user");
    console.error('sessionStorage verification:', storageCheck ? 'SET' : 'NOT SET');
  } catch (storageError) {
    console.error('Error setting sessionStorage:', storageError);
  }
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null
  const raw = sessionStorage.getItem("user")
  return raw ? JSON.parse(raw) : null
}

export function logout() {
  console.log('logout called');
  Cookies.remove("token", { path: "/" })
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("user")
    window.location.href = "/login"
  }
}

export function isLoggedIn(): boolean {
  const result = !!Cookies.get("token")
  console.log('isLoggedIn:', result, 'cookie:', Cookies.get("token"))
  return result
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