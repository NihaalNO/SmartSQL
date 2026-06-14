import type { Metadata } from "next"
import "./globals.css"
import { Toaster } from "react-hot-toast"
import { isModAuthenticated } from "@/lib/auth/session"

// Moderator route layout - ensures user is authenticated as moderator/admin
export const metadata: Metadata = {
  title: "SmartSQL – Moderator Panel",
  description: "Admin moderator panel routes"
}

export default function ModeratorLayout({ children }: { children: React.ReactNode }) {
  const isMod = isModAuthenticated()

  // Redirect to moderator login if not authenticated as moderator
  // Note: In App Router, we can't do redirects in layout,
  // so we rely on middleware for protection

  return (
    <html lang="en">
      <body>
        <Toaster position="top-right" />
        {children}
      </body>
    </html>
  )
}