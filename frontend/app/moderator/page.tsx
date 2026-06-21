"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Lock } from "lucide-react"
import { isModLoggedIn } from "@/lib/modAuth"
import { SmartSQLLogo } from "@/components/brand/SmartSQLLogo"

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
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-[var(--mint-surface-code)]">
      <SmartSQLLogo tone="dark" size={48} className="mb-3 text-lg" />
      <p className="text-sm mb-10 text-[var(--mint-on-dark-muted)]">Moderator Panel</p>

      <a
        href="/moderator/login"
        className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-white/90"
      >
        <Lock size={14} />
        Sign in to panel
        <ArrowRight size={14} />
      </a>

      <p className="absolute bottom-6 text-xs text-[var(--mint-on-dark-muted)]">
        Restricted access &mdash; authorised personnel only
      </p>
    </div>
  )
}
