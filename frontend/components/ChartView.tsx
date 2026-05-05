"use client"
import { useState } from "react"
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts"
import { BarChart3, TrendingUp, PieChart as PieIcon, Activity } from "lucide-react"

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316"]

type ChartType = "bar" | "line" | "pie" | "area"

interface Props {
  columns: string[]
  rows: Record<string, unknown>[]
}

const CHART_ICONS: Record<ChartType, React.ReactNode> = {
  bar: <BarChart3 size={14} />,
  line: <TrendingUp size={14} />,
  pie: <PieIcon size={14} />,
  area: <Activity size={14} />,
}

function pickAxes(columns: string[]) {
  const numeric = columns.filter((c, _, arr) => {
    // heuristic: pick columns that look numeric
    return c.match(/count|total|sum|avg|amount|value|num|qty|score|rate|id/i)
  })
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">Chart View</h3>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(["bar", "line", "area", "pie"] as ChartType[]).map((t) => (
            <button
              key={t}
              onClick={() => setChartType(t)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                chartType === t ? "bg-white shadow text-brand-600" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {CHART_ICONS[t]}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "bar" ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : chartType === "line" ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          ) : chartType === "area" ? (
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#dbeafe" strokeWidth={2} />
            </AreaChart>
          ) : (
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                {data.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-gray-400 mt-2">
        Showing <strong>{label}</strong> vs <strong>{value}</strong> (up to 50 rows)
      </p>
    </div>
  )
}
