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

  const paged = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(rows.length / PAGE_SIZE)

  const downloadCSV = () => {
    const header = columns.join(",")
    const body = rows.map((r) => columns.map((c) => JSON.stringify(r[c] ?? "")).join(",")).join("\n")
    const blob = new Blob([header + "\n" + body], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "results.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!columns.length) return null

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
        <div className="text-sm font-semibold text-gray-700">
          Results
          <span className="text-gray-400 font-normal ml-2">
            {rowCount.toLocaleString()} row{rowCount !== 1 ? "s" : ""} · {executionTimeMs}ms
          </span>
        </div>
        <button
          onClick={downloadCSV}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
        >
          <Download size={13} />
          CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {columns.map((col) => (
                <th key={col} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paged.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                {columns.map((col) => (
                  <td key={col} className="px-4 py-2.5 text-gray-700 text-xs max-w-xs truncate">
                    {row[col] === null || row[col] === undefined ? (
                      <span className="text-gray-300 italic">null</span>
                    ) : String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
          <span className="text-xs text-gray-500">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page === totalPages - 1}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
