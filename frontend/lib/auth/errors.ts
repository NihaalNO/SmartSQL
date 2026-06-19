const PROJECT_NAME = "SmartSQL"

export function getAuthDisplayError(message?: string | null): string {
  if (!message) {
    return `${PROJECT_NAME} authentication failed. Please try again.`
  }

  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  let displayMessage = message

  if (configuredUrl) {
    displayMessage = displayMessage.split(configuredUrl).join(PROJECT_NAME)
  }

  return displayMessage.replace(/https:\/\/[a-z0-9-]+\.supabase\.co/gi, PROJECT_NAME)
}
