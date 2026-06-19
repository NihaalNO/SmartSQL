"use client"
import { useState, useCallback, useMemo, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import dagre from "dagre"
import {
  Database,
  Table,
  Search,
  Eye,
  EyeOff,
  Shield,
  AlertTriangle,
  Info,
  Layers,
  Key,
  Hash,
  CheckCircle,
  XCircle,
  Loader2,
  Download,
  FileText,
  Cpu,
  Sparkles,
} from "lucide-react"
import { schemaApi } from "@/lib/api"
import { getUser } from "@/lib/auth"
import type {
  SchemaVisualization,
  TableInfo,
  ForeignKeyInfo,
  SchemaAnalysis,
  SchemaDocumentation,
  SchemaAnalyzeResponse,
} from "@/types"

// ── Constants ────────────────────────────────────────────────────────────────

const NODE_W = 240
const ROW_H = 30
const HEADER_H = 44

// ── Layout engine ────────────────────────────────────────────────────────────

function layoutGraph(tables: TableInfo[], fks: ForeignKeyInfo[]) {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 100, marginx: 40, marginy: 40 })
  for (const t of tables) {
    g.setNode(t.name, { width: NODE_W, height: Math.max(HEADER_H + t.columns.length * ROW_H + 12, 80) })
  }
  for (const fk of fks) g.setEdge(fk.source_table, fk.target_table)
  dagre.layout(g)
  const nodes = tables.map((t) => {
    const n = g.node(t.name)
    return { id: t.name, type: "schemaTable", position: { x: n.x - NODE_W / 2, y: n.y - n.height / 2 }, data: { table: t } }
  })
  const edges = fks.map((fk, i) => ({
    id: `fk-${fk.constraint_name || i}`,
    source: fk.source_table,
    target: fk.target_table,
    sourceHandle: `${fk.source_table}-${fk.source_column}`,
    targetHandle: `${fk.target_table}-${fk.target_column}`,
    type: "smoothstep",
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed, color: "#14B8A6" },
    style: { stroke: "#14B8A6", strokeWidth: 1.5, opacity: 0.6 },
    label: `${fk.source_column} → ${fk.target_column}`,
  }))
  return { nodes, edges }
}

// ── Custom React Flow Node ───────────────────────────────────────────────────

