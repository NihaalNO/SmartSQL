"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Search, History, BookmarkCheck, Zap, TrendingUp, Clock, Shield, BarChart2, Eye } from "lucide-react"
import { queryApi } from "@/lib/api"
import { getUser, isAdmin, canSaveQueries, canUseLiveDb, getRole } from "@/lib/auth"
import type { QueryLog } from "@/types"

const ROLE_META: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  admin:   { icon: Shield,    label: "Admin",   color: "#EF4444" },
  analyst: { icon: BarChart2, label: "Analyst", color: "#14B8A6" },
  viewer:  { icon: Eye,       label: "Viewer",  color: "#60A5FA" },
}

function MetricCard({ label, value, icon, href, color }: { label: string; value: string | number; icon: React.ReactNode; href: string; color?: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg p-4 border transition-all duration-200 hover:border-white/10 block"
      style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(148,163,184,0.08)" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = `${color || "#14B8A6"}30`; e.currentTarget.style.background = `${color || "#14B8A6"}05` }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(148,163,184,0.08)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)" }}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${color || "#14B8A6"}15`, color: color || "#14B8A6" }}>
          {icon}
        </div>
        <div>
          <p className="text-lg font-bold text-[#F8FAFC]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{value}</p>
          <p className="text-xs" style={{ color: "#64748B" }}>{label}</p>
        </div>
      </div>
    </Link>
  )
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false)
  const [logs, setLogs]   = useState<QueryLog[]>([])
  const [saved, setSaved] = useState<number>(0)

  const user    = mounted ? getUser()        : null
  const role    = mounted ? getRole()        : ""
  const canSave = mounted ? canSaveQueries() : false
  const canLive = mounted ? canUseLiveDb()   : false
  const admin   = mounted ? isAdmin()        : false

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    queryApi.history(10).then(setLogs).catch(() => {})
    if (canSave) queryApi.savedList().then((d) => setSaved(d.length)).catch(() => {})
  }, [mounted])

  const successCount = logs.filter((l) => l.execution_status === "success").length
  const avgTime = logs.length > 0 ? Math.round(logs.reduce((a, b) => a + (b.execution_time_ms || 0), 0) / logs.length) : 0

  const quickActions = [
    { href: "/query",   icon: <Search size={17} />,       label: "Run a Query",    desc: "Ask anything in plain English", show: true,      color: "#14B8A6" },
    { href: "/saved",   icon: <BookmarkCheck size={17} />, label: "Saved Queries",  desc: "Revisit your favourite reports", show: canSave,  color: "#22D3EE" },
    { href: "/live-db", icon: <Zap size={17} />,           label: "Live DB Mode",   desc: "Connect a Supabase database",   show: canLive,  color: "#60A5FA" },
  ].filter((a) => a.show)

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-[#F8FAFC]">Dashboard</h1>
          <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>
            {logs.length > 0 ? `${logs.length} queries in recent history` : "Welcome to SmartSQL"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(() => {
            const meta = role ? ROLE_META[role] : null
            if (!meta) return null
            const Icon = meta.icon
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium" style={{
                background: `${meta.color}15`,
                color: meta.color,
              }}>
                <Icon size={11} />
                {meta.label}
              </span>
            )
          })()}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Queries Executed"  value={logs.length}    icon={<TrendingUp size={17} />}  href="/history" color="#14B8A6" />
        <MetricCard label="Successful"         value={successCount}   icon={<Clock size={17} />}       href="/history" color="#22C55E" />
        <MetricCard label="Avg. Execution"     value={avgTime > 0 ? `${avgTime}ms` : "—"}    icon={<Zap size={17} />} href="/history" color="#22D3EE" />
        {canSave ? (
          <MetricCard label="Saved Queries"    value={saved}          icon={<BookmarkCheck size={17} />} href="/saved"   color="#60A5FA" />
        ) : (
          <MetricCard label="Queries Today"    value={logs.filter(l => {
            const today = new Date(); const d = new Date(l.created_at)
            return d.getDate() === today.getDate() && d.getMonth() === today.getMonth()
          }).length} icon={<Clock size={17} />} href="/history" color="#64748B" />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border p-4" style={{ borderColor: "rgba(148,163,184,0.08)", background: "rgba(255,255,255,0.02)" }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#F8FAFC] flex items-center gap-2">
              <History size={14} /> Recent Activity
            </h2>
            <Link href="/history" className="text-xs" style={{ color: "#14B8A6" }}>View all</Link>
          </div>
          {logs.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm" style={{ color: "#64748B" }}>
                No queries yet —{" "}
                <Link href="/query" style={{ color: "#14B8A6" }}>run your first query</Link>
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {logs.slice(0, 6).map((log) => (
                <li key={log.id} className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{
                    background: log.execution_status === "success" ? "#22C55E" :
                                log.execution_status === "blocked" ? "#F59E0B" : "#EF4444"
                  }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#CBD5E1] truncate">{log.natural_language_query}</p>
                    <p className="text-xs" style={{ color: "#64748B" }}>{new Date(log.created_at).toLocaleString()}</p>
                  </div>
                  {log.row_count != null && (
                    <span className="text-xs shrink-0" style={{ color: "#64748B" }}>{log.row_count} rows</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border p-4" style={{ borderColor: "rgba(148,163,184,0.08)", background: "rgba(255,255,255,0.02)" }}>
          <h2 className="text-sm font-semibold text-[#F8FAFC] mb-3">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-2">
            {quickActions.map(({ href, icon, label, desc, color }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-lg p-3 border transition-all duration-200"
                style={{ borderColor: "rgba(148,163,184,0.08)" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${color}30`; e.currentTarget.style.background = `${color}05` }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(148,163,184,0.08)"; e.currentTarget.style.background = "transparent" }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${color}15`, color }}>
                  {icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-[#CBD5E1]">{label}</p>
                  <p className="text-xs" style={{ color: "#64748B" }}>{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {!canSave && !admin && (
        <div className="rounded-lg border p-5 flex items-center gap-4" style={{ borderColor: "rgba(96,165,250,0.15)", background: "rgba(96,165,250,0.04)" }}>
          <Eye size={24} style={{ color: "#60A5FA", opacity: 0.6 }} />
          <div className="flex-1">
            <p className="text-sm font-medium text-[#CBD5E1]">Read-Only Access</p>
            <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>
              Browse query history and shared results. Contact an admin to request analyst access.
            </p>
          </div>
          <Link href="/history" className="px-3 py-1.5 rounded text-xs font-medium text-white shrink-0" style={{ background: "#60A5FA" }}>
            Browse History
          </Link>
        </div>
      )}
    </div>
  )
}
