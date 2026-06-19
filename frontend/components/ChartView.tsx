"use client"
import { useState } from "react"
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts"
import { BarChart3, TrendingUp, PieChart as PieIcon, Activity } from "lucide-react"

const COLORS = ["#14B8A6", "#22C55E", "#60A5FA", "#F59E0B", "#EF4444", "#22D3EE", "#8B5CF6"]

type ChartType = "bar" | "line" | "pie" | "area"

interface Props {
  columns: string[]
  rows: Record<string, unknown>[]
}

const CHART_ICONS: Record<ChartType, React.ReactNode> = {
  bar: <BarChart3 size={13} />,
  line: <TrendingUp size={13} />,
  pie: <PieIcon size={13} />,
  area: <Activity size={13} />,
}

function pickAxes(columns: string[]) {
  const numeric = columns.filter((c) => c.match(/count|total|sum|avg|amount|value|num|qty|score|rate|id/i))
  const label = columns.find((c) => !numeric.includes(c)) || columns[0]
  const value = numeric[0] || columns[1] || columns[0]
  return { label, value }
}

export default function ChartView({ columns, rows }: Props) {
  const [chartType, setChartType] = useState<ChartType>("bar")

  if (!rows.length || columns.length < 2) return null

  const { label, value } = pickAxes(columns)
  const data = rows.slice(0, 50).map((r) => ({
    name: String(r[label] ?? ""),
    value: Number(r[value] ?? 0),
  }))

  return (
    <div className="rounded-lg border overflow-hidden" style={{
      borderColor: "rgba(148,163,184,0.1)",
      background: "rgba(255,255,255,0.02)",
    }}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: "rgba(148,163,184,0.06)" }}>
        <span className="text-sm font-medium text-[#CBD5E1]">Chart View</span>
        <div className="flex gap-0.5 rounded-md p-0.5" style={{ background: "rgba(0,0,0,0.2)" }}>
          {(["bar", "line", "area", "pie"] as ChartType[]).map((t) => (
            <button
              key={t}
              onClick={() => setChartType(t)}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors"
              style={{
                background: chartType === t ? "rgba(20,184,166,0.15)" : "transparent",
                color: chartType === t ? "#14B8A6" : "#64748B",
              }}
              onMouseEnter={e => { if (chartType !== t) e.currentTarget.style.color = "#CBD5E1" }}
              onMouseLeave={e => { if (chartType !== t) e.currentTarget.style.color = "#64748B" }}
            >
              {CHART_ICONS[t]}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "bar" ? (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.06)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748B" }} />
                <YAxis tick={{ fontSize: 10, fill: "#64748B" }} />
                <Tooltip contentStyle={{ background: "#0A1020", border: "1px solid rgba(148,163,184,0.1)", borderRadius: "6px", color: "#CBD5E1", fontSize: "12px" }} />
                <Bar dataKey="value" fill="#14B8A6" radius={[3, 3, 0, 0]} />
              </BarChart>
            ) : chartType === "line" ? (
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.06)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748B" }} />
                <YAxis tick={{ fontSize: 10, fill: "#64748B" }} />
                <Tooltip contentStyle={{ background: "#0A1020", border: "1px solid rgba(148,163,184,0.1)", borderRadius: "6px", color: "#CBD5E1", fontSize: "12px" }} />
                <Line type="monotone" dataKey="value" stroke="#14B8A6" strokeWidth={2} dot={false} />
              </LineChart>
            ) : chartType === "area" ? (
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.06)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748B" }} />
                <YAxis tick={{ fontSize: 10, fill: "#64748B" }} />
                <Tooltip contentStyle={{ background: "#0A1020", border: "1px solid rgba(148,163,184,0.1)", borderRadius: "6px", color: "#CBD5E1", fontSize: "12px" }} />
                <Area type="monotone" dataKey="value" stroke="#14B8A6" fill="#14B8A6" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            ) : (
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={{ fill: "#64748B", fontSize: 10 }}>
                  {data.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#0A1020", border: "1px solid rgba(148,163,184,0.1)", borderRadius: "6px", color: "#CBD5E1", fontSize: "12px" }} />
                <Legend wrapperStyle={{ color: "#64748B", fontSize: "11px" }} />
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
        <p className="text-xs mt-2" style={{ color: "#64748B" }}>
          Showing <span style={{ color: "#CBD5E1" }}>{label}</span> vs <span style={{ color: "#CBD5E1" }}>{value}</span> (up to 50 rows)
        </p>
      </div>
    </div>
  )
}
