"use client"
import { useState } from "react"
import { Download, ChevronLeft, ChevronRight } from "lucide-react"

interface Props {
  columns: string[]
  rows: Record<string, unknown>[]
  rowCount: number
  executionTimeMs: number
}

const PAGE_SIZE = 25

export default function ResultsTable({ columns, rows, rowCount, executionTimeMs }: Props) {
  const [page, setPage] = useState(0)

  if (!columns.length) return null

  const paged      = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(rows.length / PAGE_SIZE)

  const downloadCSV = () => {
    const header = columns.join(",")
    const body   = rows.map(r => columns.map(c => JSON.stringify(r[c] ?? "")).join(",")).join("\n")
    const blob   = new Blob([header + "\n" + body], { type: "text/csv" })
    const url    = URL.createObjectURL(blob)
    const a      = document.createElement("a")
    a.href       = url
    a.download   = "results.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="rounded-xl border border-outline-variant overflow-hidden shadow-sm bg-surface-container-lowest">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-surface-container border-b border-outline-variant/40">
        <div className="flex items-center gap-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#004ac6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3h18v4H3z"/><path d="M3 10h18v4H3z"/><path d="M3 17h18v4H3z"/>
          </svg>
          <span className="text-title-sm text-on-surface">Results</span>
          <span className="text-label-sm text-on-surface-variant">
            {rowCount.toLocaleString()} row{rowCount !== 1 ? "s" : ""} · {executionTimeMs}ms
          </span>
        </div>
        <button
          onClick={downloadCSV}
          className="flex items-center gap-1.5 text-label-sm text-on-surface-variant hover:text-primary
                     px-3 py-1.5 rounded-full border border-outline-variant hover:border-primary/40
                     transition-colors bg-surface-container-lowest"
        >
          <Download size={13} />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-container border-b border-outline-variant/30">
              {columns.map(col => (
                <th key={col}
                  className="px-4 py-2.5 text-left text-label-sm text-on-surface-variant uppercase tracking-wide whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20">
            {paged.map((row, i) => (
              <tr key={i} className="hover:bg-surface-container/50 transition-colors">
                {columns.map(col => (
                  <td key={col} className="px-4 py-2.5 text-body-md text-on-surface max-w-xs truncate">
                    {row[col] === null || row[col] === undefined
                      ? <span className="text-on-surface-variant/40 italic text-label-sm">null</span>
                      : String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-outline-variant/30 bg-surface-container-low">
          <span className="text-label-sm text-on-surface-variant">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg hover:bg-surface-container border border-transparent
                         hover:border-outline-variant disabled:opacity-30 transition-all"
            >
              <ChevronLeft size={15} className="text-on-surface-variant" />
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page === totalPages - 1}
              className="p-1.5 rounded-lg hover:bg-surface-container border border-transparent
                         hover:border-outline-variant disabled:opacity-30 transition-all"
            >
              <ChevronRight size={15} className="text-on-surface-variant" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