function SchemaTableNode({ data, selected }: { data: { table: TableInfo }; selected?: boolean }) {
  const { table } = data
  const isView = table.type === "view"
  return (
    <div
      className={`rounded-xl overflow-hidden border transition-shadow duration-200 ${
        selected ? "border-[#14B8A6] shadow-[0_0_20px_rgba(20,184,166,0.25)]" : "border-white/[0.08] shadow-lg"
      }`}
      style={{ width: NODE_W, background: "rgba(15,23,42,0.95)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="flex items-center gap-2 px-3 border-b border-white/[0.06]"
        style={{ height: HEADER_H, background: isView ? "rgba(99,102,241,0.15)" : "rgba(20,184,166,0.08)" }}
      >
        {isView ? <Eye size={14} className="shrink-0 text-indigo-400" /> : <Table size={14} className="shrink-0 text-[#14B8A6]" />}
        <span className="text-sm font-semibold text-[#F8FAFC] truncate">{table.name}</span>
        {table.row_estimate != null && (
          <span className="ml-auto text-[10px] text-[#64748B] font-mono">{table.row_estimate.toLocaleString()} rows</span>
        )}
      </div>
      <div className="divide-y divide-white/[0.04]">
        {table.columns.map((col) => (
          <div key={col.name} className="flex items-center gap-2 px-3 text-xs hover:bg-white/[0.02] transition-colors" style={{ height: ROW_H }}>
            {col.is_pk && <Key size={10} className="shrink-0 text-amber-400" />}
            {col.is_unique && !col.is_pk && <Hash size={10} className="shrink-0 text-blue-400" />}
            <Handle type="source" position={Position.Right} id={`${table.name}-${col.name}`} style={{ width: 0, height: 0, background: "transparent", border: "none" }} />
            <Handle type="target" position={Position.Left} id={`${table.name}-${col.name}`} style={{ width: 0, height: 0, background: "transparent", border: "none" }} />
            <span className={`font-mono ${col.is_pk ? "text-amber-300 font-medium" : "text-[#CBD5E1]"}`}>{col.name}</span>
            <span className="ml-auto text-[#64748B] font-mono text-[10px] truncate max-w-[100px] text-right" title={col.type}>{col.type}</span>
            {!col.nullable && <span className="text-[10px] text-red-400 shrink-0 font-mono">NN</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

const nodeTypes = { schemaTable: SchemaTableNode }

// ── Sub-components ───────────────────────────────────────────────────────────

function StatusIndicator({ label, status, detail }: { label: string; status: "pending" | "running" | "done" | "error"; detail?: string }) {
  return (
    <div className="flex items-center gap-2 text-xs" style={{ color: status === "done" ? "#22C55E" : status === "error" ? "#EF4444" : status === "running" ? "#14B8A6" : "#64748B" }}>
      {status === "done" ? <CheckCircle size={12} /> : status === "error" ? <XCircle size={12} /> : status === "running" ? <Loader2 size={12} className="animate-spin" /> : <div className="w-3 h-3 rounded-full border border-white/[0.2]" />}
      <span className="font-medium">{label}</span>
      {detail && <span className="opacity-60 ml-auto">{detail}</span>}
    </div>
  )
}

function HealthBar({ score, issues }: { score: number; issues: string[] }) {
  const color = score >= 80 ? "#22C55E" : score >= 50 ? "#F59E0B" : "#EF4444"
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0F172A] p-4">
      <div className="flex items-center gap-3 mb-3">
        <Shield size={18} className="shrink-0" style={{ color }} />
        <span className="text-sm font-semibold text-[#F8FAFC]">Schema Health</span>
        <span className="ml-auto text-lg font-bold font-mono" style={{ color }}>{score}/100</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] mb-3 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, background: color }} />
      </div>
      {issues.length > 0 && issues.map((issue, i) => (
        <div key={i} className="flex items-start gap-2 text-xs text-[#94A3B8] mb-1"><AlertTriangle size={12} className="shrink-0 mt-0.5 text-amber-400" /><span>{issue}</span></div>
      ))}
      {issues.length === 0 && <p className="text-xs text-[#22C55E] flex items-center gap-1.5"><CheckCircle size={12} /> No issues found</p>}
    </div>
  )
}

function TableInspector({ table, onClose }: { table: TableInfo; onClose: () => void }) {
  const pkCount = table.columns.filter((c) => c.is_pk).length
  const nullableCount = table.columns.filter((c) => c.nullable).length
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0F172A] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
        <Table size={16} className="text-[#14B8A6]" /><span className="text-sm font-semibold text-[#F8FAFC]">{table.name}</span>
        <button onClick={onClose} className="ml-auto text-[#64748B] hover:text-[#F8FAFC] text-xs">✕</button>
      </div>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-white/[0.04] p-2.5 text-center"><p className="text-xs text-[#64748B]">Columns</p><p className="text-lg font-bold font-mono text-[#F8FAFC]">{table.columns.length}</p></div>
          <div className="rounded-lg bg-white/[0.04] p-2.5 text-center"><p className="text-xs text-[#64748B]">PK</p><p className="text-lg font-bold font-mono text-amber-400">{pkCount}</p></div>
          <div className="rounded-lg bg-white/[0.04] p-2.5 text-center"><p className="text-xs text-[#64748B]">Nullable</p><p className="text-lg font-bold font-mono text-[#F8FAFC]">{nullableCount}</p></div>
        </div>
        {table.row_estimate != null && <div className="flex items-center gap-2 text-xs text-[#94A3B8]"><Database size={12} /> Estimated rows: <span className="font-mono text-[#F8FAFC]">{table.row_estimate.toLocaleString()}</span></div>}
        <div>
          <p className="text-xs font-medium text-[#64748B] mb-2">Columns</p>
          <div className="space-y-1 max-h-[240px] overflow-y-auto custom-scrollbar">
            {table.columns.map((col) => (
              <div key={col.name} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-md hover:bg-white/[0.04]">
                {col.is_pk && <Key size={10} className="text-amber-400 shrink-0" />}
                <span className="text-[#CBD5E1] font-mono">{col.name}</span>
                <span className="ml-auto text-[#64748B] font-mono text-[10px]">{col.type}</span>
                {col.is_unique && <span className="text-[10px] text-blue-400">UNIQUE</span>}
                {!col.nullable && <span className="text-[10px] text-red-400">NN</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function AiAnalysisPanel({ analysis }: { analysis: SchemaAnalysis | null }) {
  const [open, setOpen] = useState(true)
  if (!analysis) return null
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0F172A] overflow-hidden">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 w-full px-4 py-3 border-b border-white/[0.06] text-left">
        <Sparkles size={16} className="text-[#14B8A6]" />
        <span className="text-sm font-semibold text-[#F8FAFC]">Schema Intelligence</span>
        <span className="ml-auto text-xs text-[#64748B]">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="p-4 space-y-4 text-sm">
          <div>
            <p className="text-xs font-medium text-[#64748B] mb-1">Purpose</p>
            <p className="text-[#CBD5E1]">{analysis.purpose}</p>
          </div>
          {analysis.core_entities.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[#64748B] mb-1">Core Entities</p>
              <div className="flex flex-wrap gap-1.5">
                {analysis.core_entities.map((e) => (
                  <span key={e} className="px-2 py-0.5 rounded-md text-xs bg-[#14B8A6]/10 text-[#14B8A6]">{e}</span>
                ))}
              </div>
            </div>
          )}
          {analysis.lookup_tables.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[#64748B] mb-1">Lookup Tables</p>
              <div className="flex flex-wrap gap-1.5">
                {analysis.lookup_tables.map((e) => (
                  <span key={e} className="px-2 py-0.5 rounded-md text-xs bg-indigo-500/10 text-indigo-400">{e}</span>
                ))}
              </div>
            </div>
          )}
          {analysis.primary_workflow && (
            <div>
              <p className="text-xs font-medium text-[#64748B] mb-1">Primary Workflow</p>
              <p className="text-[#94A3B8]">{analysis.primary_workflow}</p>
            </div>
          )}
          {analysis.relationship_clusters.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[#64748B] mb-1">Relationship Clusters</p>
              <ul className="space-y-1">
                {analysis.relationship_clusters.map((c, i) => (
                  <li key={i} className="text-xs text-[#94A3B8] flex items-start gap-2"><span className="text-[#14B8A6] mt-1">●</span>{c}</li>
                ))}
              </ul>
            </div>
          )}
          {analysis.architecture_notes && (
            <div>
              <p className="text-xs font-medium text-[#64748B] mb-1">Architecture Notes</p>
              <p className="text-[#94A3B8] text-xs">{analysis.architecture_notes}</p>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-[#64748B]">
            <Cpu size={12} /> Complexity: <span className="font-mono text-[#F8FAFC] capitalize">{analysis.complexity}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function DocumentationPanel({ doc, onDownload }: { doc: SchemaDocumentation | null; onDownload: () => void }) {
  const [open, setOpen] = useState(false)
  if (!doc) return null
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0F172A] overflow-hidden">
      <div onClick={() => setOpen(!open)} className="flex items-center gap-2 w-full px-4 py-3 text-left cursor-pointer">
        <FileText size={16} className="text-[#14B8A6]" />
        <span className="text-sm font-semibold text-[#F8FAFC]">Documentation</span>
        <span className="text-xs text-[#64748B] ml-1">({doc.table_count} tables, {doc.relationship_count} relationships)</span>
        <span onClick={(e) => { e.stopPropagation(); onDownload() }} className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-[#14B8A6]/10 text-[#14B8A6] hover:bg-[#14B8A6]/20 transition-colors cursor-pointer">
          <Download size={11} /> Markdown
        </span>
      </div>
      {open && (
        <div className="px-4 pb-4">
          <pre className="text-xs text-[#94A3B8] max-h-64 overflow-y-auto custom-scrollbar whitespace-pre-wrap font-mono leading-relaxed">{doc.markdown.slice(0, 2000)}{doc.markdown.length > 2000 ? "\n..." : ""}</pre>
        </div>
      )}
    </div>
  )
}

function SchemaCanvasInner({ tables, foreignKeys, onNodeSelect }: { tables: TableInfo[]; foreignKeys: ForeignKeyInfo[]; onNodeSelect: (table: TableInfo | null) => void }) {
  const { fitView } = useReactFlow()
  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(() => layoutGraph(tables, foreignKeys), [tables, foreignKeys])
  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges)
  useEffect(() => { setNodes(layoutNodes); setEdges(layoutEdges); setTimeout(() => fitView({ duration: 300 }), 100) }, [layoutNodes, layoutEdges, setNodes, setEdges, fitView])
  const onNodeClick = useCallback((_: React.MouseEvent, node: { id: string; data: { table: TableInfo } }) => onNodeSelect(node.data.table), [onNodeSelect])
  const onPaneClick = useCallback(() => onNodeSelect(null), [onNodeSelect])
  return (
    <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onNodeClick={onNodeClick} onPaneClick={onPaneClick} nodeTypes={nodeTypes} fitView minZoom={0.1} maxZoom={2} colorMode="dark" style={{ background: "#0B0F1A" }}>
      <Background color="#1E293B" gap={20} size={1} />
      <Controls className="[&>button]:bg-[#1E293B] [&>button]:border-white/[0.08] [&>button]:text-[#94A3B8] [&>button:hover]:bg-[#334155]" />
      <MiniMap nodeColor="#14B8A6" maskColor="rgba(0,0,0,0.6)" style={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.08)" }} />
    </ReactFlow>
  )
}

function SchemaCanvas(props: { tables: TableInfo[]; foreignKeys: ForeignKeyInfo[]; onNodeSelect: (table: TableInfo | null) => void }) {
  return (
    <div className="h-full w-full rounded-xl overflow-hidden border border-white/[0.08]" style={{ minHeight: 500 }}>
      <ReactFlowProvider><SchemaCanvasInner {...props} /></ReactFlowProvider>
    </div>
  )
}

function CredentialForm({ onConnect, loading }: { onConnect: (creds: any) => void; loading: boolean }) {
  const [host, setHost] = useState(""); const [port, setPort] = useState(5432); const [dbName, setDbName] = useState(""); const [user, setUser] = useState(""); const [password, setPassword] = useState(""); const [ssl, setSsl] = useState(true); const [showPw, setShowPw] = useState(false)
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0F172A]/80 p-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-[#14B8A6]/10 flex items-center justify-center"><Database size={20} className="text-[#14B8A6]" /></div>
        <div><h3 className="text-sm font-semibold text-[#F8FAFC]">Connect to External Database</h3><p className="text-xs text-[#64748B]">Enter PostgreSQL connection details</p></div>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); onConnect({ db_host: host, db_port: port, db_name: dbName, db_user: user, db_password: password, ssl_required: ssl }) }} className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="text-xs text-[#64748B] mb-1 block">Host</label>
            <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="db.example.supabase.co" className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-[#F8FAFC] placeholder:text-[#475569] outline-none focus:border-[#14B8A6] transition-colors" />
          </div>
          <div>
            <label className="text-xs text-[#64748B] mb-1 block">Port</label>
            <input type="number" value={port} onChange={(e) => setPort(Number(e.target.value))} className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-[#F8FAFC] placeholder:text-[#475569] outline-none focus:border-[#14B8A6] transition-colors" />
          </div>
        </div>
        <input value={dbName} onChange={(e) => setDbName(e.target.value)} placeholder="Database name" className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-[#F8FAFC] placeholder:text-[#475569] outline-none focus:border-[#14B8A6] transition-colors" />
        <div className="grid grid-cols-2 gap-3">
          <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="User" className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-[#F8FAFC] placeholder:text-[#475569] outline-none focus:border-[#14B8A6] transition-colors" />
          <div className="relative">
            <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-[#F8FAFC] placeholder:text-[#475569] outline-none focus:border-[#14B8A6] transition-colors pr-8" />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#64748B]">{showPw ? <EyeOff size={14} /> : <Eye size={14} />}</button>
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={ssl} onChange={(e) => setSsl(e.target.checked)} className="rounded border-white/[0.08]" /><span className="text-xs text-[#94A3B8]">Require SSL</span></label>
        <button type="submit" disabled={loading || !host || !dbName || !user || !password} className="w-full rounded-lg bg-[#14B8A6] hover:bg-[#0D9488] disabled:opacity-40 text-white text-sm font-medium py-2.5 transition-colors flex items-center justify-center gap-2">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
          {loading ? "Connecting…" : "Visualize Schema"}
        </button>
      </form>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

type DiscoveryPhase = "idle" | "connecting" | "schema" | "ai" | "docs" | "done" | "error"

export default function SchemaVisualizerPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<"internal" | "external">("internal")
  const [viz, setViz] = useState<SchemaVisualization | null>(null)
  const [analysis, setAnalysis] = useState<SchemaAnalysis | null>(null)
  const [doc, setDoc] = useState<SchemaDocumentation | null>(null)
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [phase, setPhase] = useState<DiscoveryPhase>("idle")
  const [connectedHost, setConnectedHost] = useState<string | null>(null)

  const user = getUser()
  const role = user?.role ?? ""
  const canUseExternal = role === "admin" || role === "analyst"
  const source = searchParams.get("source")

  // Auto-load external schema when redirected from Live DB
  useEffect(() => {
    if (source === "live-db") {
      const raw = sessionStorage.getItem("liveDbCreds")
      if (raw) {
        try {
          const creds = JSON.parse(raw)
          setActiveTab("external")
          setConnectedHost(`${creds.db_host}/${creds.db_name}`)
          loadExternalSchema(creds)
          sessionStorage.removeItem("liveDbCreds")
        } catch {
          router.replace("/schema-visualizer")
        }
      } else {
        router.replace("/schema-visualizer")
      }
    }
  }, [source])

  const loadExternalSchema = async (creds: {
    db_host: string; db_port: number; db_name: string; db_user: string; db_password: string; ssl_required: boolean
  }) => {
    setPhase("connecting")
    setLoading(true)
    setError(null)
    try {
      const data: SchemaAnalyzeResponse = await schemaApi.externalAnalyze(creds)
      setPhase("schema")
      setViz(data.visualization)
      await new Promise((r) => setTimeout(r, 200))
      setPhase("ai")
      setAnalysis(data.analysis)
      await new Promise((r) => setTimeout(r, 150))
      setPhase("docs")
      setDoc(data.documentation)
      setPhase("done")
    } catch (err: unknown) {
      setPhase("error")
      setError(err instanceof Error ? err.message : "Failed to analyze schema")
    } finally {
      setLoading(false)
    }
  }

  // Internal schema auto-load
  useEffect(() => {
    if (activeTab === "internal" && !viz && source !== "live-db") {
      setLoading(true); setError(null)
      schemaApi.visualize().then((d: { visualization: SchemaVisualization }) => setViz(d.visualization))
        .catch((err) => setError(err.message || "Failed to load schema"))
        .finally(() => setLoading(false))
    }
  }, [activeTab])

  const handleExternalConnect = async (creds: any) => {
    setConnecting(true); setError(null)
    try {
      const data = await schemaApi.externalVisualize(creds)
      setViz(data.visualization)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to connect")
    } finally { setConnecting(false) }
  }

  const handleDownloadDoc = () => {
    if (!doc) return
    const blob = new Blob([doc.markdown], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = `schema-documentation-${new Date().toISOString().split("T")[0]}.md`
    a.click(); URL.revokeObjectURL(url)
  }

  const filteredViz = useMemo(() => {
    if (!viz) return null
    if (!searchQuery.trim()) return viz
    const q = searchQuery.toLowerCase()
    const filteredTables = viz.tables.filter((t) => t.name.toLowerCase().includes(q) || t.columns.some((c) => c.name.toLowerCase().includes(q)))
    const names = new Set(filteredTables.map((t) => t.name))
    return { ...viz, tables: filteredTables, foreign_keys: viz.foreign_keys.filter((fk) => names.has(fk.source_table) && names.has(fk.target_table)) }
  }, [viz, searchQuery])

  const handleNodeSelect = useCallback((table: TableInfo | null) => setSelectedTable(table), [])

  const renderDiscoveryProgress = () => {
    if (phase === "idle") return null
    return (
      <div className="rounded-xl border border-white/[0.08] bg-[#0F172A]/80 p-5 max-w-lg mx-auto space-y-3">
        <div className="flex items-center gap-2 mb-2">
          {phase === "done" ? <CheckCircle size={16} className="text-[#22C55E]" /> : <Loader2 size={16} className="animate-spin text-[#14B8A6]" />}
          <span className="text-sm font-semibold text-[#F8FAFC]">
            {phase === "done" ? "Schema Analysis Complete" : "Analyzing Database…"}
          </span>
        </div>
        <div className="space-y-2">
          <StatusIndicator label="Connect Database" status={phase === "error" ? "error" : "done"} />
          <StatusIndicator label="Discover Schema" status={phase === "error" ? "error" : ["schema", "ai", "docs", "done"].includes(phase) ? "done" : phase === "connecting" ? "running" : "pending"} detail={viz ? `${viz.tables.length} tables, ${viz.foreign_keys.length} relationships` : undefined} />
          <StatusIndicator label="AI Schema Intelligence" status={phase === "error" ? "error" : ["ai", "docs", "done"].includes(phase) ? "done" : phase === "schema" ? "running" : phase === "connecting" ? "pending" : "pending"} detail={analysis ? `${analysis.core_entities.length} entities detected` : undefined} />
          <StatusIndicator label="Generate Documentation" status={phase === "error" ? "error" : ["docs", "done"].includes(phase) ? "done" : phase === "ai" ? "running" : phase === "done" ? "done" : "pending"} />
          <StatusIndicator label="Schema Health Scan" status={phase === "error" ? "error" : "done"} detail={viz ? `${viz.health_score}/100` : undefined} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0B0F1A]">
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#14B8A6]/20 to-emerald-500/10 flex items-center justify-center">
            <Layers size={20} className="text-[#14B8A6]" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-[#F8FAFC]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              Schema<span className="text-[#14B8A6]">Visualizer</span>
            </h1>
            <p className="text-xs text-[#64748B]">Interactive entity-relationship diagram</p>
          </div>
          {connectedHost && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
              <span className="text-xs font-mono text-[#22C55E]">{connectedHost}</span>
            </div>
          )}
        </div>

        {/* Tabs — hide during auto-discovery */}
        {source !== "live-db" && (
          <div className="flex items-center gap-1 rounded-lg bg-[#0F172A] border border-white/[0.08] p-1 w-fit">
            <button onClick={() => { setActiveTab("internal"); setSelectedTable(null); setViz(null); setAnalysis(null); setDoc(null) }}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === "internal" ? "bg-[#14B8A6]/10 text-[#14B8A6]" : "text-[#64748B] hover:text-[#94A3B8]"}`}>Internal Schema</button>
            <button onClick={() => { setActiveTab("external"); setSelectedTable(null); setViz(null); setAnalysis(null); setDoc(null) }}
              disabled={!canUseExternal}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === "external" ? "bg-[#14B8A6]/10 text-[#14B8A6]" : "text-[#64748B] hover:text-[#94A3B8] disabled:opacity-40"}`}
              title={!canUseExternal ? "Viewer role cannot access external schemas" : undefined}>External Schema</button>
          </div>
        )}

        {/* Discovery progress */}
        {loading && source === "live-db" && renderDiscoveryProgress()}

        {/* Credential form (external, no auto-load) */}
        {activeTab === "external" && !viz && !loading && source !== "live-db" && (
          <CredentialForm onConnect={handleExternalConnect} loading={connecting} />
        )}

        {/* Normal loading spinner */} 
        {loading && source !== "live-db" && (
          <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-[#14B8A6]" /></div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex items-start gap-3">
            <XCircle size={16} className="shrink-0 mt-0.5 text-red-400" /><p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Main visualization */}
        {filteredViz && (
          <>
            {/* Search + Stats bar */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="relative flex-1 max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Filter tables or columns…"
                  className="w-full rounded-lg border border-white/[0.08] bg-[#0F172A] pl-9 pr-3 py-2 text-sm text-[#F8FAFC] placeholder:text-[#475569] outline-none focus:border-[#14B8A6] transition-colors" />
              </div>
              <div className="flex items-center gap-4 text-xs text-[#64748B]">
                <span><span className="text-[#F8FAFC] font-mono">{filteredViz.tables.length}</span> tables</span>
                <span><span className="text-[#F8FAFC] font-mono">{filteredViz.foreign_keys.length}</span> relationships</span>
                <span><span className="text-[#F8FAFC] font-mono">{filteredViz.indexes.length}</span> indexes</span>
              </div>
            </div>

            {/* Canvas + Inspector */}
            <div className="flex gap-4">
              <div className="flex-1">
                <SchemaCanvas tables={filteredViz.tables} foreignKeys={filteredViz.foreign_keys} onNodeSelect={handleNodeSelect} />
              </div>
              {selectedTable && <div className="w-72 shrink-0"><TableInspector table={selectedTable} onClose={() => setSelectedTable(null)} /></div>}
            </div>

            {/* Bottom panels: Health + AI + Docs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-4">
                <HealthBar score={filteredViz.health_score} issues={filteredViz.health_issues} />
                <AiAnalysisPanel analysis={analysis} />
              </div>
              <div className="space-y-4">
                <DocumentationPanel doc={doc} onDownload={handleDownloadDoc} />
                <div className="rounded-xl border border-white/[0.08] bg-[#0F172A] p-4">
                  <div className="flex items-center gap-2 mb-3"><Info size={16} className="text-[#14B8A6]" /><span className="text-sm font-semibold text-[#F8FAFC]">Legend</span></div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-[#94A3B8]"><Key size={12} className="text-amber-400" /> Primary Key</div>
                    <div className="flex items-center gap-2 text-[#94A3B8]"><Hash size={12} className="text-blue-400" /> Unique</div>
                    <div className="flex items-center gap-2 text-[#94A3B8]"><span className="text-[10px] text-red-400 font-mono">NN</span> Not Null</div>
                    <div className="flex items-center gap-2 text-[#94A3B8]"><Eye size={12} className="text-indigo-400" /> View</div>
                    <div className="flex items-center gap-2 text-[#94A3B8]"><div className="w-4 h-0.5 rounded bg-[#14B8A6] opacity-60" /> Foreign Key</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        .react-flow__minimap { border-radius: 12px !important; }
      `}</style>
    </div>
  )
}
