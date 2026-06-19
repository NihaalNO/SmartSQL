"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { Zap, AlertTriangle, Eye, EyeOff, Info, Database, CheckCircle, XCircle, Loader2, Layers } from "lucide-react"
import toast from "react-hot-toast"
import { queryApi, schemaApi } from "@/lib/api"
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

type TestPhase = "idle" | "resolving" | "connecting" | "ssl" | "schema" | "analyzing" | "done" | "error"

const PHASE_LABELS: Record<TestPhase, string> = {
  idle:      "Ready",
  resolving: "Resolving host…",
  connecting:"Establishing connection…",
  ssl:       "Verifying SSL certificate…",
  schema:    "Discovering tables and columns…",
  analyzing: "Analyzing schema & generating ERD…",
  done:      "Connected successfully",
  error:     "Connection failed",
}

interface ConnectionTestResult {
  status: "ok" | "error"
  message: string
  table_count?: number
  tables?: string[]
  detail?: string
  diagnostics?: string[]
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

  // Connection test states
  const [testing, setTesting]       = useState(false)
  const [testPhase, setTestPhase]   = useState<TestPhase>("idle")
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null)

  useEffect(() => {
    if (!canUseLiveDb()) router.replace("/query")
  }, [router])

  const { register, handleSubmit, formState: { errors } } = useForm<CredForm>({
    defaultValues: { db_port: 5432, ssl_required: true },
  })

  const testAndConnect = async (data: CredForm) => {
    setTesting(true)
    setTestPhase("resolving")
    setTestResult(null)
    setConnError(null)

    const advancePhase = (() => {
      let cancelled = false
      const timers: ReturnType<typeof setTimeout>[] = []

      const schedule = (phase: TestPhase, delay: number) => {
        const t = setTimeout(() => { if (!cancelled) setTestPhase(phase) }, delay)
        timers.push(t)
      }

      schedule("connecting", 400)
      if (data.ssl_required) schedule("ssl", 800)
      schedule("schema", 1200)

      return () => { cancelled = true; timers.forEach(clearTimeout) }
    })()

    try {
      const res = await queryApi.testConnection({
        db_host: data.db_host,
        db_port: data.db_port,
        db_name: data.db_name,
        db_user: data.db_user,
        db_password: data.db_password,
        ssl_required: data.ssl_required,
      })

      advancePhase()

      if (res.status === "ok") {
        setTestPhase("analyzing")
        setTestResult({
          status: "ok",
          message: res.message,
          table_count: res.table_count,
          tables: res.tables,
        })

        sessionStorage.setItem("liveDbCreds", JSON.stringify({
          db_host: data.db_host,
          db_port: data.db_port,
          db_name: data.db_name,
          db_user: data.db_user,
          db_password: data.db_password,
          ssl_required: data.ssl_required,
        }))

        await new Promise((r) => setTimeout(r, 800))

        router.replace("/schema-visualizer?source=live-db")
      } else {
        setTestPhase("error")
        setTestResult({ status: "error", message: res.message, detail: res.detail, diagnostics: res.diagnostics })
      }
    } catch (err: unknown) {
      advancePhase()
      setTestPhase("error")
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (err as Error)?.message ||
        "Connection test failed"
      setTestResult({ status: "error", message: detail })
    } finally {
      setTesting(false)
    }
  }

  const disconnect = () => {
    setCreds(null)
    setConnected(false)
    setResult(null)
    setQuestion("")
    setConnError(null)
    setTestPhase("idle")
    setTestResult(null)
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

  const phaseIcon = (phase: TestPhase) => {
    if (testing && phase === testPhase) return <Loader2 size={14} className="animate-spin" style={{ color: "#60A5FA" }} />
    if (!testing && testPhase === "done") return <CheckCircle size={14} style={{ color: "#22C55E" }} />
    if (testPhase === "error") return <XCircle size={14} style={{ color: "#EF4444" }} />
    if (testPhase === phase) return <Loader2 size={14} className="animate-spin" style={{ color: "#60A5FA" }} />
    return <div className="w-3.5 h-3.5 rounded-full border" style={{ borderColor: "rgba(148,163,184,0.2)" }} />
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5 animate-fade-in-up">
      <div>
        <h1 className="text-lg font-bold text-[#F8FAFC] flex items-center gap-2">
          <Zap size={18} style={{ color: "#F59E0B" }} />
          Live DB Mode
        </h1>
        <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>
          Connect any PostgreSQL database (including Supabase) for a read-only session. Credentials are never stored.
        </p>
      </div>

      {connError && (
        <div className="rounded-lg border p-4 flex gap-3" style={{ borderColor: "rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.04)" }}>
          <AlertTriangle size={16} style={{ color: "#EF4444" }} className="shrink-0 mt-0.5" />
          <div className="text-sm" style={{ color: "#EF4444" }}>
            <p className="font-semibold mb-1">Query error</p>
            <p className="text-xs opacity-80">{connError}</p>
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
          <p className="font-medium mb-1">Using a Supabase database?</p>
          <ol className="text-xs space-y-1 opacity-80 list-decimal list-inside">
            <li>Open <strong>Supabase Dashboard → your project → Connect</strong></li>
            <li>Choose <strong>Session pooler</strong> (port 6543) or <strong>Direct</strong> (port 5432)</li>
            <li>Copy the host, port, database name (<strong>postgres</strong>), user (<strong>postgres</strong>)</li>
            <li>Keep <strong>Require SSL</strong> checked (required for Supabase)</li>
          </ol>
          <a href="/how-to-connect" className="text-xs underline mt-2 inline-block opacity-80 hover:opacity-100">View full setup guide →</a>
        </div>
      </div>

      {!connected && !testing && testPhase !== "error" && (
        <div className="rounded-lg border p-5" style={{ borderColor: "rgba(148,163,184,0.08)", background: "rgba(255,255,255,0.02)" }}>
          <h2 className="text-sm font-semibold text-[#CBD5E1] mb-4 flex items-center gap-2">
            <Database size={14} style={{ color: "#14B8A6" }} />
            PostgreSQL Connection Details
          </h2>
          <form onSubmit={handleSubmit(testAndConnect)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-[#CBD5E1] mb-1">Host</label>
                <input
                  {...register("db_host", { required: "Required" })}
                  placeholder="db.<project-ref>.supabase.co"
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
                  placeholder="postgres"
                  className="surface-input w-full px-3 py-2 text-sm"
                  style={{ borderColor: "rgba(148,163,184,0.15)" }}
                />
                {errors.db_name && <p className="text-xs mt-1" style={{ color: "#EF4444" }}>{errors.db_name.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-[#CBD5E1] mb-1">User</label>
                <input
                  {...register("db_user", { required: "Required" })}
                  placeholder="postgres"
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
            <button type="submit" disabled={testing} className="inline-flex items-center gap-2 px-4 py-2 rounded text-xs font-semibold text-white transition-all disabled:opacity-50" style={{ background: "#14B8A6" }}>
              {testing ? <Loader2 size={13} className="animate-spin" /> : <Database size={13} />}
              {testing ? "Testing connection…" : "Test & Connect"}
            </button>
          </form>
        </div>
      )}

      {/* Connection test progress */}
      {(testing || testPhase === "done" || testPhase === "error") && (
        <div className="rounded-lg border p-5 space-y-3" style={{
          borderColor: testPhase === "done" ? "rgba(34,197,94,0.15)" : testPhase === "error" ? "rgba(239,68,68,0.2)" : "rgba(148,163,184,0.08)",
          background: testPhase === "done" ? "rgba(34,197,94,0.04)" : testPhase === "error" ? "rgba(239,68,68,0.04)" : "rgba(255,255,255,0.02)",
        }}>
          <div className="text-sm font-semibold flex items-center gap-2" style={{
            color: testPhase === "done" ? "#22C55E" : testPhase === "error" ? "#EF4444" : "#CBD5E1",
          }}>
            {testPhase === "done" ? <CheckCircle size={16} /> : testPhase === "error" ? <XCircle size={16} /> : <Loader2 size={16} className="animate-spin" />}
            {PHASE_LABELS[testPhase === "done" || testPhase === "error" ? testPhase : testPhase === "idle" ? "idle" : testPhase]}
          </div>

          {/* Phase timeline */}
          <div className="space-y-1.5 text-xs">
            {(["resolving", "connecting", "ssl", "schema", "analyzing"] as TestPhase[]).map((phase) => {
              const isActive = testPhase === phase
              const phaseOrder = ["resolving", "connecting", "ssl", "schema", "analyzing"]
              const isPast = testPhase === "done" || testPhase === "error" || (testPhase !== phase && phaseOrder.indexOf(testPhase) > phaseOrder.indexOf(phase))
              return (
                <div key={phase} className="flex items-center gap-2" style={{ color: isActive ? "#F8FAFC" : isPast ? "#22C55E" : "#64748B" }}>
                  {isPast && !(testPhase === "error" && !isActive)
                    ? <CheckCircle size={12} style={{ color: "#22C55E" }} />
                    : isActive
                      ? <Loader2 size={12} className="animate-spin" style={{ color: "#60A5FA" }} />
                      : <div className="w-3 h-3 rounded-full border" style={{ borderColor: "rgba(148,163,184,0.2)" }} />
                  }
                  <span>{PHASE_LABELS[phase]}</span>
                </div>
              )
            })}
          </div>

          {/* Success details */}
          {testPhase === "analyzing" && testResult?.table_count != null && (
            <div className="pt-2 text-xs space-y-2" style={{ color: "#64748B" }}>
              <p>Found <strong style={{ color: "#22C55E" }}>{testResult.table_count}</strong> table(s)</p>
              <div className="flex items-center gap-2 text-[#F8FAFC]">
                <Loader2 size={13} className="animate-spin" style={{ color: "#14B8A6" }} />
                <span>Generating schema visualizer & AI analysis…</span>
              </div>
            </div>
          )}

          {/* Error details */}
          {testPhase === "error" && testResult && (
            <div className="pt-2 text-xs space-y-1">
              <p style={{ color: "#EF4444" }}>{testResult.message}</p>
              {testResult.diagnostics && testResult.diagnostics.length > 0 && (
                <div className="mt-2 space-y-0.5 font-mono">
                  {testResult.diagnostics.map((line, i) => (
                    <p key={i} style={{
                      color: line.startsWith("✓") ? "#22C55E" : line.startsWith("✗") ? "#EF4444" : "#64748B",
                    }}>{line}</p>
                  ))}
                </div>
              )}
              {testResult.detail && (
                <p className="font-mono opacity-60 break-all mt-2" style={{ color: "#EF4444" }}>{testResult.detail}</p>
              )}
              <button onClick={() => { setTestPhase("idle"); setTestResult(null) }}
                className="text-xs underline mt-2 opacity-70 hover:opacity-100" style={{ color: "#EF4444" }}>
                Try again
              </button>
            </div>
          )}
        </div>
      )}

      {connected && creds && (
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
