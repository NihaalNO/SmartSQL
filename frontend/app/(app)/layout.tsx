"use client"

import { Suspense, useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import { getAuthToken } from "@/lib/auth/session"
import { SmartSQLLogo } from "@/components/brand/SmartSQLLogo"

const PROTECTED_PATHS = ["/dashboard", "/query", "/saved", "/live-db", "/history", "/settings"]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const isProtected = PROTECTED_PATHS.some(p => pathname.startsWith(p))
    if (isProtected && !getAuthToken()) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`)
    } else {
      setChecking(false)
    }
  }, [pathname, router])

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <SmartSQLLogo variant="icon" size={36} className="animate-pulse" />
          <p className="text-xs text-muted-foreground">Preparing SmartSQL...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background p-3">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto bg-background md:pl-3">
        <Suspense fallback={null}>{children}</Suspense>
      </main>
    </div>
  )
}
