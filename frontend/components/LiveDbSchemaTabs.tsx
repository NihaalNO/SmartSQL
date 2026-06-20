"use client"
import React, { useState, useCallback, useMemo, useEffect, useRef } from "react"
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
  Table,
  Search,
  Eye,
  Shield,
  AlertTriangle,
  Info,
  Key,
  Hash,
  CheckCircle,
  XCircle,
  Loader2,
  Download,
  FileText,
  Cpu,
  Sparkles,
  Layers,
} from "lucide-react"
import type {
  SchemaVisualization,
  TableInfo,
  ForeignKeyInfo,
  SchemaAnalysis,
  SchemaDocumentation,
} from "@/types"

// ── Layout engine ────────────────────────────────────────────────────────────

const NODE_W = 240
const ROW_H = 30
const HEADER_H = 44
const COLLAPSED_COL_H = 36

// Smart node height: show all columns for < 50 tables, collapse for 50-200, names-only for 200+
function nodeHeight(tablesCount: number, colCount: number): number {
  if (tablesCount >= 200) return HEADER_H + COLLAPSED_COL_H
  if (tablesCount >= 50) return HEADER_H + Math.min(colCount, 8) * ROW_H + 12
  return Math.max(HEADER_H + colCount * ROW_H + 12, 80)
}

// Column display mode based on table count
type ColumnMode = "full" | "collapsed" | "minimal"
function columnMode(tablesCount: number): ColumnMode {
  if (tablesCount >= 200) return "minimal"
  if (tablesCount >= 50) return "collapsed"
  return "full"
}

function layoutGraph(tables: TableInfo[], fks: ForeignKeyInfo[]) {
  if (tables.length === 0) return { nodes: [], edges: [] }
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 100, marginx: 40, marginy: 40 })
  const colMode = columnMode(tables.length)
  // Defer layout for large graphs to avoid blocking main thread
  for (const t of tables) {
    const h = nodeHeight(tables.length, t.columns.length)
    g.setNode(t.name, { width: NODE_W, height: h })
  }
  for (const fk of fks) g.setEdge(fk.source_table, fk.target_table)
  dagre.layout(g)
  const nodes = tables.map((t) => {
    const n = g.node(t.name)
    return { id: t.name, type: "schemaTable", position: { x: n.x - NODE_W / 2, y: n.y - n.height / 2 }, data: { table: t, columnMode: colMode, totalTables: tables.length } }
  })
  const edges = fks.length > 0 ? fks.map((fk, i) => ({
    id: `fk-${fk.constraint_name || i}`,
    source: fk.source_table,
    target: fk.target_table,
    sourceHandle: `${fk.source_table}-${fk.source_column}`,
    targetHandle: `${fk.target_table}-${fk.target_column}`,
    type: "smoothstep",
    animated: false,
    markerEnd: { type: MarkerType.ArrowClosed, color: "#14B8A6" },
    style: { stroke: "#14B8A6", strokeWidth: 1.5, opacity: 0.6 },
    label: fks.length < 50 ? `${fk.source_column} → ${fk.target_column}` : undefined,
  })) : []
  return { nodes, edges }
}

// ── Custom React Flow Node ───────────────────────────────────────────────────

