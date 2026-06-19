import type { Metadata } from "next"
import "./globals.css"
import { Toaster } from "react-hot-toast"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "SmartSQL – Text-to-SQL Analytics Portal",
  description: "Ask database questions in plain English",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#18181B",
              color: "#F8FAFC",
              border: "1px solid rgba(255,255,255,0.08)",
            },
          }}
        />
        <Suspense fallback={null}>{children}</Suspense>
      </body>
    </html>
  )
}
