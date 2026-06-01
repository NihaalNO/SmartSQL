"use client"
import { useState } from "react"
import toast from "react-hot-toast"
import {
  Lightbulb, BookmarkPlus, ThumbsUp, ThumbsDown, AlertTriangle,
  HelpCircle, FileCode2, Tag,
} from "lucide-react"
import QueryInput from "@/components/QueryInput"
import SQLPreview from "@/components/SQLPreview"
import ResultsTable from "@/components/ResultsTable"
import ChartView from "@/components/ChartView"
import { queryApi } from "@/lib/api"
import { canSaveQueries } from "@/lib/auth"
import type { QueryResult, QueryIntent } from "@/types"

// ---------------------------------------------------------------------------
// Intent Panel — shows extracted query intent as labelled chips
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

function IntentChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium" style={{
      borderColor: `${color}40`,
      backgroundColor: `${color}10`,
      color,
    }}>
      <span className="opacity-60 font-normal">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}

function IntentPanel({ intent }: { intent: QueryIntent }) {
  const hasContent = intent.table || intent.action || intent.attributes.length > 0

  if (!hasContent) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Tag size={14} className="text-gray-400" />
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Intent Analysis</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <IntentChip label="Type"   value={intent.query_type}                        color="#6366f1" />
        {intent.table  && <IntentChip label="Table"  value={intent.table}           color="#0891b2" />}
        {intent.action && (
          <IntentChip
            label="Action"
            value={ACTION_LABEL[intent.action] ?? intent.action.toUpperCase()}
            color="#059669"
          />
        )}
        {intent.attributes.map((attr) => (
          <IntentChip key={attr} label="Attr" value={attr} color="#d97706" />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Need-Context Panel — shown when the schema can't satisfy the intent
// ---------------------------------------------------------------------------

function NeedContextPanel({ message }: { message: string }) {
  // Split on the first sentence break so we can style the lead line separately
  const firstPeriod = message.indexOf(". ")
  const headline = firstPeriod !== -1 ? message.slice(0, firstPeriod + 1) : message
  const detail   = firstPeriod !== -1 ? message.slice(firstPeriod + 2)    : ""

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
          <li>Rephrase your question using a table name that exists in the schema</li>
          <li>Check the Schema Explorer on the dashboard for available tables and columns</li>
          <li>Add the missing table/column to your database and refresh</li>
        </ul>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Template Panel — shown when SQL is generated for a table not in the schema
// ---------------------------------------------------------------------------

function TemplatePanel() {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex items-start gap-3">
      <FileCode2 size={18} className="text-blue-500 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-blue-800">General SQL Template</p>
        <p className="text-sm text-blue-700 mt-0.5">
          The table referenced does not exist in your connected database.
          The query above is a best-effort template — you can adapt it to your own schema.
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function QueryPage() {
  const [result, setResult]     = useState<QueryResult | null>(null)
  const [loading, setLoading]   = useState(false)
  const [saveTitle, setSaveTitle] = useState("")
  const [showSave, setShowSave]   = useState(false)

  const handleQuery = async (question: string, provider: string) => {
    setLoading(true)
    setResult(null)
    try {
      const data = await queryApi.run({ question, model_provider: provider, include_insight: true })
      setResult(data)
      if (data.status === "need_context") toast("More context needed — see details below", { icon: "❓" })
      else if (data.status === "template") toast("Table not in schema — showing general template", { icon: "📄" })
      else if (data.status === "blocked")  toast.error("Query blocked: " + data.error)
      else if (data.status === "failed")   toast.error("Execution failed: " + data.error)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Query failed"
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
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Query</h1>
        <p className="text-gray-500 text-sm mt-1">Ask anything about your data in plain English</p>
      </div>

      <QueryInput onSubmit={handleQuery} loading={loading} />

      {result && (
        <>
          {/* Intent analysis — always shown when intent data is present */}
          {result.intent && <IntentPanel intent={result.intent} />}

          {/* Need more context */}
          {result.status === "need_context" && result.error && (
            <NeedContextPanel message={result.error} />
          )}

          {/* Generated SQL — only shown when SQL was produced */}
          {result.generated_sql && (
            <SQLPreview sql={result.generated_sql} status={result.status} />
          )}

          {/* Template notice */}
          {result.status === "template" && <TemplatePanel />}

          {/* AI Insight */}
          {result.insight && (
            <div className="flex gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
              <Lightbulb size={18} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800 leading-relaxed">{result.insight}</p>
            </div>
          )}

          {/* Execution error (not need_context, not blocked, not template) */}
          {result.error && result.status === "failed" && (
            <div className="flex gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
              <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{result.error}</p>
            </div>
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

          {/* Actions bar — only useful when there is a log to act on */}
          {result.log_id && result.status !== "need_context" && (
            <div className="flex items-center gap-3 flex-wrap">
              {canSaveQueries() && (result.status === "success" || result.status === "template") && (
                <button
                  onClick={() => setShowSave(!showSave)}
                  className="flex items-center gap-2 text-sm px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <BookmarkPlus size={15} />
                  Save Query
                </button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-gray-500">Was this helpful?</span>
                <button onClick={() => handleFeedback(5)} className="p-1.5 rounded hover:bg-green-50 text-gray-400 hover:text-green-500">
                  <ThumbsUp size={16} />
                </button>
                <button onClick={() => handleFeedback(2)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                  <ThumbsDown size={16} />
                </button>
              </div>
            </div>
          )}

          {showSave && (
            <div className="flex gap-3 items-center">
              <input
                value={saveTitle}
                onChange={(e) => setSaveTitle(e.target.value)}
                placeholder="Query title…"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700"
              >
                Save
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
