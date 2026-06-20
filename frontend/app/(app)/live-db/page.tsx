"use client"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import {
  Zap, AlertTriangle, Eye, EyeOff, Info, Database,
  CheckCircle, XCircle, Loader2, Layers, Sparkles, Shield, FileText,
} from "lucide-react"
import toast from "react-hot-toast"
import { queryApi, schemaApi } from "@/lib/api"
import { canUseLiveDb } from "@/lib/auth"
import dynamic from "next/dynamic"
import SQLPreview from "@/components/SQLPreview"
import ResultsTable from "@/components/ResultsTable"
import ChartView from "@/components/ChartView"
import type { QueryResult, SchemaVisualization, SchemaAnalysis, SchemaDocumentation } from "@/types"

const SchemaTab = dynamic(() => import("@/components/LiveDbSchemaTabs").then(m => ({ default: m.SchemaTab })), { ssr: false })
const SchemaHealthTabView = dynamic(() => import("@/components/LiveDbSchemaTabs").then(m => ({ default: m.SchemaHealthTabView })), { ssr: false })
const AiInsightsTabView = dynamic(() => import("@/components/LiveDbSchemaTabs").then(m => ({ default: m.AiInsightsTabView })), { ssr: false })
const DocumentationTabView = dynamic(() => import("@/components/LiveDbSchemaTabs").then(m => ({ default: m.DocumentationTabView })), { ssr: false })
const SchemaStyles = dynamic(() => import("@/components/LiveDbSchemaTabs").then(m => ({ default: m.SchemaStyles })), { ssr: false })

// ── Types ────────────────────────────────────────────────────────────────────

interface CredForm {
  db_host: string
  db_port: number
  db_name: string
  db_user: string
  db_password: string
  ssl_required: boolean
}

type TestPhase = "idle" | "resolving" | "connecting" | "ssl" | "schema" | "done" | "error"

const PHASE_LABELS: Record<TestPhase, string> = {
  idle: "Ready",
  resolving: "Resolving host…",
  connecting: "Establishing connection…",
  ssl: "Verifying SSL certificate…",
  schema: "Discovering tables and columns…",
  done: "Connected successfully",
  error: "Connection failed",
}

type AppTab = "overview" | "schema" | "health" | "insights" | "docs"

const APP_TABS: { id: AppTab; label: string; icon: typeof Layers }[] = [
  { id: "overview", label: "Overview", icon: Zap },
  { id: "schema", label: "Schema", icon: Layers },
  { id: "health", label: "Health", icon: Shield },
  { id: "insights", label: "AI Insights", icon: Sparkles },
  { id: "docs", label: "Documentation", icon: FileText },
]

const SCHEMA_TABS: AppTab[] = ["schema", "health", "insights", "docs"]

// ── Page ─────────────────────────────────────────────────────────────────────

