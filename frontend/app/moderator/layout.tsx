"use client"
import { useEffect, useState, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { isModLoggedIn } from "@/lib/modAuth"

export default function ModeratorLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  // Track the last pathname we resolved auth for — prevents the spinner
  // from re-appearing on every router-object reference change
  const resolvedPath = useRef<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Skip if we already resolved auth for this exact pathname
    if (resolvedPath.current === pathname) return

    const isPublic = pathname === "/moderator" || pathname === "/moderator/login"
    const loggedIn = isModLoggedIn()

    if (!loggedIn && !isPublic) {
      resolvedPath.current = null  // reset so next visit re-checks
      router.replace("/moderator/login?expired=1")
      return
    }

    if (loggedIn && isPublic) {
      resolvedPath.current = null
      router.replace("/moderator/dashboard")
      return
    }

    // Auth check passed — mark this path as resolved and show content
    resolvedPath.current = pathname
    setReady(true)
  // router intentionally omitted from deps — including it would cause
  // the effect to re-run on every router.replace() call, re-hiding content
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  if (!ready) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#0f1117" }}
      >
        <div className="w-5 h-5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: "#0f1117", color: "#e2e8f0", fontFamily: "Inter, sans-serif" }}
    >
      {children}
    </div>
  )
}
