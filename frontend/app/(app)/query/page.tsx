"use client"
import { useState } from "react"
import toast from "react-hot-toast"
import {
  Lightbulb, BookmarkPlus, ThumbsUp, ThumbsDown,
  AlertTriangle, HelpCircle, FileCode2, Tag,
  Sparkles,
} from "lucide-react"
import QueryInput   from "@/components/QueryInput"
import SQLPreview   from "@/components/SQLPreview"
import ResultsTable from "@/components/ResultsTable"
import ChartView    from "@/components/ChartView"
import { queryApi } from "@/lib/api"
import { canSaveQueries } from "@/lib/auth"
import type { QueryResult, QueryIntent } from "@/types"

const ACTION_LABEL: Record<string, string> = {
  select:  "SELECT",
  sort:    "ORDER BY",
  top:     "DESC + LIMIT",
  filter:  "WHERE",
  count:   "COUNT()",
  average: "AVG()",
  group:   "GROUP BY",
}

function IntentChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium"
      style={{ background: `${color}12`, color }}>
      <span style={{ opacity: 0.6, fontWeight: 400 }}>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}

function IntentPanel({ intent }: { intent: QueryIntent }) {
  const hasContent = intent.table || intent.action || intent.attributes.length > 0
  if (!hasContent) return null
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: "rgba(148,163,184,0.08)", background: "rgba(255,255,255,0.02)" }}>
      <div className="flex items-center gap-2 mb-2">
        <Tag size={12} style={{ color: "#64748B" }} />
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "#64748B" }}>Intent</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <IntentChip label="Type"   value={intent.query_type}   color="#818CF8" />
        {intent.table && <IntentChip label="Table" value={intent.table} color="#22D3EE" />}
        {intent.action && (
          <IntentChip label="Action" value={ACTION_LABEL[intent.action] ?? intent.action.toUpperCase()} color="#22C55E" />
        )}
        {intent.attributes.map(a => (
          <IntentChip key={a} label="Attr" value={a} color="#FB923C" />
        ))}
      </div>
    </div>
  )
}

function NeedContextPanel({ message }: { message: string }) {
  const firstPeriod = message.indexOf(". ")
  const headline    = firstPeriod !== -1 ? message.slice(0, firstPeriod + 1) : message
  const detail      = firstPeriod !== -1 ? message.slice(firstPeriod + 2)    : ""
  return (
    <div className="rounded-lg border p-4" style={{ borderColor: "rgba(245,158,11,0.2)", background: "rgba(245,158,11,0.04)" }}>
      <div className="flex items-start gap-3">
        <HelpCircle size={16} style={{ color: "#F59E0B" }} className="shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold" style={{ color: "#F59E0B" }}>{headline}</p>
          {detail && <p className="text-xs mt-1" style={{ color: "rgba(245,158,11,0.8)" }}>{detail}</p>}
        </div>
      </div>
      <div className="border-t mt-3 pt-3" style={{ borderColor: "rgba(245,158,11,0.1)" }}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "#F59E0B" }}>Suggestions</p>
        <ul className="text-xs space-y-1" style={{ color: "rgba(245,158,11,0.75)" }}>
          <li>Use a table name from the Schema Explorer</li>
          <li>Check available tables and columns</li>
          <li>Add the missing table to your database</li>
        </ul>
      </div>
    </div>
  )
}

function TemplatePanel() {
  return (
    <div className="rounded-lg border p-4 flex items-start gap-3" style={{ borderColor: "rgba(96,165,250,0.2)", background: "rgba(96,165,250,0.04)" }}>
      <FileCode2 size={16} style={{ color: "#60A5FA" }} className="shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold" style={{ color: "#60A5FA" }}>General SQL Template</p>
        <p className="text-xs mt-1" style={{ color: "rgba(96,165,250,0.7)" }}>
          The table does not exist in your connected database. Use this as a starting point and adapt it to your schema.
        </p>
      </div>
    </div>
  )
}

function ReadyState() {
  return (
    <div className="rounded-lg border flex flex-col items-center justify-center gap-3 py-16 text-center" style={{ borderColor: "rgba(148,163,184,0.08)", background: "rgba(255,255,255,0.02)" }}>
      <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: "rgba(20,184,166,0.1)" }}>
        <Sparkles size={22} style={{ color: "#14B8A6" }} />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-[#CBD5E1]">Ready to query</h3>
        <p className="text-xs mt-1 max-w-xs" style={{ color: "#64748B" }}>
          Describe what you need in plain English. SmartSQL will generate and execute the SQL.
        </p>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="rounded-lg border flex items-center justify-center gap-3 py-12" style={{ borderColor: "rgba(148,163,184,0.08)", background: "rgba(255,255,255,0.02)" }}>
      <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(20,184,166,0.3)", borderTopColor: "#14B8A6" }} />
      <span className="text-sm" style={{ color: "#64748B" }}>Generating SQL…</span>
    </div>
  )
}

