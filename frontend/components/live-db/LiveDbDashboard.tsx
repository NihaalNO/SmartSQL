"use client"

import { useCallback, useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { AlertTriangle, Database, FileText, Layers, Loader2, Network, Sparkles, Table2, Zap } from "lucide-react"
import SQLPreview from "@/components/SQLPreview"
import ResultsTable from "@/components/ResultsTable"
import ChartView from "@/components/ChartView"
import { Button } from "@/components/ui/button"
import { liveDbApi } from "@/lib/live-db/api"
import type { DatabaseMetadata, DbType } from "@/lib/live-db/databases"
import type { LiveDbConfig } from "@/lib/live-db/formSchemas"
import type { QueryResult, SchemaAnalysis, SchemaDocumentation, SchemaVisualization } from "@/types"
import { AnalyticsDashboard } from "./AnalyticsDashboard"

const SchemaTab = dynamic(() => import("@/components/LiveDbSchemaTabs").then((m) => ({ default: m.SchemaTab })), { ssr: false })
const SchemaHealthTabView = dynamic(() => import("@/components/LiveDbSchemaTabs").then((m) => ({ default: m.SchemaHealthTabView })), { ssr: false })
const AiInsightsTabView = dynamic(() => import("@/components/LiveDbSchemaTabs").then((m) => ({ default: m.AiInsightsTabView })), { ssr: false })
const DocumentationTabView = dynamic(() => import("@/components/LiveDbSchemaTabs").then((m) => ({ default: m.DocumentationTabView })), { ssr: false })
const SchemaStyles = dynamic(() => import("@/components/LiveDbSchemaTabs").then((m) => ({ default: m.SchemaStyles })), { ssr: false })

type DashboardTab = "query" | "schema" | "tables" | "er" | "ai" | "info"

interface LiveDbDashboardProps {
  database: DatabaseMetadata
  dbType: DbType
  config: LiveDbConfig
  testResult?: { table_count?: number; tables?: string[]; message?: string } | null
  onDisconnect: () => void
}

export function LiveDbDashboard({ database, dbType, config, testResult, onDisconnect }: LiveDbDashboardProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("query")
  const [question, setQuestion] = useState("")
  const [provider, setProvider] = useState("groq")
  const [loading, setLoading] = useState(false)
  const [schemaLoading, setSchemaLoading] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  const [result, setResult] = useState<QueryResult | null>(null)
  const [viz, setViz] = useState<SchemaVisualization | null>(null)
  const [analysis, setAnalysis] = useState<SchemaAnalysis | null>(null)
  const [doc, setDoc] = useState<SchemaDocumentation | null>(null)
  const [stats, setStats] = useState<Record<string, number | string | string[] | null> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<QueryResult[]>([])

  const fetchSchema = useCallback(async () => {
    setSchemaLoading(true)
    setError(null)
    try {
      const res = await liveDbApi.schema({ dbType, config })
      setViz(res.visualization)
      setAnalysis(null)
      setDoc({
        markdown: `# ${database.name} live schema\n\nDiscovered ${res.visualization?.tables?.length ?? 0} table(s) for this ephemeral session.`,
        generated_at: new Date().toISOString(),
        table_count: res.visualization?.tables?.length ?? 0,
        relationship_count: res.visualization?.foreign_keys?.length ?? 0,
        index_count: res.visualization?.indexes?.length ?? 0,
      })
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string; message?: string } } })?.response?.data?.detail || (err as Error)?.message || "Fetching schema failed")
    } finally {
      setSchemaLoading(false)
    }
  }, [config, database.name, dbType])

  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const res = await liveDbApi.stats({ dbType, config })
      setStats(res.stats)
    } catch {
      setStats(null)
    } finally {
      setStatsLoading(false)
    }
  }, [config, dbType])

  useEffect(() => {
    fetchSchema()
    fetchStats()
  }, [fetchSchema, fetchStats])

  async function runQuery(event: React.FormEvent) {
    event.preventDefault()
    if (!question.trim()) return
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const data = await liveDbApi.query({
        dbType,
        config,
        question: question.trim(),
        model_provider: provider,
      })
      setResult(data)
      setHistory((current) => [data, ...current].slice(0, 10))
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string; message?: string } } })?.response?.data?.detail || "Running query failed")
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: "query" as const, label: "SQL Query Editor", icon: Zap },
    { id: "schema" as const, label: "Schema Visualizer", icon: Layers },
    { id: "tables" as const, label: "Table Explorer", icon: Table2 },
    { id: "er" as const, label: "ER Diagram", icon: Network },
    { id: "ai" as const, label: "AI Query Assistant", icon: Sparkles },
    { id: "info" as const, label: "Connection Info", icon: Database },
  ]

  return (
    <div className="space-y-5">
      <SchemaStyles />
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-primary">Connected to {database.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">Ephemeral session - credentials are never saved or returned by the API.</p>
          </div>
          <Button type="button" size="sm" variant="secondary" onClick={onDisconnect}>Disconnect</Button>
        </div>
      </div>

      {database.supportsAnalyticsFeatures && (
        <AnalyticsDashboard
          database={database}
          stats={stats}
          lastExecutionMs={result?.execution_time_ms ?? null}
          bytesScanned={(result as QueryResult & { bytes_scanned?: number | null } | null)?.bytes_scanned ?? null}
          historyCount={history.length}
        />
      )}

      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-secondary p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                isActive ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <div className="flex gap-2"><AlertTriangle size={16} /> {error}</div>
        </div>
      )}

      {activeTab === "query" && (
        <div className="space-y-5">
          <form onSubmit={runQuery} className="rounded-lg border border-border bg-card p-4">
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder={`Ask a question about your ${database.name} database...`}
              rows={4}
              className="w-full resize-none rounded-md border border-input bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <select value={provider} onChange={(event) => setProvider(event.target.value)} className="h-9 rounded-md border border-input bg-card px-3 text-xs text-foreground">
                <option value="groq">Groq</option>
                <option value="gemini">Gemini</option>
                <option value="ollama">Ollama</option>
              </select>
              <Button type="submit" disabled={loading || !question.trim()} variant="primary" size="sm">
                {loading ? <><Loader2 size={13} className="animate-spin" /> Running query...</> : <><Zap size={13} /> Run Query</>}
              </Button>
            </div>
          </form>
          {result?.generated_sql && <SQLPreview sql={result.generated_sql} status={result.status} />}
          {result?.status === "success" && result.rows.length > 0 && (
            <>
              <ChartView columns={result.columns} rows={result.rows} />
              <ResultsTable columns={result.columns} rows={result.rows} rowCount={result.row_count} executionTimeMs={result.execution_time_ms} />
            </>
          )}
          {result?.status === "blocked" && <div className="rounded-lg border border-warning/20 bg-warning/10 p-4 text-sm text-amber-500">{result.error}</div>}
          {result?.status === "failed" && <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">{result.error}</div>}
        </div>
      )}

      {activeTab === "schema" && <SchemaTab viz={viz} loading={schemaLoading} />}
      {activeTab === "tables" && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">Tables</h2>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            {(viz?.tables ?? []).map((table) => (
              <div key={`${table.schema}.${table.name}`} className="rounded-md border border-border p-3">
                <p className="text-sm font-medium text-foreground">{table.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{table.columns.length} columns · {table.row_estimate ?? "unknown"} estimated rows</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {activeTab === "er" && (
        <div className="space-y-4">
          <SchemaTab viz={viz} loading={schemaLoading} />
          {viz && <SchemaHealthTabView score={viz.health_score} issues={viz.health_issues} />}
        </div>
      )}
      {activeTab === "ai" && (
        <div className="space-y-4">
          <AiInsightsTabView analysis={analysis} loading={schemaLoading} />
          <DocumentationTabView doc={doc} loading={schemaLoading} onDownload={() => {
            if (!doc) return
            const blob = new Blob([doc.markdown], { type: "text/markdown" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `live-db-${database.id}-schema.md`
            a.click()
            URL.revokeObjectURL(url)
          }} />
        </div>
      )}
      {activeTab === "info" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">Connection Info</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Database</dt><dd className="text-foreground">{database.name}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Category</dt><dd className="text-foreground">{database.category}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Tables</dt><dd className="text-foreground">{testResult?.table_count ?? stats?.table_count ?? 0}</dd></div>
            </dl>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground"><FileText size={15} /> Current-session Query History</h2>
            <div className="mt-3 space-y-2">
              {history.length === 0 ? <p className="text-sm text-muted-foreground">No live queries in this session yet.</p> : history.map((item, index) => (
                <div key={`${item.generated_sql}-${index}`} className="rounded-md border border-border p-2 text-xs text-muted-foreground">
                  {item.natural_language_query}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {statsLoading && <p className="text-xs text-muted-foreground">Fetching database stats...</p>}
    </div>
  )
}