export default function LiveDbPage() {
  const router = useRouter()
  const [connected, setConnected] = useState(false)
  const [creds, setCreds] = useState<CredForm | null>(null)
  const [showPw, setShowPw] = useState(false)
  const [question, setQuestion] = useState("")
  const [provider, setProvider] = useState("groq")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<QueryResult | null>(null)
  const [connError, setConnError] = useState<string | null>(null)

  // Connection test
  const [testing, setTesting] = useState(false)
  const [testPhase, setTestPhase] = useState<TestPhase>("idle")
  const [testResult, setTestResult] = useState<{ status: string; message: string; table_count?: number; tables?: string[] } | null>(null)

  // Active tab
  const [activeTab, setActiveTab] = useState<AppTab>("overview")

  // Schema data
  const [viz, setViz] = useState<SchemaVisualization | null>(null)
  const [analysis, setAnalysis] = useState<SchemaAnalysis | null>(null)
  const [doc, setDoc] = useState<SchemaDocumentation | null>(null)
  const [schemaLoading, setSchemaLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [docLoading, setDocLoading] = useState(false)
  const [schemaError, setSchemaError] = useState<string | null>(null)

  useEffect(() => {
    if (!canUseLiveDb()) router.replace("/dashboard")
  }, [router])

  const { register, handleSubmit, formState: { errors } } = useForm<CredForm>({
    defaultValues: { db_port: 5432, ssl_required: true },
  })

  const fetchVisualization = useCallback(async (data: CredForm) => {
    const cacheKey = `schema-viz:${data.db_host}:${data.db_port}:${data.db_name}:${data.db_user}`
    let cached: SchemaVisualization | null = null
    try {
      const raw = sessionStorage.getItem(cacheKey)
      if (raw) { cached = JSON.parse(raw) as SchemaVisualization }
    } catch { /* ignore stale cache */ }

    if (cached) {
      setViz(cached)
      setSchemaLoading(false)
      return
    }

    try {
      const res = await schemaApi.externalVisualize(data)
      const viz = res.visualization as SchemaVisualization
      setViz(viz)
      try { sessionStorage.setItem(cacheKey, JSON.stringify(viz)) } catch { /* quota exceeded */ }
    } catch (err: unknown) {
      setSchemaError((err as Error)?.message || "Schema visualization failed")
    }
    setSchemaLoading(false)
  }, [])

  const fetchAnalysis = useCallback(async (data: CredForm) => {
    try {
      const res = await schemaApi.externalAnalyze(data)
      if (res.analysis) setAnalysis(res.analysis)
      if (res.documentation) setDoc(res.documentation)
    } catch {
      /* AI/doc failure is non-fatal — schema already rendered */
    }
    setAiLoading(false)
    setDocLoading(false)
  }, [])

  const discoverSchema = useCallback(async (data: CredForm) => {
    setSchemaLoading(true)
    setAiLoading(true)
    setDocLoading(true)
    setSchemaError(null)
    fetchVisualization(data)
    fetchAnalysis(data)
  }, [fetchVisualization, fetchAnalysis])

  const testAndConnect = async (data: CredForm) => {
    setTesting(true)
    setTestPhase("resolving")
    setTestResult(null)
    setConnError(null)

    const cancelAdvance = (() => {
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
        db_host: data.db_host, db_port: data.db_port, db_name: data.db_name,
        db_user: data.db_user, db_password: data.db_password, ssl_required: data.ssl_required,
      })
      cancelAdvance()

      if (res.status === "ok") {
        setTestPhase("done")
        setTestResult({ status: "ok", message: res.message, table_count: res.table_count, tables: res.tables })
        setCreds(data)
        setConnected(true)
        setActiveTab("schema")

        discoverSchema(data)

        toast.success(res.message || "Connected successfully")
      } else {
        setTestPhase("error")
        setTestResult({ status: "error", message: res.message })
      }
    } catch (err: unknown) {
      cancelAdvance()
      setTestPhase("error")
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || (err as Error)?.message || "Connection test failed"
      setTestResult({ status: "error", message: detail })
    } finally {
      setTesting(false)
    }
  }

  const disconnect = () => {
    setCreds(null); setConnected(false); setResult(null); setQuestion(""); setConnError(null)
    setTestPhase("idle"); setTestResult(null); setViz(null); setAnalysis(null); setDoc(null)
    setSchemaLoading(false); setAiLoading(false); setDocLoading(false); setSchemaError(null)
    setActiveTab("overview")
  }

  const runQuery = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!creds || !question.trim()) return
    setLoading(true); setResult(null); setConnError(null)
    try {
      const data = await queryApi.runLive({
        question: question.trim(), model_provider: provider,
        db_host: creds.db_host, db_port: creds.db_port, db_name: creds.db_name,
        db_user: creds.db_user, db_password: creds.db_password, ssl_required: creds.ssl_required,
      })
      setResult(data)
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Query failed"
      setConnError(detail)
      const isFatal = detail.includes("Could not connect") || detail.includes("authentication failed") || detail.includes("Connection refused")
      if (isFatal) { setCreds(null); setConnected(false); setResult(null) }
    } finally { setLoading(false) }
  }

  const handleDownloadDoc = () => {
    if (!doc) return
    const blob = new Blob([doc.markdown], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = `schema-docs-${new Date().toISOString().split("T")[0]}.md`
    a.click(); URL.revokeObjectURL(url)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5 animate-fade-in-up">
      <SchemaStyles />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#F8FAFC] flex items-center gap-2">
            <Zap size={18} style={{ color: "#F59E0B" }} />
            Live DB Mode
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>
            Connect any PostgreSQL database for querying, schema visualization, and AI analysis.
          </p>
        </div>
      </div>

      {connError && (
        <div className="rounded-lg border p-4 flex gap-3" style={{ borderColor: "rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.04)" }}>
          <AlertTriangle size={16} style={{ color: "#EF4444" }} className="shrink-0 mt-0.5" />
          <div className="text-sm" style={{ color: "#EF4444" }}>
            <p className="font-semibold mb-1">Query error</p>
            <p className="text-xs opacity-80">{connError}</p>
            <button onClick={() => setConnError(null)} className="text-xs underline mt-1 opacity-70 hover:opacity-100" style={{ color: "#EF4444" }}>Dismiss</button>
          </div>
        </div>
      )}

      {/* Connection status bar (when connected) */}
      {connected && creds && (
        <div className="rounded-lg border p-3 flex items-center justify-between" style={{ borderColor: "rgba(34,197,94,0.15)", background: "rgba(34,197,94,0.04)" }}>
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse-dot" />
            <span className="text-sm font-medium" style={{ color: "#22C55E" }}>
              Connected to <code className="font-mono">{creds.db_host}/{creds.db_name}</code>
              {creds.ssl_required && <span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.15)" }}>SSL</span>}
            </span>
          </div>
          <button onClick={disconnect} className="text-xs" style={{ color: "#EF4444" }}>Disconnect</button>
        </div>
      )}

      {/* Connection form (not connected, not testing, no error) */}
      {!connected && !testing && testPhase !== "error" && (
        <>
          <div className="rounded-lg border p-4 flex gap-3" style={{ borderColor: "rgba(245,158,11,0.15)", background: "rgba(245,158,11,0.04)" }}>
            <AlertTriangle size={16} style={{ color: "#F59E0B" }} className="shrink-0 mt-0.5" />
            <div className="text-sm" style={{ color: "#F59E0B" }}>
              <p className="font-medium">Ephemeral session — credentials are never saved</p>
              <p className="text-xs mt-1 opacity-80">Your password is held in memory only for this browser session.</p>
            </div>
          </div>
          <div className="rounded-lg border p-5" style={{ borderColor: "rgba(148,163,184,0.08)", background: "rgba(255,255,255,0.02)" }}>
            <h2 className="text-sm font-semibold text-[#CBD5E1] mb-4 flex items-center gap-2">
              <Database size={14} style={{ color: "#14B8A6" }} />
              PostgreSQL Connection Details
            </h2>
            <form onSubmit={handleSubmit(testAndConnect)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-[#CBD5E1] mb-1">Host</label>
                  <input {...register("db_host", { required: "Required" })} placeholder="db.<project-ref>.supabase.co"
                    className="surface-input w-full px-3 py-2 text-sm" style={{ borderColor: "rgba(148,163,184,0.15)" }} />
                  {errors.db_host && <p className="text-xs mt-1" style={{ color: "#EF4444" }}>{errors.db_host.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#CBD5E1] mb-1">Port</label>
                  <input {...register("db_port", { required: true, valueAsNumber: true })} type="number"
                    className="surface-input w-full px-3 py-2 text-sm" style={{ borderColor: "rgba(148,163,184,0.15)" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#CBD5E1] mb-1">Database</label>
                  <input {...register("db_name", { required: "Required" })} placeholder="postgres"
                    className="surface-input w-full px-3 py-2 text-sm" style={{ borderColor: "rgba(148,163,184,0.15)" }} />
                  {errors.db_name && <p className="text-xs mt-1" style={{ color: "#EF4444" }}>{errors.db_name.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#CBD5E1] mb-1">User</label>
                  <input {...register("db_user", { required: "Required" })} placeholder="postgres"
                    className="surface-input w-full px-3 py-2 text-sm" style={{ borderColor: "rgba(148,163,184,0.15)" }} />
                  {errors.db_user && <p className="text-xs mt-1" style={{ color: "#EF4444" }}>{errors.db_user.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#CBD5E1] mb-1">Password</label>
                  <div className="relative">
                    <input {...register("db_password", { required: "Required" })} type={showPw ? "text" : "password"} placeholder="••••••••"
                      className="surface-input w-full px-3 py-2 pr-9 text-sm" style={{ borderColor: "rgba(148,163,184,0.15)" }} />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: "#64748B" }}>
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {errors.db_password && <p className="text-xs mt-1" style={{ color: "#EF4444" }}>{errors.db_password.message}</p>}
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <input {...register("ssl_required")} type="checkbox" id="ssl_required" className="accent-[#14B8A6]" />
                  <label htmlFor="ssl_required" className="text-xs cursor-pointer" style={{ color: "#CBD5E1" }}>Require SSL</label>
                </div>
              </div>
              <button type="submit" disabled={testing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded text-xs font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: "#14B8A6" }}>
                {testing ? <Loader2 size={13} className="animate-spin" /> : <Database size={13} />}
                {testing ? "Testing connection…" : "Test & Connect"}
              </button>
            </form>
          </div>
        </>
      )}

      {/* Connection test progress */}
      {(testing || testPhase === "done" || testPhase === "error") && (
        <div className="rounded-lg border p-5 space-y-3" style={{
          borderColor: testPhase === "done" ? "rgba(34,197,94,0.15)" : testPhase === "error" ? "rgba(239,68,68,0.2)" : "rgba(148,163,184,0.08)",
          background: testPhase === "done" ? "rgba(34,197,94,0.04)" : testPhase === "error" ? "rgba(239,68,68,0.04)" : "rgba(255,255,255,0.02)",
        }}>
          <div className="text-sm font-semibold flex items-center gap-2" style={{ color: testPhase === "done" ? "#22C55E" : testPhase === "error" ? "#EF4444" : "#CBD5E1" }}>
            {testPhase === "done" ? <CheckCircle size={16} /> : testPhase === "error" ? <XCircle size={16} /> : <Loader2 size={16} className="animate-spin" />}
            {PHASE_LABELS[testPhase]}
          </div>
          <div className="space-y-1.5 text-xs">
            {(["resolving", "connecting", "ssl", "schema"] as const).map((phase) => {
              const order = ["resolving", "connecting", "ssl", "schema"]
              const idx = order.indexOf(phase)
              const curIdx = order.indexOf(testPhase as string)
              const phaseDone = testPhase === "done"
              const phaseErr = testPhase === "error"
              const isPast = phaseDone || phaseErr || (!(testPhase === phase) && curIdx > idx)
              const col = isPast ? (phaseErr ? "#64748B" : "#22C55E") : testPhase === phase ? "#F8FAFC" : "#64748B"
              return (
                <div key={phase} className="flex items-center gap-2" style={{ color: col }}>
                  {isPast && !phaseErr ? <CheckCircle size={12} style={{ color: "#22C55E" }} />
                    : testPhase === phase ? <Loader2 size={12} className="animate-spin" style={{ color: "#60A5FA" }} />
                      : <div className="w-3 h-3 rounded-full border" style={{ borderColor: "rgba(148,163,184,0.2)" }} />}
                  <span>{PHASE_LABELS[phase]}</span>
                </div>
              )
            })}
          </div>
          {testPhase === "done" && testResult?.table_count != null && (
            <div className="pt-2 text-xs" style={{ color: "#64748B" }}>
              <p>Found <strong style={{ color: "#22C55E" }}>{testResult.table_count}</strong> table(s)</p>
              {testResult.tables && testResult.tables.length > 0 && (
                <p className="font-mono mt-1" style={{ color: "#F8FAFC" }}>
                  {testResult.tables.slice(0, 6).join(", ")}{testResult.tables.length > 6 ? ` +${testResult.tables.length - 6} more` : ""}
                </p>
              )}
            </div>
          )}
          {testPhase === "error" && testResult && (
            <div className="pt-2 text-xs space-y-1">
              <p style={{ color: "#EF4444" }}>{testResult.message}</p>
              <button onClick={() => { setTestPhase("idle"); setTestResult(null) }}
                className="text-xs underline mt-2 opacity-70 hover:opacity-100" style={{ color: "#EF4444" }}>Try again</button>
            </div>
          )}
        </div>
      )}

      {/* Connected — tabs */}
      {connected && creds && (
        <div className="space-y-5">
          {/* Tab bar */}
          <div className="flex items-center gap-1 rounded-lg bg-[#0F172A] border border-white/[0.08] p-1 w-fit">
            {APP_TABS.map((tab) => {
              const Icon = tab.icon
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    activeTab === tab.id ? "bg-[#14B8A6]/10 text-[#14B8A6]" : "text-[#64748B] hover:text-[#94A3B8]"
                  }`}>
                  <Icon size={13} />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Tab content */}
          {activeTab === "overview" && (
            <div className="space-y-5">
              <div className="rounded-lg border p-4" style={{ borderColor: "rgba(148,163,184,0.08)", background: "rgba(255,255,255,0.02)" }}>
                <form onSubmit={runQuery} className="space-y-3">
                  <textarea value={question} onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask a question about your database in plain English…"
                    rows={3} className="surface-input w-full px-3 py-2.5 text-sm resize-none"
                    style={{ borderColor: "rgba(148,163,184,0.15)" }} />
                  <div className="flex items-center gap-3">
                    <select value={provider} onChange={(e) => setProvider(e.target.value)}
                      className="surface-input px-3 py-1.5 text-xs" style={{ borderColor: "rgba(148,163,184,0.15)" }}>
                      <option value="groq">Groq (llama-3.3-70b)</option>
                      <option value="gemini">Gemini 1.5 Flash</option>
                      <option value="ollama">Ollama (local)</option>
                    </select>
                    <button type="submit" disabled={loading || !question.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-semibold text-white disabled:opacity-50 transition-all"
                      style={{ background: "#14B8A6" }}>
                      <Zap size={13} /> {loading ? "Running…" : "Run Live Query"}
                    </button>
                  </div>
                </form>
              </div>
              {result && (
                <>
                  {result.status === "blocked" && (
                    <div className="rounded-lg border p-4 flex gap-3" style={{ borderColor: "rgba(245,158,11,0.2)", background: "rgba(245,158,11,0.04)" }}>
                      <AlertTriangle size={16} style={{ color: "#F59E0B" }} className="shrink-0 mt-0.5" />
                      <div className="text-sm" style={{ color: "#F59E0B" }}><p className="font-semibold">Query not generated</p><p className="text-xs mt-1 opacity-80">{result.error}</p></div>
                    </div>
                  )}
                  {result.generated_sql && <SQLPreview sql={result.generated_sql} status={result.status} />}
                  {result.status === "success" && result.rows.length > 0 && (
                    <><ChartView columns={result.columns} rows={result.rows} /><ResultsTable columns={result.columns} rows={result.rows} rowCount={result.row_count} executionTimeMs={result.execution_time_ms} /></>
                  )}
                  {result.status === "failed" && result.error && (
                    <div className="rounded-lg border p-4 flex gap-3" style={{ borderColor: "rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.04)" }}>
                      <AlertTriangle size={16} style={{ color: "#EF4444" }} className="shrink-0" /><p className="text-sm" style={{ color: "#EF4444" }}>{result.error}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === "schema" && <SchemaTab viz={viz} loading={schemaLoading} />}
          {activeTab === "health" && (
            <>
              {schemaError && (
                <div className="rounded-lg border p-4 flex gap-3" style={{ borderColor: "rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.04)" }}>
                  <XCircle size={16} style={{ color: "#EF4444" }} className="shrink-0" /><p className="text-sm" style={{ color: "#EF4444" }}>{schemaError}</p>
                </div>
              )}
              {viz ? <SchemaHealthTabView score={viz.health_score} issues={viz.health_issues} />
                : <div className="flex items-center justify-center py-16 text-sm text-[#64748B]">No health data. Connect to a database first.</div>}
            </>
          )}
          {activeTab === "insights" && <AiInsightsTabView analysis={analysis} loading={aiLoading} />}
          {activeTab === "docs" && <DocumentationTabView doc={doc} loading={docLoading} onDownload={handleDownloadDoc} />}
        </div>
      )}
    </div>
  )
}