const SchemaTableNode = React.memo(function SchemaTableNode({ data, selected }: { data: { table: TableInfo; columnMode: string; totalTables: number }; selected?: boolean }) {
  const { table, columnMode: colMode, totalTables } = data
  const isView = table.type === "view"
  const cols = table.columns
  const isMinimal = colMode === "minimal" || totalTables >= 200
  const isCollapsed = colMode === "collapsed" || totalTables >= 50

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
      {isMinimal ? (
        <div className="flex items-center gap-1 px-3" style={{ height: COLLAPSED_COL_H }}>
          <span className="text-xs text-[#64748B]">{cols.length} column{cols.length !== 1 ? "s" : ""}</span>
          {cols.some(c => c.is_pk) && <Key size={9} className="text-amber-400" />}
          {cols.some(c => c.is_unique) && <Hash size={9} className="text-blue-400" />}
        </div>
      ) : (
        <div className="divide-y divide-white/[0.04]">
          {cols.length === 0 && (
            <div className="px-3 py-2 text-xs text-[#64748B] italic">No columns</div>
          )}
          {cols.map((col) => (
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
      )}
    </div>
  )
})

const nodeTypes = { schemaTable: SchemaTableNode }

// ── React Flow Canvas ────────────────────────────────────────────────────────

const SchemaCanvasInner = React.memo(function SchemaCanvasInner({ tables, foreignKeys, onNodeSelect }: {
  tables: TableInfo[]; foreignKeys: ForeignKeyInfo[]; onNodeSelect: (t: TableInfo | null) => void
}) {
  const { fitView } = useReactFlow()
  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(() => layoutGraph(tables, foreignKeys), [tables, foreignKeys])
  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges)
  const graphKey = useMemo(() => tables.map(t => t.name).join(",") + "|" + foreignKeys.map(f => f.constraint_name).join(","), [tables, foreignKeys])
  useEffect(() => { setNodes(layoutNodes); setEdges(layoutEdges); const t = setTimeout(() => fitView({ duration: 300 }), 50); return () => clearTimeout(t) }, [graphKey, setNodes, setEdges, fitView, layoutNodes, layoutEdges])
  const onNodeClick = useCallback((_: React.MouseEvent, node: { id: string; data: { table: TableInfo } }) => onNodeSelect(node.data.table), [onNodeSelect])
  const onPaneClick = useCallback(() => onNodeSelect(null), [onNodeSelect])
  return (
    <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onNodeClick={onNodeClick} onPaneClick={onPaneClick} nodeTypes={nodeTypes} onlyRenderVisibleElements fitView minZoom={0.1} maxZoom={2} colorMode="dark" style={{ background: "#0B0F1A" }}>
      <Background color="#1E293B" gap={20} size={1} />
      <Controls className="[&>button]:bg-[#1E293B] [&>button]:border-white/[0.08] [&>button]:text-[#94A3B8] [&>button:hover]:bg-[#334155]" />
      <MiniMap nodeColor="#14B8A6" maskColor="rgba(0,0,0,0.6)" style={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.08)" }} />
    </ReactFlow>
  )
})

const SchemaCanvas = React.memo(function SchemaCanvas(props: { tables: TableInfo[]; foreignKeys: ForeignKeyInfo[]; onNodeSelect: (t: TableInfo | null) => void }) {
  return (
    <div className="h-full w-full rounded-xl overflow-hidden border border-white/[0.08]" style={{ minHeight: 500 }}>
      <ReactFlowProvider><SchemaCanvasInner {...props} /></ReactFlowProvider>
    </div>
  )
})

// ── Table Inspector ──────────────────────────────────────────────────────────

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
        {table.row_estimate != null && (
          <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
            Estimated rows: <span className="font-mono text-[#F8FAFC]">{table.row_estimate.toLocaleString()}</span>
          </div>
        )}
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

// ── Health Tab ────────────────────────────────────────────────────────────────

function HealthTab({ score, issues }: { score: number; issues: string[] }) {
  const color = score >= 80 ? "#22C55E" : score >= 50 ? "#F59E0B" : "#EF4444"
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/[0.08] bg-[#0F172A] p-5">
        <div className="flex items-center gap-3 mb-4">
          <Shield size={20} className="shrink-0" style={{ color }} />
          <span className="text-base font-semibold text-[#F8FAFC]">Schema Health Score</span>
          <span className="ml-auto text-2xl font-bold font-mono" style={{ color }}>{score}/100</span>
        </div>
        <div className="h-2 rounded-full bg-white/[0.06] mb-4 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, background: color }} />
        </div>
        {issues.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-[#64748B]">Recommendations</p>
            {issues.map((issue, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-[#94A3B8] p-2 rounded-lg bg-white/[0.02]">
                <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-400" />
                <span>{issue}</span>
              </div>
            ))}
          </div>
        )}
        {issues.length === 0 && (
          <p className="text-sm text-[#22C55E] flex items-center gap-1.5"><CheckCircle size={14} /> No issues found — schema is well-structured</p>
        )}
      </div>
    </div>
  )
}

// ── AI Insights Tab ──────────────────────────────────────────────────────────

function AiInsightsTab({ analysis, loading }: { analysis: SchemaAnalysis | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center space-y-3">
          <Loader2 size={24} className="animate-spin text-[#14B8A6] mx-auto" />
          <p className="text-sm text-[#64748B]">Running AI schema analysis…</p>
        </div>
      </div>
    )
  }
  if (!analysis) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center space-y-2">
          <Cpu size={32} className="text-[#64748B] mx-auto opacity-40" />
          <p className="text-sm text-[#64748B]">No analysis available</p>
          <p className="text-xs text-[#475569]">Schema intelligence requires a connected database</p>
        </div>
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0F172A] p-5 space-y-5">
      <div className="flex items-center gap-2"><Sparkles size={18} className="text-[#14B8A6]" /><span className="text-base font-semibold text-[#F8FAFC]">Schema Intelligence</span></div>
      {analysis.purpose && (
        <div><p className="text-xs font-medium text-[#64748B] mb-1.5">Database Purpose</p><p className="text-sm text-[#CBD5E1]">{analysis.purpose}</p></div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {analysis.core_entities.length > 0 && (
          <div><p className="text-xs font-medium text-[#64748B] mb-2">Core Entities</p><div className="flex flex-wrap gap-1.5">{analysis.core_entities.map((e) => (<span key={e} className="px-2.5 py-1 rounded-md text-xs bg-[#14B8A6]/10 text-[#14B8A6] font-medium">{e}</span>))}</div></div>
        )}
        {analysis.lookup_tables.length > 0 && (
          <div><p className="text-xs font-medium text-[#64748B] mb-2">Lookup Tables</p><div className="flex flex-wrap gap-1.5">{analysis.lookup_tables.map((e) => (<span key={e} className="px-2.5 py-1 rounded-md text-xs bg-indigo-500/10 text-indigo-400 font-medium">{e}</span>))}</div></div>
        )}
      </div>
      {analysis.primary_workflow && (
        <div><p className="text-xs font-medium text-[#64748B] mb-1.5">Primary Workflow</p><p className="text-sm text-[#94A3B8] leading-relaxed">{analysis.primary_workflow}</p></div>
      )}
      {analysis.relationship_clusters.length > 0 && (
        <div><p className="text-xs font-medium text-[#64748B] mb-2">Relationship Clusters</p><div className="space-y-1.5">{analysis.relationship_clusters.map((c, i) => (<div key={i} className="flex items-start gap-2 text-sm text-[#94A3B8]"><span className="text-[#14B8A6] mt-1.5">●</span><span>{c}</span></div>))}</div></div>
      )}
      {analysis.architecture_notes && (
        <div><p className="text-xs font-medium text-[#64748B] mb-1.5">Architecture Notes</p><p className="text-sm text-[#94A3B8]">{analysis.architecture_notes}</p></div>
      )}
      <div className="flex items-center gap-2 text-xs text-[#64748B] pt-2 border-t border-white/[0.06]">
        <Cpu size={12} /> Complexity: <span className="font-mono text-[#F8FAFC] capitalize">{analysis.complexity || "unknown"}</span>
      </div>
    </div>
  )
}

// ── Documentation Tab ────────────────────────────────────────────────────────

function DocumentationTab({ doc, loading, onDownload }: {
  doc: SchemaDocumentation | null; loading: boolean; onDownload: () => void
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center space-y-3">
          <Loader2 size={24} className="animate-spin text-[#14B8A6] mx-auto" />
          <p className="text-sm text-[#64748B]">Generating documentation…</p>
        </div>
      </div>
    )
  }
  if (!doc) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center space-y-2">
          <FileText size={32} className="text-[#64748B] mx-auto opacity-40" />
          <p className="text-sm text-[#64748B]">No documentation generated</p>
          <p className="text-xs text-[#475569]">Documentation is auto-generated after schema discovery</p>
        </div>
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0F172A] overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06]">
        <FileText size={16} className="text-[#14B8A6]" />
        <span className="text-sm font-semibold text-[#F8FAFC]">Database Documentation</span>
        <span className="text-xs text-[#64748B] ml-1">({doc.table_count} tables, {doc.relationship_count} relationships)</span>
        <button onClick={onDownload} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-[#14B8A6]/10 text-[#14B8A6] hover:bg-[#14B8A6]/20 transition-colors font-medium">
          <Download size={12} /> Download Markdown
        </button>
      </div>
      <div className="p-5">
        <pre className="text-sm text-[#94A3B8] max-h-96 overflow-y-auto custom-scrollbar whitespace-pre-wrap font-mono leading-relaxed">{doc.markdown}</pre>
      </div>
    </div>
  )
}

