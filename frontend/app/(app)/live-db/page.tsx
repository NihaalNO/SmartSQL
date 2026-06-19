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
      setConnError(detail)
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
    <div className="p-6 max-w-4xl mx-auto space-y-5 animate-fade-in-up">
      <div>
        <h1 className="text-lg font-bold text-[#F8FAFC] flex items-center gap-2">
          <Zap size={18} style={{ color: "#F59E0B" }} />
          Live DB Mode
        </h1>
        <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>
          Connect any PostgreSQL database for a read-only session. Credentials are never stored.
        </p>
      </div>

      {connError && (
        <div className="rounded-lg border p-4 flex gap-3" style={{ borderColor: "rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.04)" }}>
          <AlertTriangle size={16} style={{ color: "#EF4444" }} className="shrink-0 mt-0.5" />
          <div className="text-sm" style={{ color: "#EF4444" }}>
            <p className="font-semibold mb-1">Connection failed — credentials cleared</p>
            <p className="text-xs opacity-80">{connError.replace("Could not connect to database — Error reading schema: ", "")}</p>
            <button onClick={() => setConnError(null)} className="text-xs underline mt-1 opacity-70 hover:opacity-100" style={{ color: "#EF4444" }}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="rounded-lg border p-4 flex gap-3" style={{ borderColor: "rgba(245,158,11,0.15)", background: "rgba(245,158,11,0.04)" }}>
        <AlertTriangle size={16} style={{ color: "#F59E0B" }} className="shrink-0 mt-0.5" />
        <div className="text-sm" style={{ color: "#F59E0B" }}>
          <p className="font-medium">Ephemeral session — credentials are never saved</p>
          <p className="text-xs mt-1 opacity-80">Your password is held in memory only for this browser session.</p>
        </div>
      </div>

      <div className="rounded-lg border p-4 flex gap-3" style={{ borderColor: "rgba(96,165,250,0.15)", background: "rgba(96,165,250,0.04)" }}>
        <Info size={16} style={{ color: "#60A5FA" }} className="shrink-0 mt-0.5" />
        <div className="text-sm" style={{ color: "#60A5FA" }}>
          <p className="font-medium mb-1">Using a Neon database?</p>
          <ol className="text-xs space-y-1 opacity-80 list-decimal list-inside">
            <li>Open <strong>Neon Console → your project → Connection Details</strong></li>
            <li>Copy the host, port <strong>5432</strong>, database <strong>neondb</strong></li>
            <li>Keep <strong>Require SSL</strong> checked</li>
          </ol>
        </div>
      </div>

      {!connected ? (
        <div className="rounded-lg border p-5" style={{ borderColor: "rgba(148,163,184,0.08)", background: "rgba(255,255,255,0.02)" }}>
          <h2 className="text-sm font-semibold text-[#CBD5E1] mb-4 flex items-center gap-2">
            <Database size={14} style={{ color: "#14B8A6" }} />
            PostgreSQL Connection Details
          </h2>
          <form onSubmit={handleSubmit(connect)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-[#CBD5E1] mb-1">Host</label>
                <input
                  {...register("db_host", { required: "Required" })}
                  placeholder="ep-name-id.us-east-2.aws.neon.tech"
                  className="surface-input w-full px-3 py-2 text-sm"
                  style={{ borderColor: "rgba(148,163,184,0.15)" }}
                />
                {errors.db_host && <p className="text-xs mt-1" style={{ color: "#EF4444" }}>{errors.db_host.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-[#CBD5E1] mb-1">Port</label>
                <input
                  {...register("db_port", { required: true, valueAsNumber: true })}
                  type="number"
                  className="surface-input w-full px-3 py-2 text-sm"
                  style={{ borderColor: "rgba(148,163,184,0.15)" }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#CBD5E1] mb-1">Database</label>
                <input
                  {...register("db_name", { required: "Required" })}
                  placeholder="neondb"
                  className="surface-input w-full px-3 py-2 text-sm"
                  style={{ borderColor: "rgba(148,163,184,0.15)" }}
                />
                {errors.db_name && <p className="text-xs mt-1" style={{ color: "#EF4444" }}>{errors.db_name.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-[#CBD5E1] mb-1">User</label>
                <input
                  {...register("db_user", { required: "Required" })}
                  placeholder="neondb_owner"
                  className="surface-input w-full px-3 py-2 text-sm"
                  style={{ borderColor: "rgba(148,163,184,0.15)" }}
                />
                {errors.db_user && <p className="text-xs mt-1" style={{ color: "#EF4444" }}>{errors.db_user.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-[#CBD5E1] mb-1">Password</label>
                <div className="relative">
                  <input
                    {...register("db_password", { required: "Required" })}
                    type={showPw ? "text" : "password"}
                    placeholder="••••••••"
                    className="surface-input w-full px-3 py-2 pr-9 text-sm"
                    style={{ borderColor: "rgba(148,163,184,0.15)" }}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: "#64748B" }}>
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {errors.db_password && <p className="text-xs mt-1" style={{ color: "#EF4444" }}>{errors.db_password.message}</p>}
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input {...register("ssl_required")} type="checkbox" id="ssl_required" className="accent-[#14B8A6]" />
                <label htmlFor="ssl_required" className="text-xs cursor-pointer" style={{ color: "#CBD5E1" }}>
                  Require SSL
                </label>
              </div>
            </div>
            <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 rounded text-xs font-semibold text-white transition-all" style={{ background: "#14B8A6" }}>
              <Database size={13} />
              Connect
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-lg border p-4 flex items-center justify-between" style={{ borderColor: "rgba(34,197,94,0.15)", background: "rgba(34,197,94,0.04)" }}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse-dot" />
              <span className="text-sm font-medium" style={{ color: "#22C55E" }}>
                Connected to <code className="font-mono">{creds?.db_host}/{creds?.db_name}</code>
                {creds?.ssl_required && <span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.15)" }}>SSL</span>}
              </span>
            </div>
            <button onClick={disconnect} className="text-xs" style={{ color: "#EF4444" }}>Disconnect</button>
          </div>

          <div className="rounded-lg border p-4" style={{ borderColor: "rgba(148,163,184,0.08)", background: "rgba(255,255,255,0.02)" }}>
            <form onSubmit={runQuery} className="space-y-3">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question about your database in plain English…"
                rows={3}
                className="surface-input w-full px-3 py-2.5 text-sm resize-none"
                style={{ borderColor: "rgba(148,163,184,0.15)" }}
              />
              <div className="flex items-center gap-3">
                <select value={provider} onChange={(e) => setProvider(e.target.value)}
                  className="surface-input px-3 py-1.5 text-xs"
                  style={{ borderColor: "rgba(148,163,184,0.15)" }}>
                  <option value="groq">Groq (llama-3.3-70b)</option>
                  <option value="gemini">Gemini 1.5 Flash</option>
                  <option value="ollama">Ollama (local)</option>
                </select>
                <button
                  type="submit"
                  disabled={loading || !question.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-semibold text-white disabled:opacity-50 transition-all"
                  style={{ background: "#14B8A6" }}
                >
                  <Zap size={13} />
                  {loading ? "Running…" : "Run Live Query"}
                </button>
              </div>
            </form>
          </div>

          {result && (
            <>
              {result.status === "blocked" && (
                <div className="rounded-lg border p-4 flex gap-3" style={{ borderColor: "rgba(245,158,11,0.2)", background: "rgba(245,158,11,0.04)" }}>
                  <AlertTriangle size={16} style={{ color: "#F59E0B" }} className="shrink-0 mt-0.5" />
                  <div className="text-sm" style={{ color: "#F59E0B" }}>
                    <p className="font-semibold">Query not generated</p>
                    <p className="text-xs mt-1 opacity-80">{result.error}</p>
                  </div>
                </div>
              )}

              {result.generated_sql && <SQLPreview sql={result.generated_sql} status={result.status} />}

              {result.status === "success" && result.rows.length > 0 && (
                <>
                  <ChartView columns={result.columns} rows={result.rows} />
                  <ResultsTable columns={result.columns} rows={result.rows} rowCount={result.row_count} executionTimeMs={result.execution_time_ms} />
                </>
              )}

              {result.status === "failed" && result.error && (
                <div className="rounded-lg border p-4 flex gap-3" style={{ borderColor: "rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.04)" }}>
                  <AlertTriangle size={16} style={{ color: "#EF4444" }} className="shrink-0" />
                  <p className="text-sm" style={{ color: "#EF4444" }}>{result.error}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
