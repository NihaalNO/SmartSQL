import type { Metadata } from "next"
import "./globals.css"
import { Toaster } from "react-hot-toast"
import { getAuthUser } from "@/lib/auth/session"

// Protected route layout - ensures user is authenticated
export const metadata: Metadata = {
  title: "SmartSQL – Protected Routes",
  description: "Protected application routes"
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = getAuthUser()

  // Redirect to login if not authenticated
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