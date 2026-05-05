"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Search, History, BookmarkCheck, Zap, TrendingUp, Clock } from "lucide-react"
import { queryApi, schemaApi } from "@/lib/api"
import { getUser } from "@/lib/auth"
import type { QueryLog, TableSchema } from "@/types"

function StatCard({ label, value, icon, href }: { label: string; value: string | number; icon: React.ReactNode; href: string }) {
  return (
    <Link href={href} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow flex items-center gap-4">
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

export default function DashboardPage() {
  const [logs, setLogs] = useState<QueryLog[]>([])
  const [saved, setSaved] = useState<number>(0)
  const [tables, setTables] = useState<TableSchema[]>([])
  const user = getUser()

  useEffect(() => {
    queryApi.history(10).then(setLogs).catch(() => {})
    queryApi.savedList().then((d) => setSaved(d.length)).catch(() => {})
    schemaApi.tables().then((d) => setTables(d.tables)).catch(() => {})
  }, [])

  const successCount = logs.filter((l) => l.execution_status === "success").length

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.full_name?.split(" ")[0]} 👋</h1>
        <p className="text-gray-500 text-sm mt-1">Here&apos;s an overview of your analytics portal</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Recent Queries" value={logs.length} icon={<TrendingUp size={20} />} href="/history" />
        <StatCard label="Successful" value={successCount} icon={<Clock size={20} />} href="/history" />
        <StatCard label="Saved Queries" value={saved} icon={<BookmarkCheck size={20} />} href="/saved" />
        <StatCard label="DB Tables" value={tables.length} icon={<Search size={20} />} href="/query" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent activity */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <History size={16} /> Recent Activity
            </h2>
            <Link href="/history" className="text-xs text-brand-600 hover:underline">View all</Link>
          </div>
          {logs.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No queries yet — <Link href="/query" className="text-brand-600">run your first query</Link></p>
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

        {/* Schema explorer */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Search size={16} /> Schema Explorer
          </h2>
          {tables.length === 0 ? (
            <p className="text-sm text-gray-400">Loading schema…</p>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {tables.map((t) => (
                <li key={t.table} className="border border-gray-100 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    {t.table}
                  </div>
                  <div className="px-3 py-2 flex flex-wrap gap-x-4 gap-y-1">
                    {t.columns.map((c) => (
                      <span key={c.name} className="text-xs text-gray-500">
                        <span className="font-medium text-gray-700">{c.name}</span>
                        {" "}<span className="text-gray-400">{c.type}</span>
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { href: "/query", icon: <Search size={20} />, label: "Run a Query", desc: "Ask anything in plain English" },
          { href: "/saved", icon: <BookmarkCheck size={20} />, label: "Saved Queries", desc: "Revisit your favorite reports" },
          { href: "/live-db", icon: <Zap size={20} />, label: "Live DB Mode", desc: "Connect a Supabase database" },
        ].map(({ href, icon, label, desc }) => (
          <Link key={href} href={href} className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-brand-300 transition-all">
            <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 shrink-0">{icon}</div>
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
