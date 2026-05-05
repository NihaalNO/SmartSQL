"use client"
import { useEffect, useState } from "react"
import { Clock, CheckCircle, XCircle, ShieldX } from "lucide-react"
import { queryApi } from "@/lib/api"
import type { QueryLog } from "@/types"

const STATUS_ICON = {
  success: <CheckCircle size={15} className="text-green-500" />,
  failed: <XCircle size={15} className="text-red-500" />,
  blocked: <ShieldX size={15} className="text-yellow-500" />,
}

export default function HistoryPage() {
  const [logs, setLogs] = useState<QueryLog[]>([])
  const [expanded, setExpanded] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    queryApi.history(100).then(setLogs).finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Query History</h1>
        <p className="text-gray-500 text-sm mt-1">Your last 100 queries</p>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Clock size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No query history yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {logs.map((log) => (
            <div key={log.id}>
              <button
                onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                className="w-full flex items-start gap-3 px-5 py-4 hover:bg-gray-50 text-left transition-colors"
              >
                <span className="mt-0.5 shrink-0">{STATUS_ICON[log.execution_status]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 font-medium truncate">{log.natural_language_query}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(log.created_at).toLocaleString()}
                    {log.row_count != null && ` · ${log.row_count} rows`}
                    {log.execution_time_ms != null && ` · ${log.execution_time_ms}ms`}
                    {log.model_provider && ` · ${log.model_provider}`}
                  </p>
                </div>
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                  log.execution_status === "success" ? "bg-green-100 text-green-700" :
                  log.execution_status === "blocked" ? "bg-yellow-100 text-yellow-700" :
                  "bg-red-100 text-red-700"
                }`}>
                  {log.execution_status}
                </span>
              </button>

              {expanded === log.id && log.generated_sql && (
                <div className="px-5 pb-4">
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
