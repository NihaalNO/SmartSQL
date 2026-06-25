"use client"

import { useEffect, useState } from "react"
import { CalendarDays, Database, History, UserRound, Zap } from "lucide-react"
import { getUser } from "@/lib/auth"

function formatDate(value?: string | null) {
  if (!value) return "Unavailable"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Unavailable"
  return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
}

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const user = mounted ? getUser() : null

  return (
    <div className="mint-page-narrow">
      <div>
        <p className="mint-kicker">Workspace</p>
        <h1 className="mint-title mt-2">Settings</h1>
        <p className="mint-subtitle mt-2">Review your account profile and SmartSQL workspace access.</p>
      </div>

      <section className="mint-card p-6">
        <div className="flex items-start gap-3">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <UserRound size={18} />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">Profile</h2>
            <p className="mt-1 text-sm text-muted-foreground">Authentication is managed through your SmartSQL session.</p>
          </div>
        </div>

        <div className="mt-6 divide-y divide-border">
          <div className="mint-property-row grid gap-2 sm:grid-cols-[180px_1fr]">
            <span className="mint-kicker">Name</span>
            <span className="text-sm text-foreground">{user?.full_name ?? "Unavailable"}</span>
          </div>
          <div className="mint-property-row grid gap-2 sm:grid-cols-[180px_1fr]">
            <span className="mint-kicker">Email</span>
            <span className="text-sm text-foreground">{user?.email ?? "Unavailable"}</span>
          </div>
          <div className="mint-property-row grid gap-2 sm:grid-cols-[180px_1fr]">
            <span className="mint-kicker">Created</span>
            <span className="text-sm text-foreground">{formatDate(user?.created_at)}</span>
          </div>
        </div>
      </section>

      <section className="mint-card p-6">
        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="text-[var(--mint-green-deep)]" />
          <h2 className="text-lg font-semibold">Workspace Access</h2>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            { icon: Database, title: "Saved queries", copy: "Create, revisit, and manage your query library." },
            { icon: Zap, title: "Live DB mode", copy: "Connect external databases for the current session." },
            { icon: History, title: "History", copy: "Review your query activity and results." },
          ].map(({ icon: Icon, title, copy }) => (
            <div key={title} className="rounded-lg border border-border bg-secondary p-4">
              <Icon size={16} className="text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">{title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{copy}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