// ── Schema Tab (main ERD) ────────────────────────────────────────────────────

export function SchemaTab({ viz, loading }: {
  viz: SchemaVisualization | null; loading: boolean
}) {
  const progressRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (loading && progressRef.current) {
      const steps = ["Discovering tables…", "Loading columns…", "Mapping relationships…", "Building graph…", "Rendering visualization…"]
      let i = 0
      const interval = setInterval(() => {
        if (progressRef.current && i < steps.length) {
          progressRef.current.textContent = steps[i]
          i++
        }
      }, 800)
      return () => clearInterval(interval)
    }
  }, [loading])
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const filteredViz = useMemo(() => {
    if (!viz) return null
    if (!searchQuery.trim()) return viz
    const q = searchQuery.toLowerCase()
    const ft = viz.tables.filter((t) => t.name.toLowerCase().includes(q) || t.columns.some((c) => c.name.toLowerCase().includes(q)))
    const fn = new Set(ft.map((t) => t.name))
    return { ...viz, tables: ft, foreign_keys: viz.foreign_keys.filter((fk) => fn.has(fk.source_table) && fn.has(fk.target_table)) }
  }, [viz, searchQuery])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <Loader2 size={28} className="animate-spin text-[#14B8A6] mx-auto" />
          <p ref={progressRef} className="text-sm text-[#64748B]">Discovering schema metadata…</p>
        </div>
      </div>
    )
  }

  if (!filteredViz) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <Layers size={40} className="text-[#64748B] mx-auto opacity-30" />
          <p className="text-sm text-[#64748B]">No schema data available</p>
          <p className="text-xs text-[#475569]">Connect to a database first to visualize its schema</p>
        </div>
      </div>
    )
  }

  const hasNoTables = filteredViz.tables.length === 0
  const hasNoFKs = filteredViz.foreign_keys.length === 0 && filteredViz.tables.length > 0

  if (hasNoTables) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <Table size={40} className="text-[#64748B] mx-auto opacity-30" />
          <p className="text-sm text-[#64748B]">No tables found in database</p>
          <p className="text-xs text-[#475569]">The connected database has no tables in the public schema</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
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

      {hasNoFKs && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-xs text-amber-300 flex items-center gap-2">
          <Info size={13} /> No foreign-key relationships found. Showing table structure only.
        </div>
      )}

      <div className="flex gap-4">
        <div className="flex-1">
          <SchemaCanvas tables={filteredViz.tables} foreignKeys={filteredViz.foreign_keys} onNodeSelect={setSelectedTable} />
        </div>
        {selectedTable && <div className="w-72 shrink-0"><TableInspector table={selectedTable} onClose={() => setSelectedTable(null)} /></div>}
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-[#0F172A] p-3">
        <div className="flex items-center gap-4 text-xs flex-wrap">
          <span className="text-[#64748B] font-medium">Legend:</span>
          <span className="flex items-center gap-1.5 text-[#94A3B8]"><Key size={11} className="text-amber-400" /> PK</span>
          <span className="flex items-center gap-1.5 text-[#94A3B8]"><Hash size={11} className="text-blue-400" /> Unique</span>
          <span className="flex items-center gap-1.5 text-[#94A3B8]"><span className="text-[10px] text-red-400 font-mono">NN</span> Not Null</span>
          <span className="flex items-center gap-1.5 text-[#94A3B8]"><Eye size={11} className="text-indigo-400" /> View</span>
          <span className="flex items-center gap-1.5 text-[#94A3B8]"><div className="w-4 h-0.5 rounded bg-[#14B8A6] opacity-60" /> FK</span>
        </div>
      </div>
    </div>
  )
}

// ── Exported wrapper for all schema-related tabs ─────────────────────────────

export interface SchemaTabData {
  viz: SchemaVisualization | null
  analysis: SchemaAnalysis | null
  doc: SchemaDocumentation | null
  schemaLoading: boolean
  aiLoading: boolean
  docLoading: boolean
}

export function SchemaHealthTabView({ score, issues }: { score: number; issues: string[] }) {
  return <HealthTab score={score} issues={issues} />
}

export function AiInsightsTabView({ analysis, loading }: { analysis: SchemaAnalysis | null; loading: boolean }) {
  return <AiInsightsTab analysis={analysis} loading={loading} />
}

export function DocumentationTabView({ doc, loading, onDownload }: {
  doc: SchemaDocumentation | null; loading: boolean; onDownload: () => void
}) {
  return <DocumentationTab doc={doc} loading={loading} onDownload={onDownload} />
}

// Global style injection (included once)
export function SchemaStyles() {
  return (
    <style jsx global>{`
      .custom-scrollbar::-webkit-scrollbar { width: 4px; }
      .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
      .react-flow__minimap { border-radius: 12px !important; }
    `}</style>
  )
}
