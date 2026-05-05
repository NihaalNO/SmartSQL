"use client"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Zap, AlertTriangle, Eye, EyeOff, Info } from "lucide-react"
import toast from "react-hot-toast"
import { queryApi } from "@/lib/api"
import SQLPreview from "@/components/SQLPreview"
import ResultsTable from "@/components/ResultsTable"
import ChartView from "@/components/ChartView"
import type { QueryResult } from "@/types"

interface CredForm {
  db_host: string
  db_port: number
  db_name: string
  db_user: string
  db_password: string
}

export default function LiveDbPage() {
  const [connected, setConnected] = useState(false)
  const [creds, setCreds] = useState<CredForm | null>(null)
  const [showPw, setShowPw] = useState(false)
  const [question, setQuestion] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<QueryResult | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<CredForm>({
    defaultValues: { db_port: 5432 },
  })

  const connect = (data: CredForm) => {
    setCreds(data)
    setConnected(true)
    toast.success("Credentials set — not stored, ephemeral only")
  }

  const disconnect = () => {
    setCreds(null)
    setConnected(false)
    setResult(null)
    setQuestion("")
  }

  const runQuery = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!creds || !question.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const data = await queryApi.runLive({
        question: question.trim(),
        ...creds,
      })
      setResult(data)
      if (data.status === "blocked") toast.error("Blocked: " + data.error)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Query failed"
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Zap size={22} className="text-yellow-500" />
          Live DB Mode
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Connect your Supabase database for a read-only session. Credentials are never stored.
        </p>
      </div>

      {/* Ephemeral warning */}
      <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 space-y-1">
          <p className="font-medium">Ephemeral session — credentials are never saved</p>
          <p className="text-amber-700">Your database password is only held in memory for this session and discarded on page reload. Only read-only SELECT queries are executed.</p>
        </div>
      </div>

      {!connected ? (
        /* Connection form */
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-5 flex items-center gap-2">
            <Info size={16} className="text-brand-500" />
            Supabase Connection Details
          </h2>
          <form onSubmit={handleSubmit(connect)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">DB Host</label>
                <input
                  {...register("db_host", { required: "Required" })}
                  placeholder="db.xxxx.supabase.co"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {errors.db_host && <p className="text-red-500 text-xs mt-1">{errors.db_host.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Port</label>
                <input
                  {...register("db_port", { required: true, valueAsNumber: true })}
                  type="number"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Database Name</label>
                <input
                  {...register("db_name", { required: "Required" })}
                  placeholder="postgres"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {errors.db_name && <p className="text-red-500 text-xs mt-1">{errors.db_name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">DB User</label>
                <input
                  {...register("db_user", { required: "Required" })}
                  placeholder="postgres"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {errors.db_user && <p className="text-red-500 text-xs mt-1">{errors.db_user.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    {...register("db_password", { required: "Required" })}
                    type={showPw ? "text" : "password"}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 pr-10"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-3 text-gray-400">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.db_password && <p className="text-red-500 text-xs mt-1">{errors.db_password.message}</p>}
              </div>
            </div>

            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg transition-colors"
            >
              <Zap size={16} />
              Connect
            </button>
          </form>
        </div>
      ) : (
        /* Connected — show query UI */
        <div className="space-y-5">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-green-800 font-medium">
                Connected to <code className="font-mono">{creds?.db_host}/{creds?.db_name}</code>
              </span>
            </div>
            <button onClick={disconnect} className="text-xs text-red-500 hover:underline">Disconnect</button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <form onSubmit={runQuery} className="space-y-3">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question about your Supabase database…"
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
              <button
                type="submit"
                disabled={loading || !question.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg disabled:opacity-60"
              >
                <Zap size={15} />
                {loading ? "Running…" : "Run Live Query"}
              </button>
            </form>
          </div>

          {result && (
            <>
              <SQLPreview sql={result.generated_sql} status={result.status} />
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
              {result.error && (
                <div className="flex gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                  <AlertTriangle size={18} className="text-red-500 shrink-0" />
                  <p className="text-sm text-red-700">{result.error}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
