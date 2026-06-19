"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Lock, ArrowRight, Database } from "lucide-react"
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

  if (checking) return null

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "#0A1020" }}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 surface-1" style={{ background: "rgba(20,184,166,0.1)", borderColor: "rgba(20,184,166,0.25)" }}>
        <Database size={28} style={{ color: "#14B8A6" }} />
      </div>

      <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ color: "#F8FAFC", fontFamily: "'Fira Code', 'JetBrains Mono', monospace" }}>
        SmartSQL
      </h1>
      <p className="text-sm mb-10" style={{ color: "#64748B" }}>Moderator Panel</p>

      <a href="/moderator/login"
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all active:scale-95 text-white"
        style={{ background: "#14B8A6" }}>
        <Lock size={14} />
        Sign in to panel
        <ArrowRight size={14} />
      </a>

      <p className="absolute bottom-6 text-xs" style={{ color: "#334155" }}>Restricted access — authorised personnel only</p>
    </div>
  )
}
