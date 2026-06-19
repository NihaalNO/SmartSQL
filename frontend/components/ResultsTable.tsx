"use client"

import { Download, ChevronLeft, ChevronRight } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table"

const PAGE_SIZE = 25

interface Props {
  columns: string[]
  rows: Record<string, unknown>[]
  rowCount: number
  executionTimeMs: number
}

export default function ResultsTable({
  columns,
  rows,
  rowCount,
  executionTimeMs,
}: Props) {
  if (!columns.length) return null

  const tanstackTable = useReactTable({
    data: rows,
    columns: columns.map((col) => ({
      accessorKey: col,
      header: col,
      cell: (info: any) => info.getValue(),
    })),
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: PAGE_SIZE,
      },
    },
  })

  const downloadCSV = () => {
    const header = columns.join(",")
    const body = rows
      .map((r) => columns.map((c) => JSON.stringify(r[c] ?? "")).join(","))
      .join("\n")
    const blob = new Blob([header + "\n" + body], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "results.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const currentPage = tanstackTable.getState().pagination.pageIndex + 1
  const totalPages = tanstackTable.getPageCount()

  return (
    <div className="rounded-lg overflow-hidden border" style={{
      borderColor: "rgba(148,163,184,0.1)",
      background: "rgba(255,255,255,0.02)",
    }}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: "rgba(148,163,184,0.06) "}}>
        <div className="flex items-center gap-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="1.5">
            <path d="M3 3h18v4H3z" /><path d="M3 10h18v4H3z" /><path d="M3 17h18v4H3z" />
          </svg>
          <span className="text-sm font-medium text-[#CBD5E1]">Results</span>
          <span className="text-xs" style={{ color: "#64748B" }}>
            {rowCount.toLocaleString()} row{rowCount !== 1 ? "s" : ""} · {executionTimeMs}ms
          </span>
        </div>
        <button
          onClick={downloadCSV}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-all"
          style={{ borderColor: "rgba(148,163,184,0.1)", color: "#64748B" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(148,163,184,0.2)"; e.currentTarget.style.color = "#CBD5E1" }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(148,163,184,0.1)"; e.currentTarget.style.color = "#64748B" }}
        >
          <Download size={12} />
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            {tanstackTable.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} style={{ borderColor: "rgba(148,163,184,0.06)" }}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap px-4 py-3"
                    style={{ color: "#64748B" }}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {tanstackTable.getRowModel().rows.map((row, index) => {
              const isEven = index % 2 === 0
              return (
                <TableRow
                  key={row.id}
                  style={{ borderColor: "rgba(148,163,184,0.04)" }}
                  className="transition-colors"
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(20,184,166,0.04)"}
                  onMouseLeave={e => e.currentTarget.style.background = isEven ? "rgba(255,255,255,0.015)" : "transparent"}
                >
                  {row.getVisibleCells().map((cell) => {
                    const value = cell.getValue()
                    return (
                      <TableCell key={cell.id} className="px-4 py-2.5 text-sm max-w-xs truncate" style={{ color: "#CBD5E1" }}>
                        {value === null || value === undefined ? (
                          <span className="italic" style={{ color: "rgba(148,163,184,0.3)" }}>null</span>
                        ) : (
                          String(value)
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t" style={{ borderColor: "rgba(148,163,184,0.06)" }}>
          <span className="text-xs" style={{ color: "#64748B" }}>
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => tanstackTable.previousPage()}
              disabled={!tanstackTable.getCanPreviousPage()}
              className="p-1.5 rounded transition-colors disabled:opacity-30"
              style={{ color: "#64748B" }}
              onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = "rgba(255,255,255,0.05)" }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => tanstackTable.nextPage()}
              disabled={!tanstackTable.getCanNextPage()}
              className="p-1.5 rounded transition-colors disabled:opacity-30"
              style={{ color: "#64748B" }}
              onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = "rgba(255,255,255,0.05)" }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
