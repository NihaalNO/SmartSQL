"use client"
import { useState } from "react"
import toast from "react-hot-toast"
import { Lightbulb, BookmarkPlus, ThumbsUp, ThumbsDown, AlertTriangle } from "lucide-react"
import QueryInput from "@/components/QueryInput"
import SQLPreview from "@/components/SQLPreview"
import ResultsTable from "@/components/ResultsTable"
import ChartView from "@/components/ChartView"
import { queryApi } from "@/lib/api"
import { canSaveQueries } from "@/lib/auth"
import type { QueryResult } from "@/types"

export default function QueryPage() {
  const [result, setResult] = useState<QueryResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [saveTitle, setSaveTitle] = useState("")
  const [showSave, setShowSave] = useState(false)

  const handleQuery = async (question: string, provider: string) => {
    setLoading(true)
    setResult(null)
    try {
      const data = await queryApi.run({ question, model_provider: provider, include_insight: true })
      setResult(data)
      if (data.status === "blocked") toast.error("Query blocked: " + data.error)
      else if (data.status === "failed") toast.error("Execution failed: " + data.error)
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
          <SQLPreview sql={result.generated_sql} status={result.status} />

          {/* AI Insight */}
          {result.insight && (
            <div className="flex gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
              <Lightbulb size={18} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800 leading-relaxed">{result.insight}</p>
            </div>
          )}

          {/* Error */}
          {result.error && result.status !== "blocked" && (
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

          {/* Actions bar */}
          <div className="flex items-center gap-3 flex-wrap">
            {canSaveQueries() && (
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
