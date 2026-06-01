"use client"
import { useState } from "react"
import toast from "react-hot-toast"
import {
  Lightbulb, BookmarkPlus, ThumbsUp, ThumbsDown,
  AlertTriangle, HelpCircle, FileCode2, Tag,
} from "lucide-react"
import QueryInput   from "@/components/QueryInput"
import SQLPreview   from "@/components/SQLPreview"
import ResultsTable from "@/components/ResultsTable"
import ChartView    from "@/components/ChartView"
import { queryApi } from "@/lib/api"
import { canSaveQueries } from "@/lib/auth"
import type { QueryResult, QueryIntent } from "@/types"

// ---------------------------------------------------------------------------
// Intent Analysis panel
// ---------------------------------------------------------------------------

const ACTION_LABEL: Record<string, string> = {
  select:  "SELECT",
  sort:    "ORDER BY",
  top:     "DESC + LIMIT",
  filter:  "WHERE",
  count:   "COUNT()",
  average: "AVG()",
  group:   "GROUP BY",
}

function IntentChip({ label, value, bg, color }: { label: string; value: string; bg: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium"
      style={{ borderColor: `${color}40`, backgroundColor: bg, color }}>
      <span style={{ opacity: 0.6, fontWeight: 400 }}>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}

function IntentPanel({ intent }: { intent: QueryIntent }) {
  const hasContent = intent.table || intent.action || intent.attributes.length > 0
  if (!hasContent) return null
  return (
    <div className="bg-surface-container-low rounded-xl border border-outline-variant/40 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Tag size={13} className="text-on-surface-variant" />
        <span className="text-label-sm text-on-surface-variant uppercase tracking-wide">Intent Analysis</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <IntentChip label="Type"   value={intent.query_type}   bg="rgba(99,102,241,0.08)"  color="#6366f1" />
        {intent.table && <IntentChip label="Table" value={intent.table} bg="rgba(8,145,178,0.08)" color="#0891b2" />}
        {intent.action && (
          <IntentChip
            label="Action"
            value={ACTION_LABEL[intent.action] ?? intent.action.toUpperCase()}
            bg="rgba(5,150,105,0.08)"
            color="#059669"
          />
        )}
        {intent.attributes.map(a => (
          <IntentChip key={a} label="Attr" value={a} bg="rgba(217,119,6,0.08)" color="#d97706" />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Need-Context panel
// ---------------------------------------------------------------------------

function NeedContextPanel({ message }: { message: string }) {
  const firstPeriod = message.indexOf(". ")
  const headline    = firstPeriod !== -1 ? message.slice(0, firstPeriod + 1) : message
  const detail      = firstPeriod !== -1 ? message.slice(firstPeriod + 2)    : ""
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 space-y-3">
      <div className="flex items-start gap-3">
        <HelpCircle size={20} className="text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">{headline}</p>
          {detail && <p className="text-sm text-amber-700 mt-1">{detail}</p>}
        </div>
      </div>
      <div className="border-t border-amber-200 pt-3 space-y-1.5">
        <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">What you can do</p>
        <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
          <li>Rephrase using a table name from the Schema Explorer above</li>
          <li>Check the Schema Explorer for available tables and columns</li>
          <li>Add the missing table to your database and refresh</li>
        </ul>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Template panel
// ---------------------------------------------------------------------------

function TemplatePanel() {
  return (
    <div className="rounded-xl border border-primary/20 p-4 flex items-start gap-3"
      style={{ background: "rgba(0,74,198,0.05)" }}>
      <FileCode2 size={18} className="text-primary shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-primary">General SQL Template</p>
        <p className="text-sm mt-0.5" style={{ color: "#004ac6cc" }}>
          The table referenced does not exist in your connected database.
          Use this query as a starting-point template and adapt it to your own schema.
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Ready-to-execute empty state (from Stitch)
// ---------------------------------------------------------------------------

function ReadyState() {
  return (
    <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-low
                    flex flex-col items-center justify-center gap-3 py-14 text-center relative overflow-hidden">
      {/* Subtle radial gradient from top-right, matching Stitch */}
      <div className="absolute inset-0 pointer-events-none opacity-10"
        style={{ background: "radial-gradient(circle at top right, #2563eb, transparent 70%)" }} />
      <div className="w-16 h-16 rounded-full bg-surface-variant/40 flex items-center justify-center mb-1">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#737686" strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3h18v4H3z"/><path d="M3 10h18v4H3z"/><path d="M3 17h18v4H3z"/>
        </svg>
      </div>
      <div>
        <h3 className="text-title-md text-on-surface">Ready to execute</h3>
        <p className="text-body-md text-on-surface-variant mt-1 max-w-xs">
          Write your query above and tap the lightning bolt to see results.
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

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
      if      (data.status === "need_context") toast("More context needed — see details below", { icon: "❓" })
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
    <div className="min-h-screen bg-surface-bright">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-5">

        {/* Page title */}
        <div>
          <h1 className="text-headline-sm text-on-surface">Query</h1>
          <p className="text-body-md text-on-surface-variant mt-0.5">
            Ask anything about your data in plain English
          </p>
        </div>

        {/* NL Input */}
        <QueryInput onSubmit={handleQuery} loading={loading} />

        {/* Results area */}
        {!result && !loading && <ReadyState />}

        {loading && (
          <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-low
                          flex items-center justify-center gap-3 py-14">
            <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <span className="text-body-md text-on-surface-variant">Generating query…</span>
          </div>
        )}

        {result && (
          <div className="space-y-5">

            {/* Intent Analysis */}
            {result.intent && <IntentPanel intent={result.intent} />}

            {/* Need more context */}
            {result.status === "need_context" && result.error && (
              <NeedContextPanel message={result.error} />
            )}

            {/* SQL Terminal */}
            {result.generated_sql && (
              <SQLPreview sql={result.generated_sql} status={result.status} />
            )}

            {/* Template notice */}
            {result.status === "template" && <TemplatePanel />}

            {/* AI Insight */}
            {result.insight && (
              <div className="flex gap-3 rounded-xl border border-primary/20 p-4"
                style={{ background: "rgba(0,74,198,0.05)" }}>
                <Lightbulb size={18} className="text-primary shrink-0 mt-0.5" />
                <p className="text-body-md text-on-surface leading-relaxed">{result.insight}</p>
              </div>
            )}

            {/* Execution error */}
            {result.error && result.status === "failed" && (
              <div className="flex gap-3 bg-error-container border border-error/20 rounded-xl p-4">
                <AlertTriangle size={18} className="text-error shrink-0 mt-0.5" />
                <p className="text-body-md text-on-error-container">{result.error}</p>
              </div>
            )}

            {/* Chart + Table */}
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

            {/* Actions bar */}
            {result.log_id && result.status !== "need_context" && (
              <div className="flex items-center gap-3 flex-wrap pt-1">
                {canSaveQueries() && (result.status === "success" || result.status === "template") && (
                  <button
                    onClick={() => setShowSave(!showSave)}
                    className="flex items-center gap-2 text-label-lg px-4 py-2 rounded-full border
                               border-outline-variant hover:border-primary/40 hover:bg-surface-container
                               text-on-surface transition-all"
                  >
                    <BookmarkPlus size={15} />
                    Save Query
                  </button>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-label-sm text-on-surface-variant">Was this helpful?</span>
                  <button onClick={() => handleFeedback(5)}
                    className="p-1.5 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant hover:text-success">
                    <ThumbsUp size={16} />
                  </button>
                  <button onClick={() => handleFeedback(2)}
                    className="p-1.5 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant hover:text-error">
                    <ThumbsDown size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Save form */}
            {showSave && (
              <div className="flex gap-3 items-center">
                <input
                  value={saveTitle}
                  onChange={e => setSaveTitle(e.target.value)}
                  placeholder="Query title…"
                  className="flex-1 px-4 py-2.5 border border-outline-variant rounded-xl text-body-md
                             text-on-surface bg-surface-container-low
                             focus:outline-none focus:ring-2 transition-shadow"
                  style={{ "--tw-ring-color": "#004ac6" } as React.CSSProperties}
                />
                <button
                  onClick={handleSave}
                  className="px-5 py-2.5 text-white text-label-lg rounded-full transition-all active:scale-95"
                  style={{ background: "#004ac6" }}
                >
                  Save
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
