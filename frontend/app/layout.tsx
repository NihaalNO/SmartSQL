import type { Metadata } from "next"
import "./globals.css"
import { Toaster } from "react-hot-toast"
import { Suspense } from "react"

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: "SmartSQL - Text-to-SQL Analytics Portal",
  description: "Ask database questions in plain English.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/brand/favicon.svg",
    shortcut: "/brand/favicon.svg",
    apple: "/brand/apple-touch-icon.svg",
  },
  openGraph: {
    title: "SmartSQL",
    description: "AI-powered SQL generation platform for safe, schema-aware analytics.",
    images: [
      {
        url: "/brand/og-smartsql.svg",
        width: 1200,
        height: 630,
        alt: "SmartSQL AI-powered SQL generation platform",
      },
    ],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "var(--mint-surface-code)",
              color: "var(--mint-on-dark)",
              border: "1px solid var(--mint-hairline-dark)",
              borderRadius: "8px",
              fontSize: "14px",
            },
          }}
        />
        <Suspense fallback={null}>{children}</Suspense>
      </body>
    </html>
  )
}
