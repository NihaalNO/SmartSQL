"use client"
import { useEffect, useState } from "react"
import { Clock, CheckCircle, XCircle, ShieldX } from "lucide-react"
import { queryApi } from "@/lib/api"
import type { QueryLog } from "@/types"

const STATUS_META: Record<string, { icon: React.ReactNode; color: string }> = {
  success: { icon: <CheckCircle size={14} />, color: "var(--mint-green-deep)" },
  failed:  { icon: <XCircle size={14} />,      color: "var(--mint-error)" },
  blocked: { icon: <ShieldX size={14} />,      color: "var(--mint-warn)" },
}

export default function HistoryPage() {
  const [logs, setLogs] = useState<QueryLog[]>([])
  const [expanded, setExpanded] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    queryApi.history(100).then(setLogs).finally(() => setLoading(false))
  }, [])

  return (
    <div className="mint-page-narrow">
      <div>
        <p className="mint-kicker">Activity</p>
        <h1 className="mint-title mt-2">Query History</h1>
        <p className="mint-subtitle mt-2">Your last 100 queries</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 py-8 text-muted-foreground">
          <div className="w-4 h-4 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
          <span className="text-sm">Loading&hellip;</span>
        </div>
      ) : logs.length === 0 ? (
        <div className="mint-card py-12 text-center">
          <Clock size={28} className="text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No query history yet</p>
        </div>
      ) : (
        <div className="mint-table">
          {logs.map((log) => {
            const status = STATUS_META[log.execution_status]
            return (
              <div key={log.id} className="border-b border-border last:border-0">
                <button
                  onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                  className="w-full cursor-pointer flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary"
                >
                  <span className="mt-0.5 shrink-0" style={{ color: status?.color ?? "var(--mint-steel)" }}>
                    {status?.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground/80 truncate">{log.natural_language_query}</p>
                    <p className="text-xs mt-0.5 text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                      {log.row_count != null && ` - ${log.row_count} rows`}
                      {log.execution_time_ms != null && ` - ${log.execution_time_ms}ms`}
                      {log.model_provider && ` - ${log.model_provider}`}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded"
                    style={{ background: "var(--mint-surface)", color: status?.color ?? "var(--mint-steel)" }}>
                    {log.execution_status}
                  </span>
                </button>

                {expanded === log.id && log.generated_sql && (
                  <div className="px-4 pb-3 animate-slide-in-right">
                    <pre className="sql-block text-xs">{log.generated_sql}</pre>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
