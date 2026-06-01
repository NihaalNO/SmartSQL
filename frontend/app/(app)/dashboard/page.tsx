"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Search, History, BookmarkCheck, Zap, TrendingUp, Clock, Shield, BarChart2, Eye } from "lucide-react"
import { queryApi } from "@/lib/api"
import { getUser, isAdmin, canSaveQueries, canUseLiveDb, getRole } from "@/lib/auth"
import type { QueryLog } from "@/types"

// ---------------------------------------------------------------------------
// Role badge
// ---------------------------------------------------------------------------
const ROLE_META: Record<string, { icon: React.ElementType; label: string; color: string; bg: string }> = {
  admin:   { icon: Shield,    label: "Admin",   color: "#b91c1c", bg: "rgba(185,28,28,0.10)" },
  analyst: { icon: BarChart2, label: "Analyst", color: "#004ac6", bg: "rgba(0,74,198,0.10)"  },
  viewer:  { icon: Eye,       label: "Viewer",  color: "#047857", bg: "rgba(4,120,87,0.10)"  },
}

function RoleBadge({ role }: { role: string }) {
  const meta = ROLE_META[role] ?? ROLE_META.viewer
  const Icon = meta.icon
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ color: meta.color, backgroundColor: meta.bg }}
    >
      <Icon size={12} />
      {meta.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------
function StatCard({
  label, value, icon, href,
}: { label: string; value: string | number; icon: React.ReactNode; href: string }) {
  return (
    <Link
      href={href}
      className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow flex items-center gap-4"
    >
      <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function DashboardPage() {
  const [mounted, setMounted] = useState(false)
  const [logs, setLogs]   = useState<QueryLog[]>([])
  const [saved, setSaved] = useState<number>(0)

  // Read auth state only after hydration — sessionStorage is unavailable on the server
  const user    = mounted ? getUser()        : null
  const role    = mounted ? getRole()        : ""
  const canSave = mounted ? canSaveQueries() : false
  const canLive = mounted ? canUseLiveDb()   : false
  const admin   = mounted ? isAdmin()        : false

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    queryApi.history(10).then(setLogs).catch(() => {})
    if (canSave) queryApi.savedList().then((d) => setSaved(d.length)).catch(() => {})
  }, [mounted]) // eslint-disable-line react-hooks/exhaustive-deps

  const successCount = logs.filter((l) => l.execution_status === "success").length

  // Quick actions visible per role
  const quickActions = [
    { href: "/query",   icon: <Search size={20} />,       label: "Run a Query",    desc: "Ask anything in plain English", show: true      },
    { href: "/saved",   icon: <BookmarkCheck size={20} />, label: "Saved Queries",  desc: "Revisit your favourite reports", show: canSave  },
    { href: "/live-db", icon: <Zap size={20} />,           label: "Live DB Mode",   desc: "Connect a Supabase database",   show: canLive  },
  ].filter((a) => a.show)

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.full_name?.split(" ")[0]} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Here&apos;s an overview of your analytics portal
          </p>
        </div>
        <RoleBadge role={role} />
      </div>

      {/* Stats — shown based on what the role can access */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Recent Queries" value={logs.length}    icon={<TrendingUp size={20} />}    href="/history" />
        <StatCard label="Successful"     value={successCount}   icon={<Clock size={20} />}         href="/history" />
        {canSave && (
          <StatCard label="Saved Queries" value={saved}         icon={<BookmarkCheck size={20} />} href="/saved" />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent activity — all roles */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <History size={16} /> Recent Activity
            </h2>
            <Link href="/history" className="text-xs text-brand-600 hover:underline">View all</Link>
          </div>
          {logs.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">
              No queries yet —{" "}
              <Link href="/query" className="text-brand-600">run your first query</Link>
            </p>
          ) : (
            <ul className="space-y-2">
              {logs.slice(0, 5).map((log) => (
                <li key={log.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                    log.execution_status === "success" ? "bg-green-500" :
                    log.execution_status === "blocked" ? "bg-yellow-500" : "bg-red-500"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">{log.natural_language_query}</p>
                    <p className="text-xs text-gray-400">{new Date(log.created_at).toLocaleString()}</p>
                  </div>
                  {log.row_count != null && (
                    <span className="text-xs text-gray-400 shrink-0">{log.row_count} rows</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Viewer panel */}
        {!canSave && !admin && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col justify-center items-center text-center gap-3">
            <Eye size={32} className="text-emerald-600 opacity-60" />
            <div>
              <p className="font-semibold text-gray-700">Read-Only Access</p>
              <p className="text-sm text-gray-400 mt-1">
                You can browse query history and view shared results.
                Contact an admin to request analyst access.
              </p>
            </div>
            <Link
              href="/history"
              className="mt-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: "#047857" }}
            >
              Browse History
            </Link>
          </div>
        )}
      </div>

      {/* Quick actions — filtered by role */}
      <div className={`grid grid-cols-1 sm:grid-cols-${quickActions.length} gap-4`}>
        {quickActions.map(({ href, icon, label, desc }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-brand-300 transition-all"
          >
            <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 shrink-0">
              {icon}
            </div>
            <div>
              <p className="font-medium text-gray-800 text-sm">{label}</p>
              <p className="text-xs text-gray-500">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
