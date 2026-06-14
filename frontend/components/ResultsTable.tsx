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
import { Button } from "@/components/ui/button"

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
      .map((r) =>
        columns
          .map((c) => JSON.stringify(r[c] ?? ""))
          .join(",")
      )
      .join("\n")

    const blob = new Blob([header + "\n" + body], {
      type: "text/csv",
    })

    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = "results.csv"
    a.click()

    URL.revokeObjectURL(url)
  }

  const currentPage =
    tanstackTable.getState().pagination.pageIndex + 1

  const totalPages = tanstackTable.getPageCount()

  return (
    <div className="rounded-xl border border-outline-variant overflow-hidden shadow-sm bg-surface-container-lowest">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-surface-container border-b border-outline-variant/40">
        <div className="flex items-center gap-3">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#004ac6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 3h18v4H3z" />
            <path d="M3 10h18v4H3z" />
            <path d="M3 17h18v4H3z" />
          </svg>

          <span className="text-title-sm text-on-surface">
            Results
          </span>

          <span className="text-label-sm text-on-surface-variant">
            {rowCount.toLocaleString()} row
            {rowCount !== 1 ? "s" : ""} ·{" "}
            {executionTimeMs}ms
          </span>
        </div>

        <button
          onClick={downloadCSV}
          className="flex items-center gap-1.5 text-label-sm text-on-surface-variant hover:text-primary px-3 py-1.5 rounded-full border border-outline-variant hover:border-primary/40 transition-colors bg-surface-container-lowest"
        >
          <Download size={13} />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            {tanstackTable.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-left text-label-sm text-on-surface-variant uppercase tracking-wide whitespace-nowrap"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {tanstackTable.getRowModel().rows.map(
              (row, index) => {
                const isEven = index % 2 === 0

                return (
                  <TableRow
                    key={row.id}
                    className={`
                      hover:bg-surface-container/50
                      transition-colors
                      ${
                        isEven
                          ? "bg-surface-container-low/50"
                          : ""
                      }
                    `}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const value = cell.getValue()

                      return (
                        <TableCell
                          key={cell.id}
                          className="px-4 py-2.5 text-body-md text-on-surface max-w-xs truncate"
                        >
                          {value === null ||
                          value === undefined ? (
                            <span className="text-on-surface-variant/40 italic text-label-sm">
                              null
                            </span>
                          ) : (
                            String(value)
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                )
              }
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-outline-variant/30 bg-surface-container-low">
          <span className="text-label-sm text-on-surface-variant">
            Page {currentPage} of {totalPages}
          </span>

          <div className="flex gap-1">
            <Button
              onClick={() => tanstackTable.previousPage()}
              disabled={!tanstackTable.getCanPreviousPage()}
              variant="ghost"
              size="icon"
              className="p-1.5"
            >
              <ChevronLeft size={15} />
            </Button>

            <Button
              onClick={() => tanstackTable.nextPage()}
              disabled={!tanstackTable.getCanNextPage()}
              variant="ghost"
              size="icon"
              className="p-1.5"
            >
              <ChevronRight size={15} />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}