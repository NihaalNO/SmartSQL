"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Search, History, BookmarkCheck, Zap, TrendingUp, Clock } from "lucide-react"
import { queryApi } from "@/lib/api"
import { getUser } from "@/lib/auth"
import type { QueryLog } from "@/types"
import { cn } from "@/lib/utils"
import { SmartSQLLogo } from "@/components/brand/SmartSQLLogo"

function StatCard({ label, value, icon, href, color }: { label: string; value: string | number; icon: React.ReactNode; href: string; color?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "mint-card block p-5 transition-colors duration-200 hover:bg-secondary"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 bg-secondary"
          style={{ color: color || "var(--mint-green-deep)" }}>
          {icon}
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground font-mono tracking-tight">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </Link>
  )
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false)
  const [logs, setLogs]   = useState<QueryLog[]>([])
  const [saved, setSaved] = useState<number>(0)

  const user = mounted ? getUser() : null

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    queryApi.history(10).then(setLogs).catch(() => {})
    queryApi.savedList().then((d) => setSaved(d.length)).catch(() => {})
  }, [mounted])

  const successCount = logs.filter((l) => l.execution_status === "success").length
  const avgTime = logs.length > 0 ? Math.round(logs.reduce((a, b) => a + (b.execution_time_ms || 0), 0) / logs.length) : 0

  const quickActions = [
    { href: "/query", icon: <Search size={17} />, label: "Run a Query", desc: "Ask anything in plain English", color: "var(--mint-green-deep)" },
    { href: "/saved", icon: <BookmarkCheck size={17} />, label: "Saved Queries", desc: "Revisit your favourite reports", color: "var(--mint-tag)" },
    { href: "/live-db", icon: <Zap size={17} />, label: "Live DB Mode", desc: "Connect a database for this session", color: "var(--mint-warn)" },
  ]

  return (
    <div className="mint-page">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-start gap-3">
          <SmartSQLLogo variant="icon" size={36} className="mt-1 hidden sm:block" />
          <div>
            <p className="mint-kicker">Analytics portal</p>
            <h1 className="mint-title mt-2">Dashboard</h1>
            <p className="mint-subtitle mt-2">
              {logs.length > 0 ? `${logs.length} queries in recent history` : "Welcome to SmartSQL"}
            </p>
          </div>
        </div>
        {user && (
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">{user.full_name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Queries Executed"  value={logs.length}    icon={<TrendingUp size={17} />}  href="/history" color="var(--mint-green-deep)" />
        <StatCard label="Successful"         value={successCount}   icon={<Clock size={17} />}       href="/history" color="var(--mint-green-deep)" />
        <StatCard label="Avg. Execution"     value={avgTime > 0 ? `${avgTime}ms` : "\u2014"}        icon={<Zap size={17} />} href="/history" color="var(--mint-tag)" />
        <StatCard label="Saved Queries"    value={saved}          icon={<BookmarkCheck size={17} />} href="/saved"   color="var(--mint-tag)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="mint-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
              <History size={14} className="text-muted-foreground" />
              Recent Activity
            </h2>
            <Link href="/history" className="text-xs font-medium text-foreground underline-offset-4 hover:underline">View all</Link>
          </div>
          {logs.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-muted-foreground">
                No queries yet &mdash;{" "}
                <Link href="/query" className="text-primary">run your first query</Link>
              </p>
            </div>
          ) : (
            <ul className="space-y-0.5">
              {logs.slice(0, 6).map((log) => (
                <li key={log.id} className="flex items-center gap-3 mint-property-row">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{
                    background: log.execution_status === "success" ? "var(--mint-green-deep)" :
                                log.execution_status === "blocked" ? "var(--mint-warn)" : "var(--mint-error)"
                  }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground/80 truncate">{log.natural_language_query}</p>
                    <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</p>
                  </div>
                  {log.row_count != null && (
                    <span className="text-xs text-muted-foreground shrink-0 font-mono">{log.row_count} rows</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mint-card p-6">
          <h2 className="text-sm font-medium text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-2">
            {quickActions.map(({ href, icon, label, desc, color }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors duration-200 hover:bg-secondary"
              >
                <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 bg-secondary"
                  style={{ color }}>
                  {icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
