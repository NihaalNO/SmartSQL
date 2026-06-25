"use client"

import { Activity, Clock, DatabaseZap, Gauge, HardDrive, Lightbulb } from "lucide-react"
import type { DatabaseMetadata } from "@/lib/live-db/databases"

interface AnalyticsDashboardProps {
  database: DatabaseMetadata
  stats?: {
    table_count?: number
    view_count?: number
    row_count_estimate?: number
    execution_time_ms?: number
    bytes_scanned?: number
    notes?: string[]
  } | null
  lastExecutionMs?: number | null
  bytesScanned?: number | null
  historyCount: number
}

export function AnalyticsDashboard({ database, stats, lastExecutionMs, bytesScanned, historyCount }: AnalyticsDashboardProps) {
  const cards = [
    { label: "Dataset/Warehouse overview", value: `${stats?.table_count ?? 0} tables`, icon: DatabaseZap },
    { label: "Execution time", value: lastExecutionMs != null ? `${lastExecutionMs} ms` : "No query yet", icon: Clock },
    { label: "Query cost/bytes scanned", value: bytesScanned != null ? `${bytesScanned.toLocaleString()} bytes` : "Provider metric unavailable", icon: HardDrive },
    { label: "Recent query session summary", value: `${historyCount} queries`, icon: Activity },
    { label: "Partition/cluster info", value: "Shown when connector exposes metadata", icon: Gauge },
    { label: "Query performance hints", value: "Use limits, filters, and partition columns", icon: Lightbulb },
  ]

  return (
    <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div key={card.label} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Icon size={14} className="text-primary" />
              {card.label}
            </div>
            <p className="mt-3 text-sm font-medium text-foreground">{card.value}</p>
          </div>
        )
      })}
      <div className="rounded-lg border border-warning/20 bg-warning/10 p-4 md:col-span-2 xl:col-span-3">
        <p className="text-sm font-medium text-amber-500">Large table warning</p>
        <p className="mt-1 text-xs text-amber-500/80">
          {database.name} can hold very large datasets. SmartSQL limits preview queries, but cost and scan metrics depend on the active connector.
        </p>
      </div>
    </section>
  )
}