function InsightPanel({ insight }: { insight: string }) {
  return (
    <div className="rounded-lg border p-4 flex gap-3" style={{ borderColor: "rgba(20,184,166,0.15)", background: "rgba(20,184,166,0.04)" }}>
      <Lightbulb size={16} style={{ color: "#14B8A6" }} className="shrink-0 mt-0.5" />
      <p className="text-sm leading-relaxed" style={{ color: "#CBD5E1" }}>{insight}</p>
    </div>
  )
}

function ErrorPanel({ error }: { error: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border p-4" style={{ borderColor: "rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.04)" }}>
      <AlertTriangle size={16} style={{ color: "#EF4444" }} className="shrink-0 mt-0.5" />
      <p className="text-sm" style={{ color: "#EF4444" }}>{error}</p>
    </div>
  )
}

export default function QueryPage() {
  const [result,    setResult]    = useState<QueryResult | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [saveTitle, setSaveTitle] = useState("")
  const [showSave,  setShowSave]  = useState(false)

  const handleQuery = async (question: string, provider: string) => {
    setLoading(true)
    setResult(null)
    try {
      const data = await queryApi.run({ question, model_provider: provider, include_insight: true })
      setResult(data)
      if      (data.status === "need_context") toast("More context needed", { icon: "❓" })
      else if (data.status === "template")     toast("Table not in schema — showing general template", { icon: "📄" })
      else if (data.status === "blocked")      toast.error("Query blocked: " + data.error)
      else if (data.status === "failed")       toast.error("Execution failed: " + data.error)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Query failed"
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!result?.log_id || !saveTitle.trim()) return
    try {
      await queryApi.save({ log_id: result.log_id, title: saveTitle.trim() })
      toast.success("Query saved!")
      setShowSave(false)
      setSaveTitle("")
    } catch {
      toast.error("Could not save query")
    }
  }

  const handleFeedback = async (rating: number) => {
    if (!result?.log_id) return
    try {
      await queryApi.feedback({ log_id: result.log_id, rating })
      toast.success(rating >= 4 ? "Thanks for the positive feedback!" : "Thanks for your feedback")
    } catch {
      toast.error("Could not submit feedback")
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4 animate-fade-in-up">
      <div>
        <h1 className="text-lg font-bold text-[#F8FAFC]">Query</h1>
        <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>
          Ask anything about your data in plain English
        </p>
      </div>

      <QueryInput onSubmit={handleQuery} loading={loading} />

      {!result && !loading && <ReadyState />}

      {loading && <LoadingState />}

      {result && (
        <div className="space-y-4">
          {result.intent && <IntentPanel intent={result.intent} />}

          {result.status === "need_context" && result.error && (
            <NeedContextPanel message={result.error} />
          )}

          {result.generated_sql && (
            <SQLPreview sql={result.generated_sql} status={result.status} />
          )}

          {result.status === "template" && <TemplatePanel />}

          {result.insight && <InsightPanel insight={result.insight} />}

          {result.error && result.status === "failed" && (
            <ErrorPanel error={result.error} />
          )}

          {result.status === "success" && result.rows.length > 0 && (
            <>
              <ChartView columns={result.columns} rows={result.rows} />
              <ResultsTable
                columns={result.columns}
                rows={result.rows}
                rowCount={result.row_count}
                executionTimeMs={result.execution_time_ms}
              />
            </>
          )}

          {result.log_id && result.status !== "need_context" && (
            <div className="flex items-center gap-3 flex-wrap pt-1">
              {canSaveQueries() && (result.status === "success" || result.status === "template") && (
                <button
                  onClick={() => setShowSave(!showSave)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-all"
                  style={{ borderColor: "rgba(148,163,184,0.1)", color: "#CBD5E1" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(148,163,184,0.2)" }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(148,163,184,0.1)" }}
                >
                  <BookmarkPlus size={13} />
                  Save
                </button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs" style={{ color: "#64748B" }}>Helpful?</span>
                <button onClick={() => handleFeedback(5)}
                  className="p-1 rounded transition-colors"
                  style={{ color: "#64748B" }}
                  onMouseEnter={e => e.currentTarget.style.color = "#22C55E"}
                  onMouseLeave={e => e.currentTarget.style.color = "#64748B"}>
                  <ThumbsUp size={13} />
                </button>
                <button onClick={() => handleFeedback(2)}
                  className="p-1 rounded transition-colors"
                  style={{ color: "#64748B" }}
                  onMouseEnter={e => e.currentTarget.style.color = "#EF4444"}
                  onMouseLeave={e => e.currentTarget.style.color = "#64748B"}>
                  <ThumbsDown size={13} />
                </button>
              </div>
            </div>
          )}

          {showSave && (
            <div className="flex gap-2 items-center">
              <input
                value={saveTitle}
                onChange={e => setSaveTitle(e.target.value)}
                placeholder="Query title…"
                className="surface-input flex-1 px-3 py-2 text-sm"
                style={{ borderColor: "rgba(148,163,184,0.15)" }}
              />
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded text-xs font-semibold text-white transition-all"
                style={{ background: "#14B8A6" }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = "0 0 10px rgba(20,184,166,0.3)"}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
              >
                Save
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
