"use client"
import React, { useState, useRef, useEffect } from "react"
import { Check, ChevronDown, ChevronUp, Copy } from "lucide-react"

interface Props {
  sql: string
  status: string
}

const STATUS_COLORS: Record<string, string> = {
  success: "#22C55E",
  template: "#60A5FA",
  failed: "#EF4444",
  blocked: "#F59E0B",
}

export default function SQLPreview({ sql, status }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [copied, setCopied] = useState(false)
  const codeRef = useRef<HTMLPreElement>(null)
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
    <div className="rounded-lg overflow-hidden border" style={{
      borderColor: "rgba(148,163,184,0.1)",
      background: "rgba(0,0,0,0.3)",
    }}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: "rgba(148,163,184,0.06)" }}>
        <div className="flex items-center gap-2.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          <span className="text-xs font-mono" style={{ color: "#64748B" }}>Generated SQL</span>
          {status && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{
              background: `${STATUS_COLORS[status] || "#64748B"}15`,
              color: STATUS_COLORS[status] || "#64748B",
            }}>
              {status}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={copy} className="p-1.5 rounded transition-colors" style={{ color: "#64748B" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            {copied ? <Check size={13} style={{ color: "#22C55E" }} /> : <Copy size={13} />}
          </button>
          <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded transition-colors" style={{ color: "#64748B" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            {collapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="p-4 overflow-auto max-h-72 font-mono text-xs leading-relaxed space-y-0.5">
          {highlightedLines.map((line, idx) => (
            <div key={idx} className="flex">
              <span className="w-6 text-right shrink-0 select-none" style={{ color: "rgba(148,163,184,0.3)" }}>
                {idx + 1}
              </span>
              <pre className="ml-3 whitespace-pre-wrap m-0" style={{ color: "rgba(248,250,252,0.85)" }}>
                {highlightLine(line)}
              </pre>
            </div>
          ))}
          <div className="flex">
            <span className="w-6 text-right shrink-0 select-none" style={{ color: "rgba(148,163,184,0.3)" }}>
              {highlightedLines.length + 1}
            </span>
            <span className="ml-3 inline-block w-2 h-4" style={{ background: "#14B8A6", animation: "pulse-dot 1s ease-in-out infinite" }} />
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

        if (isKeyword) return <span key={index} style={{ color: "#818cf8", fontWeight: 500 }}>{word}</span>
        if (/\b\d+(\.\d+)?\b/.test(word)) return <span key={index} style={{ color: "#fb923c" }}>{word}</span>
        if (/^'[^']*'$/.test(word)) return <span key={index} style={{ color: "#34d399" }}>{word}</span>
        if (/^--/.test(word)) return <span key={index} style={{ color: "#6b7280" }}>{word}</span>
        return <span key={index} style={{ color: "rgba(248,250,252,0.85)" }}>{word}</span>
      })}
    </>
  )
}
