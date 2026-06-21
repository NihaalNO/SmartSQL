"use client"
import { useState } from "react"
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts"
import { BarChart3, TrendingUp, PieChart as PieIcon, Activity } from "lucide-react"

const COLORS = ["var(--mint-green)", "var(--mint-tag)", "var(--mint-warn)", "var(--mint-error)", "var(--mint-green-soft)"]

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
    <div className="mint-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <span className="text-sm font-medium text-foreground/80">Chart View</span>
        <div className="flex gap-0.5 rounded-full bg-secondary p-1">
          {(["bar", "line", "area", "pie"] as ChartType[]).map((t) => (
            <button
              key={t}
              onClick={() => setChartType(t)}
              className="flex cursor-pointer items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors"
              style={{
                background: chartType === t ? "var(--mint-canvas)" : "transparent",
                color: chartType === t ? "var(--mint-ink)" : "var(--mint-steel)",
              }}
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
                <CartesianGrid strokeDasharray="3 3" stroke="var(--mint-hairline-soft)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--mint-steel)" }} />
                <YAxis tick={{ fontSize: 10, fill: "var(--mint-steel)" }} />
                <Tooltip contentStyle={{ background: "var(--mint-canvas)", border: "1px solid var(--mint-hairline)", borderRadius: "8px", color: "var(--mint-ink)", fontSize: "12px" }} />
                <Bar dataKey="value" fill="var(--mint-green)" radius={[3, 3, 0, 0]} />
              </BarChart>
            ) : chartType === "line" ? (
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--mint-hairline-soft)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--mint-steel)" }} />
                <YAxis tick={{ fontSize: 10, fill: "var(--mint-steel)" }} />
                <Tooltip contentStyle={{ background: "var(--mint-canvas)", border: "1px solid var(--mint-hairline)", borderRadius: "8px", color: "var(--mint-ink)", fontSize: "12px" }} />
                <Line type="monotone" dataKey="value" stroke="var(--mint-green)" strokeWidth={2} dot={false} />
              </LineChart>
            ) : chartType === "area" ? (
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--mint-hairline-soft)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--mint-steel)" }} />
                <YAxis tick={{ fontSize: 10, fill: "var(--mint-steel)" }} />
                <Tooltip contentStyle={{ background: "var(--mint-canvas)", border: "1px solid var(--mint-hairline)", borderRadius: "8px", color: "var(--mint-ink)", fontSize: "12px" }} />
                <Area type="monotone" dataKey="value" stroke="var(--mint-green)" fill="var(--mint-green)" fillOpacity={0.12} strokeWidth={2} />
              </AreaChart>
            ) : (
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={{ fill: "var(--mint-steel)", fontSize: 10 }}>
                  {data.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--mint-canvas)", border: "1px solid var(--mint-hairline)", borderRadius: "8px", color: "var(--mint-ink)", fontSize: "12px" }} />
                <Legend wrapperStyle={{ color: "var(--mint-steel)", fontSize: "11px" }} />
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
        <p className="text-xs mt-2 text-muted-foreground">
          Showing <span className="text-foreground/80">{label}</span> vs <span className="text-foreground/80">{value}</span> (up to 50 rows)
        </p>
      </div>
    </div>
  )
}
