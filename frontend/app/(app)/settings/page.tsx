"use client"

import { useEffect, useState } from "react"
import { Database, Shield, UserRound } from "lucide-react"
import { getUser, getRole, canSaveQueries, canUseLiveDb } from "@/lib/auth"
import { Badge } from "@/components/ui/badge"

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const user = mounted ? getUser() : null
  const role = mounted ? getRole() : ""

  return (
    <div className="mint-page-narrow">
      <div>
        <p className="mint-kicker">Workspace</p>
        <h1 className="mint-title mt-2">Settings</h1>
        <p className="mint-subtitle mt-2">
          Review your account, access level, and SmartSQL capabilities.
        </p>
      </div>

      <section className="mint-card p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <UserRound size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">Profile</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Authentication is managed through your SmartSQL session.
            </p>
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
            <span className="mint-kicker">Role</span>
            <div><Badge variant="secondary">{role || "viewer"}</Badge></div>
          </div>
        </div>
      </section>

      <section className="mint-card p-6">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-[var(--mint-green-deep)]" />
          <h2 className="text-lg font-semibold">Capabilities</h2>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-secondary p-4">
            <Database size={16} className="text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">Saved queries</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {mounted && canSaveQueries() ? "Enabled for this role." : "Available to analysts."}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-secondary p-4">
            <Database size={16} className="text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">Live DB mode</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {mounted && canUseLiveDb() ? "Enabled for this role." : "Available to analysts."}
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
