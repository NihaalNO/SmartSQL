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
    <div className="mint-table">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--mint-green-deep)" strokeWidth="1.5">
            <path d="M3 3h18v4H3z" /><path d="M3 10h18v4H3z" /><path d="M3 17h18v4H3z" />
          </svg>
          <span className="text-sm font-medium text-foreground/80">Results</span>
          <span className="text-xs text-muted-foreground">
            {rowCount.toLocaleString()} row{rowCount !== 1 ? "s" : ""} \u00B7 {executionTimeMs}ms
          </span>
        </div>
        <button
          onClick={downloadCSV}
          className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Download size={12} />
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            {tanstackTable.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="whitespace-nowrap px-4 py-3"
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
                  className="transition-colors hover:bg-secondary"
                  style={{ background: isEven ? "var(--mint-surface-soft)" : "transparent" }}
                >
                  {row.getVisibleCells().map((cell) => {
                    const value = cell.getValue()
                    return (
                      <TableCell key={cell.id} className="px-4 py-2.5 text-sm max-w-xs truncate text-foreground/80">
                        {value === null || value === undefined ? (
                          <span className="italic text-muted-foreground/40">null</span>
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
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border">
          <span className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => tanstackTable.previousPage()}
              disabled={!tanstackTable.getCanPreviousPage()}
              className="cursor-pointer p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => tanstackTable.nextPage()}
              disabled={!tanstackTable.getCanNextPage()}
              className="cursor-pointer p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
