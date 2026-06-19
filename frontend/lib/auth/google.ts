const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"

export function getGoogleRedirectUri(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || `${window.location.origin}/auth/callback`
}

export function startSmartSqlGoogleAuth(): boolean {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  if (!clientId) {
    return false
  }

  const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI

  if (!redirectUri) {
    return false
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
  })

  window.location.assign(`${GOOGLE_AUTH_URL}?${params.toString()}`)
  return true
}
