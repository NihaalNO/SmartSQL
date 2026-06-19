"use client"
import { useEffect, useState } from "react"
import { Clock, CheckCircle, XCircle, ShieldX } from "lucide-react"
import { queryApi } from "@/lib/api"
import type { QueryLog } from "@/types"

const STATUS_ICON: Record<string, React.ReactNode> = {
  success: <CheckCircle size={14} style={{ color: "#22C55E" }} />,
  failed: <XCircle size={14} style={{ color: "#EF4444" }} />,
  blocked: <ShieldX size={14} style={{ color: "#F59E0B" }} />,
}

const STATUS_COLOR: Record<string, string> = {
  success: "#22C55E",
  failed: "#EF4444",
  blocked: "#F59E0B",
}

export default function HistoryPage() {
  const [logs, setLogs] = useState<QueryLog[]>([])
  const [expanded, setExpanded] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    queryApi.history(100).then(setLogs).finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5 animate-fade-in-up">
      <div>
        <h1 className="text-lg font-bold text-[#F8FAFC]">Query History</h1>
        <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>Your last 100 queries</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 py-8" style={{ color: "#64748B" }}>
          <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(20,184,166,0.3)", borderTopColor: "#14B8A6" }} />
          <span className="text-sm">Loading…</span>
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-lg border py-12 text-center" style={{ borderColor: "rgba(148,163,184,0.08)", background: "rgba(255,255,255,0.02)" }}>
          <Clock size={28} style={{ color: "rgba(148,163,184,0.3)" }} className="mx-auto mb-3" />
          <p className="text-sm" style={{ color: "#64748B" }}>No query history yet</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: "rgba(148,163,184,0.08)" }}>
          {logs.map((log) => (
            <div key={log.id} className="border-b last:border-0" style={{ borderColor: "rgba(148,163,184,0.05)" }}>
              <button
                onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors"
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <span className="mt-0.5 shrink-0">{STATUS_ICON[log.execution_status]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#CBD5E1] truncate">{log.natural_language_query}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>
                    {new Date(log.created_at).toLocaleString()}
                    {log.row_count != null && ` · ${log.row_count} rows`}
                    {log.execution_time_ms != null && ` · ${log.execution_time_ms}ms`}
                    {log.model_provider && ` · ${log.model_provider}`}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded" style={{
                  background: `${STATUS_COLOR[log.execution_status] || "#64748B"}15`,
                  color: STATUS_COLOR[log.execution_status] || "#64748B",
                }}>
                  {log.execution_status}
                </span>
              </button>

              {expanded === log.id && log.generated_sql && (
                <div className="px-4 pb-3">
                  <pre className="sql-block text-xs">{log.generated_sql}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
