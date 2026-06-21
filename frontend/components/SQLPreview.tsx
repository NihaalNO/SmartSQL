"use client"
import React, { useState, useRef, useEffect } from "react"
import { Check, ChevronDown, ChevronUp, Copy, Code2 } from "lucide-react"

interface Props {
  sql: string
  status: string
}

const STATUS_COLORS: Record<string, string> = {
  success: "var(--mint-green-deep)",
  template: "var(--mint-tag)",
  failed: "var(--mint-error)",
  blocked: "var(--mint-warn)",
}

export default function SQLPreview({ sql, status }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [highlightedLines, setHighlightedLines] = useState<string[]>([])

  useEffect(() => {
    if (sql.trim()) {
      setHighlightedLines(sql.split("\n"))
    }
  }, [sql])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(sql)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="rounded-md border border-[var(--mint-hairline-dark)] bg-[var(--mint-surface-code)] overflow-hidden">
      <div className="mint-code-header flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <Code2 size={14} className="text-muted-foreground" />
          <span className="text-xs font-mono text-muted-foreground">Generated SQL</span>
          {status && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded"
              style={{ background: "var(--mint-hairline-dark)", color: STATUS_COLORS[status] || "var(--mint-on-dark-muted)" }}>
              {status}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={copy} className="cursor-pointer p-1.5 rounded text-[var(--mint-on-dark-muted)] hover:text-[var(--mint-on-dark)] hover:bg-white/5 transition-colors">
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          </button>
          <button onClick={() => setCollapsed(!collapsed)} className="cursor-pointer p-1.5 rounded text-[var(--mint-on-dark-muted)] hover:text-[var(--mint-on-dark)] hover:bg-white/5 transition-colors">
            {collapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="p-4 overflow-auto max-h-72 font-mono text-xs leading-relaxed space-y-0.5">
          {highlightedLines.map((line, idx) => (
            <div key={idx} className="flex">
              <span className="w-6 text-right shrink-0 select-none text-muted-foreground/30">
                {idx + 1}
              </span>
              <pre className="ml-3 whitespace-pre-wrap m-0 text-[var(--mint-on-dark)]">
                {highlightLine(line)}
              </pre>
            </div>
          ))}
          <div className="flex">
            <span className="w-6 text-right shrink-0 select-none text-muted-foreground/30">
              {highlightedLines.length + 1}
            </span>
            <span className="ml-3 inline-block w-2 h-4 bg-accent animate-pulse" style={{ opacity: 0.6 }} />
          </div>
        </div>
      )}
    </div>
  )
}

function highlightLine(line: string): React.ReactElement {
  const words = line.split(/(\s+)/)
  return (
    <>
      {words.map((word, index) => {
        if (word.trim() === "") return <span key={index}>{word}</span>

        const isKeyword = /^(SELECT|DISTINCT|FROM|WHERE|GROUP BY|ORDER BY|HAVING|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|FULL JOIN|CROSS JOIN|UNION|INSERT INTO|UPDATE|DELETE FROM|CREATE TABLE|ALTER TABLE|DROP TABLE|VALUES|SET|AND|OR|NOT|IN|IS NULL|IS NOT NULL|BETWEEN|LIKE|EXISTS|CASE|WHEN|THEN|ELSE|END|TRUE|FALSE|null|AS|ON|DESC|ASC|WITH|LIMIT|OFFSET)$/i.test(word.trim())

        if (isKeyword) return <span key={index} style={{ color: "var(--mint-tag)", fontWeight: 500 }}>{word}</span>
        if (/\b\d+(\.\d+)?\b/.test(word)) return <span key={index} style={{ color: "var(--mint-warn)" }}>{word}</span>
        if (/^'[^']*'$/.test(word)) return <span key={index} style={{ color: "var(--mint-green-soft)" }}>{word}</span>
        if (/^--/.test(word)) return <span key={index} style={{ color: "var(--mint-stone)" }}>{word}</span>
        return <span key={index} style={{ color: "var(--mint-on-dark)" }}>{word}</span>
      })}
    </>
  )
}
