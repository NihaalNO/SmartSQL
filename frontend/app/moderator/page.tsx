"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { isModLoggedIn } from "@/lib/modAuth"

export default function ModeratorRoot() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (isModLoggedIn()) {
      router.replace("/moderator/dashboard")
    } else {
      setChecking(false)
    }
  }, [router])

  // Show nothing while redirecting to dashboard
  if (checking) return null

  // Minimal landing shown only to unauthenticated visitors
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: "#0f1117" }}
    >
      {/* Lock icon */}
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: "rgba(0,74,198,0.10)", border: "1px solid rgba(0,74,198,0.20)" }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
          stroke="#b4c5ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>

      {/* Wordmark */}
      <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ color: "#f1f5f9" }}>
        SmartSQL
      </h1>
      <p className="text-sm mb-10" style={{ color: "#475569" }}>
        Moderator Panel
      </p>

      {/* CTA */}
      <a
        href="/moderator/login"
        className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all active:scale-95"
        style={{ background: "#004ac6", color: "#fff" }}
        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "#0052e0")}
        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "#004ac6")}
      >
        Sign in to panel
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"/>
          <polyline points="12 5 19 12 12 19"/>
        </svg>
      </a>

      {/* Subtle footer note */}
      <p className="absolute bottom-6 text-xs" style={{ color: "#1e293b" }}>
        Restricted access — authorised personnel only
      </p>
    </div>
  )
}
