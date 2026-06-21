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
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

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
    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary px-2 py-0.5 text-xs font-medium"
      style={{ color }}>
      <span style={{ opacity: 0.6, fontWeight: 400 }}>{label}</span>
      <span className="font-medium">{value}</span>
    </span>
  )
}

function IntentPanel({ intent }: { intent: QueryIntent }) {
  const hasContent = intent.table || intent.action || intent.attributes.length > 0
  if (!hasContent) return null
  return (
    <div className="mint-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Tag size={12} className="text-muted-foreground" />
        <span className="label-sm text-muted-foreground">Intent</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <IntentChip label="Type"   value={intent.query_type}   color="var(--mint-tag)" />
        {intent.table && <IntentChip label="Table" value={intent.table} color="var(--mint-tag)" />}
        {intent.action && (
          <IntentChip label="Action" value={ACTION_LABEL[intent.action] ?? intent.action.toUpperCase()} color="var(--mint-green-deep)" />
        )}
        {intent.attributes.map(a => (
          <IntentChip key={a} label="Attr" value={a} color="var(--mint-warn)" />
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
    <div className="rounded-lg border border-warning/20 bg-warning/10 p-4">
      <div className="flex items-start gap-3">
        <HelpCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-400">{headline}</p>
          {detail && <p className="text-xs mt-1 text-amber-400/70">{detail}</p>}
        </div>
      </div>
      <div className="border-t mt-3 pt-3 border-amber-400/10">
        <p className="label-sm text-amber-400 mb-1.5">Suggestions</p>
        <ul className="text-xs space-y-1 text-amber-400/70">
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
    <div className="mint-soft p-4 flex items-start gap-3">
      <FileCode2 size={16} className="text-[var(--mint-tag)] shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-foreground">General SQL Template</p>
        <p className="text-xs mt-1 text-muted-foreground">
          The table does not exist in your connected database. Use this as a starting point and adapt it to your schema.
        </p>
      </div>
    </div>
  )
}

function ReadyState() {
  return (
    <div className="mint-card flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="w-12 h-12 rounded-full flex items-center justify-center bg-secondary">
        <Sparkles size={22} className="text-[var(--mint-green-deep)]" />
      </div>
      <div>
        <h3 className="text-sm font-medium text-foreground">Ready to query</h3>
        <p className="text-xs mt-1 max-w-xs text-muted-foreground">
          Describe what you need in plain English. SmartSQL will generate and execute the SQL.
        </p>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="mint-card flex items-center justify-center gap-3 py-12">
      <div className="w-4 h-4 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
      <span className="text-sm text-muted-foreground">Generating SQL&hellip;</span>
    </div>
  )
}

function InsightPanel({ insight }: { insight: string }) {
  return (
    <div className="mint-soft p-4 flex gap-3">
      <Lightbulb size={16} className="text-[var(--mint-green-deep)] shrink-0 mt-0.5" />
      <p className="text-sm text-foreground/80 leading-relaxed">{insight}</p>
    </div>
  )
}

function ErrorPanel({ error }: { error: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4">
      <AlertTriangle size={16} className="text-destructive shrink-0 mt-0.5" />
      <p className="text-sm text-destructive">{error}</p>
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
      if      (data.status === "need_context") toast("More context needed")
      else if (data.status === "template")     toast("Table not in schema - showing general template")
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
    <div className="mint-page-narrow">
      <div>
        <p className="mint-kicker">Query Generator</p>
        <h1 className="mint-title mt-2">Ask your database</h1>
        <p className="mint-subtitle mt-2">
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
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowSave(!showSave)}
                >
                  <BookmarkPlus size={13} />
                  Save
                </Button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-muted-foreground">Helpful?</span>
                <button onClick={() => handleFeedback(5)}
                  className="cursor-pointer p-1.5 rounded-md text-muted-foreground hover:text-[var(--mint-green-deep)] hover:bg-secondary transition-colors">
                  <ThumbsUp size={13} />
                </button>
                <button onClick={() => handleFeedback(2)}
                  className="cursor-pointer p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
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
                placeholder="Query title&hellip;"
                className="mint-input flex-1 px-4 py-2 text-sm"
              />
              <Button variant="primary" size="sm" onClick={handleSave}>Save</Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
