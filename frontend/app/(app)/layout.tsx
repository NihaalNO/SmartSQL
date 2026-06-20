"use client"

import { Suspense, useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import { getAuthToken } from "@/lib/auth/session"

const PROTECTED_PATHS = ["/dashboard", "/query", "/saved", "/live-db", "/history"]

// Client-side auth guard — no persisted cookies, only sessionStorage (dies on tab close)
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
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#050816" }}>
        <div className="text-center">
          <div
            className="w-5 h-5 rounded-full border-2 animate-spin mx-auto"
            style={{ borderColor: "rgba(20,184,166,0.3)", borderTopColor: "#14B8A6" }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-background">
        <Suspense fallback={null}>{children}</Suspense>
      </main>
    </div>
  )
}
