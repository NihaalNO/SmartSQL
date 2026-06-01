"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { Zap, AlertTriangle, Eye, EyeOff, Info, Database } from "lucide-react"
import toast from "react-hot-toast"
import { queryApi } from "@/lib/api"
import { canUseLiveDb } from "@/lib/auth"
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
  ssl_required: boolean
}

export default function LiveDbPage() {
  const router = useRouter()
  const [connected, setConnected]   = useState(false)
  const [creds, setCreds]           = useState<CredForm | null>(null)
  const [showPw, setShowPw]         = useState(false)
  const [question, setQuestion]     = useState("")
  const [provider, setProvider]     = useState("groq")
  const [loading, setLoading]       = useState(false)
  const [result, setResult]         = useState<QueryResult | null>(null)
  const [connError, setConnError]   = useState<string | null>(null)

  useEffect(() => {
    if (!canUseLiveDb()) router.replace("/query")
  }, [router])

  const { register, handleSubmit, formState: { errors } } = useForm<CredForm>({
    defaultValues: { db_port: 5432, ssl_required: true },
  })

  const connect = (data: CredForm) => {
    setCreds(data)
    setConnected(true)
    toast.success("Credentials set — held in memory only, never stored")
  }

  const disconnect = () => {
    setCreds(null)
    setConnected(false)
    setResult(null)
    setQuestion("")
    setConnError(null)
  }

  const runQuery = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!creds || !question.trim()) return
    setLoading(true)
    setResult(null)
    setConnError(null)
    try {
      const data = await queryApi.runLive({
        question:       question.trim(),
        model_provider: provider,
        db_host:        creds.db_host,
        db_port:        creds.db_port,
        db_name:        creds.db_name,
        db_user:        creds.db_user,
        db_password:    creds.db_password,
        ssl_required:   creds.ssl_required,
      })
      setResult(data)
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Query failed. Please check your connection details and try again."

      // Always show errors inline — toasts vanish too quickly for actionable messages
      setConnError(detail)

      // If the error is clearly a connection failure, drop back to the form so the
      // user can correct their credentials without having to click Disconnect first
      const isConnFailure =
        detail.includes("Could not connect") ||
        detail.includes("Error reading schema") ||
        detail.includes("authentication failed") ||
        detail.includes("Connection refused") ||
        detail.includes("not found")
      if (isConnFailure) {
        setCreds(null)
        setConnected(false)
        setResult(null)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Zap size={22} className="text-yellow-500" />
          Live DB Mode
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Connect any PostgreSQL database for a read-only session. Credentials are never stored.
        </p>
      </div>

      {/* ── Global error panel — shown above everything when a connection/query fails ── */}
      {connError && (
        <div className="flex gap-3 bg-red-50 border border-red-300 rounded-xl p-5">
          <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div className="text-sm text-red-800 space-y-1.5">
            <p className="font-semibold">Connection failed — credentials cleared</p>
            <p className="leading-relaxed">
              {connError.replace("Could not connect to database — Error reading schema: ", "")}
            </p>
            <button
              onClick={() => setConnError(null)}
              className="text-xs text-red-600 underline underline-offset-2 mt-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Ephemeral warning */}
      <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 space-y-1">
          <p className="font-medium">Ephemeral session — credentials are never saved</p>
          <p className="text-amber-700">
            Your password is held in memory only for this browser session and discarded on page
            reload. Only read-only SELECT queries are executed.
          </p>
        </div>
      </div>

      {/* Neon connection guide */}
      <div className="flex gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 space-y-2">
          <p className="font-medium">Using a Neon database? Find your connection details in the Neon Console.</p>
          <ol className="list-decimal list-inside space-y-1 text-blue-700">
            <li>Open <strong>Neon Console → your project → Connection Details</strong></li>
            <li>Copy the host: <code className="font-mono bg-blue-100 px-1 rounded">ep-&lt;name&gt;-&lt;id&gt;.&lt;region&gt;.aws.neon.tech</code></li>
            <li>Use port <code className="font-mono bg-blue-100 px-1 rounded">5432</code>, database <code className="font-mono bg-blue-100 px-1 rounded">neondb</code>, and your role name (default: <code className="font-mono bg-blue-100 px-1 rounded">neondb_owner</code>)</li>
            <li>Keep <strong>Require SSL</strong> checked — Neon always requires SSL</li>
          </ol>
          <p className="text-blue-600 text-xs">
            Free-tier Neon computes suspend after 5 min of inactivity and wake automatically on the next connection.
          </p>
        </div>
      </div>

      {!connected ? (
        /* ── Connection form ── */
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-5 flex items-center gap-2">
            <Info size={16} className="text-brand-500" />
            PostgreSQL Connection Details
          </h2>
          <form onSubmit={handleSubmit(connect)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">

              {/* Host */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">DB Host</label>
                <input
                  {...register("db_host", { required: "Required" })}
                  placeholder="ep-name-id.us-east-2.aws.neon.tech  or  localhost"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {errors.db_host && <p className="text-red-500 text-xs mt-1">{errors.db_host.message}</p>}
              </div>

              {/* Port */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Port</label>
                <input
                  {...register("db_port", { required: true, valueAsNumber: true })}
                  type="number"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* DB Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Database Name</label>
                <input
                  {...register("db_name", { required: "Required" })}
                  placeholder="neondb"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {errors.db_name && <p className="text-red-500 text-xs mt-1">{errors.db_name.message}</p>}
              </div>

              {/* User */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">DB User</label>
                <input
                  {...register("db_user", { required: "Required" })}
                  placeholder="neondb_owner"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {errors.db_user && <p className="text-red-500 text-xs mt-1">{errors.db_user.message}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    {...register("db_password", { required: "Required" })}
                    type={showPw ? "text" : "password"}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-3 text-gray-400"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.db_password && <p className="text-red-500 text-xs mt-1">{errors.db_password.message}</p>}
              </div>

              {/* SSL toggle */}
              <div className="col-span-2 flex items-center gap-3">
                <input
                  {...register("ssl_required")}
                  type="checkbox"
                  id="ssl_required"
                  className="w-4 h-4 rounded"
                  style={{ accentColor: "#004ac6" }}
                />
                <label htmlFor="ssl_required" className="text-sm text-gray-700 cursor-pointer">
                  Require SSL{" "}
                  <span className="text-gray-400 text-xs">(required for Neon and cloud databases; uncheck for local PostgreSQL only)</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg transition-colors"
            >
              <Database size={16} />
              Connect
            </button>
          </form>
        </div>
      ) : (
        /* ── Connected — query UI ── */
        <div className="space-y-5">

          {/* Connection banner */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-green-800 font-medium">
                Connected to{" "}
                <code className="font-mono">{creds?.db_host}/{creds?.db_name}</code>
                {creds?.ssl_required && (
                  <span className="ml-2 text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded">SSL</span>
                )}
              </span>
            </div>
            <button onClick={disconnect} className="text-xs text-red-500 hover:underline">
              Disconnect
            </button>
          </div>

          {/* Query form */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <form onSubmit={runQuery} className="space-y-3">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question about your database in plain English…"
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />

              {/* Model provider selector */}
              <div className="flex items-center gap-3">
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="groq">Groq (llama-3.3-70b)</option>
                  <option value="gemini">Gemini 1.5 Flash</option>
                  <option value="ollama">Ollama (local)</option>
                </select>

                <button
                  type="submit"
                  disabled={loading || !question.trim()}
                  className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg disabled:opacity-60"
                >
                  <Zap size={15} />
                  {loading ? "Running…" : "Run Live Query"}
                </button>
              </div>
            </form>
          </div>

          {/* Results */}
          {result && (
            <>
              {/* Blocked / cannot-answer state */}
              {result.status === "blocked" && (
                <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-xl p-5">
                  <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800 space-y-1">
                    <p className="font-semibold">Query not generated</p>
                    <p className="leading-relaxed">{result.error}</p>
                  </div>
                </div>
              )}

              {/* SQL preview — only when SQL was actually generated */}
              {result.generated_sql && (
                <SQLPreview sql={result.generated_sql} status={result.status} />
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

              {result.status === "failed" && result.error && (
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
