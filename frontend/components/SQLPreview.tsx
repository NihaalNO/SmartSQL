"use client"
import { useState } from "react"
import { Check } from "lucide-react"

interface Props {
  sql: string
  status: string
}

// ---------------------------------------------------------------------------
// SQL syntax tokeniser
// ---------------------------------------------------------------------------

type Token = { text: string; color: string }

const SELECT_KW = /^(SELECT|DISTINCT|AS|GROUP\s+BY|ORDER\s+BY|PARTITION\s+BY|DESC|ASC|LIMIT|OFFSET|HAVING|JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|INNER\s+JOIN|FULL\s+JOIN|CROSS\s+JOIN|ON|UNION|UNION\s+ALL|WITH|CASE|WHEN\s+THEN|WHEN|THEN|ELSE|END|AND|OR|NOT|IN|IS\s+NOT\s+NULL|IS\s+NULL|IS|NULL|TRUE|FALSE|BETWEEN|LIKE|EXISTS|ALL|ANY)$/i
const FROM_KW  = /^(FROM|WHERE|UPDATE|SET|INTO|INSERT|DELETE|VALUES|CREATE|ALTER|DROP|TABLE|INDEX|VIEW|SCHEMA|DATABASE|TRUNCATE|EXPLAIN|ANALYZE)$/i
const FUNC_KW  = /^(SUM|AVG|COUNT|MAX|MIN|COALESCE|NULLIF|CAST|CONVERT|ROUND|FLOOR|CEIL|ABS|LENGTH|TRIM|UPPER|LOWER|SUBSTRING|CONCAT|NOW|DATE|EXTRACT|YEAR|MONTH|DAY|TO_CHAR|TO_DATE|RANK|DENSE_RANK|ROW_NUMBER|LAG|LEAD|NTILE)$/i
const STRING_RE = /'[^']*'/g
const NUMBER_RE = /\b\d+(\.\d+)?\b/g

function tokeniseLine(line: string): Token[] {
  const tokens: Token[] = []
  let i = 0

  while (i < line.length) {
    // String literal
    if (line[i] === "'") {
      const end = line.indexOf("'", i + 1)
      const text = end === -1 ? line.slice(i) : line.slice(i, end + 1)
      tokens.push({ text, color: "#34d399" })
      i += text.length
      continue
    }

    // Backtick identifier
    if (line[i] === "`") {
      const end = line.indexOf("`", i + 1)
      const text = end === -1 ? line.slice(i) : line.slice(i, end + 1)
      tokens.push({ text, color: "#a5f3fc" })
      i += text.length
      continue
    }

    // Comment
    if (line[i] === "-" && line[i + 1] === "-") {
      tokens.push({ text: line.slice(i), color: "#6b7280" })
      break
    }

    // Word / keyword
    if (/[a-zA-Z_]/.test(line[i])) {
      let j = i
      while (j < line.length && /[\w]/.test(line[j])) j++
      const word = line.slice(i, j)

      // Check multi-word keywords (e.g. "GROUP BY", "ORDER BY")
      let matched = false
      for (const span of [3, 2]) {
        const ahead = line.slice(i).match(/^[\w\s]+/)
        if (ahead) {
          const candidate = ahead[0].trimEnd()
          const parts = candidate.split(/\s+/).slice(0, span).join(" ")
          if (SELECT_KW.test(parts)) {
            tokens.push({ text: parts, color: "#818cf8" })
            i += parts.length
            matched = true
            break
          }
          if (FROM_KW.test(parts)) {
            tokens.push({ text: parts, color: "#f472b6" })
            i += parts.length
            matched = true
            break
          }
        }
      }
      if (matched) continue

      if (FUNC_KW.test(word)) {
        tokens.push({ text: word, color: "#60a5fa" })
      } else if (SELECT_KW.test(word)) {
        tokens.push({ text: word, color: "#818cf8" })
      } else if (FROM_KW.test(word)) {
        tokens.push({ text: word, color: "#f472b6" })
      } else {
        tokens.push({ text: word, color: "#ffffff" })
      }
      i = j
      continue
    }

    // Number
    if (/\d/.test(line[i])) {
      let j = i
      while (j < line.length && /[\d.]/.test(line[j])) j++
      tokens.push({ text: line.slice(i, j), color: "#fb923c" })
      i = j
      continue
    }

    // Punctuation / whitespace — pass through
    tokens.push({ text: line[i], color: "#ffffff" })
    i++
  }

  return tokens
}

function SyntaxLine({ line }: { line: string }) {
  const tokens = tokeniseLine(line)
  return (
    <>
      {tokens.map((t, i) => (
        <span key={i} style={{ color: t.color }}>{t.text}</span>
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SQLPreview({ sql, status }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [copied, setCopied]       = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(sql)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const lines = sql.split("\n")

  return (
    <div className="rounded-xl overflow-hidden shadow-lg border border-white/5" style={{ background: "#030712" }}>

      {/* Terminal header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b border-white/5"
        style={{ background: "#111827" }}
      >
        {/* macOS traffic lights */}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ background: "#ff5f56" }} />
          <div className="w-3 h-3 rounded-full" style={{ background: "#ffbd2e" }} />
          <div className="w-3 h-3 rounded-full" style={{ background: "#27c93f" }} />
        </div>

        <span
          className="font-mono text-[11px] uppercase tracking-widest"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          query_editor.sql
        </span>

        <div className="flex items-center gap-3">
          {/* Status badge */}
          {status === "success" && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80" }}>
              success
            </span>
          )}
          {status === "template" && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(99,102,241,0.15)", color: "#a5b4fc" }}>
              template
            </span>
          )}
          {status === "failed" && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(239,68,68,0.15)", color: "#fca5a5" }}>
              failed
            </span>
          )}

          {/* Copy */}
          <button
            onClick={copy}
            className="transition-opacity hover:opacity-100 opacity-40"
            title="Copy SQL"
          >
            {copied
              ? <Check size={15} style={{ color: "#4ade80" }} />
              : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            }
          </button>

          {/* Collapse */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="opacity-40 hover:opacity-80 transition-opacity"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {collapsed
                ? <><polyline points="6 9 12 15 18 9"/></>
                : <><polyline points="18 15 12 9 6 15"/></>
              }
            </svg>
          </button>
        </div>
      </div>

      {/* Code body */}
      {!collapsed && (
        <div className="p-4 overflow-auto max-h-72 font-mono text-[13px] leading-6"
          style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
          {lines.map((line, idx) => (
            <div key={idx} className="flex">
              <span
                className="pr-4 text-right select-none shrink-0 w-8"
                style={{ color: "rgba(255,255,255,0.2)" }}
              >
                {idx + 1}
              </span>
              <code><SyntaxLine line={line} /></code>
            </div>
          ))}
          {/* Animated cursor */}
          <div className="flex">
            <span className="pr-4 text-right select-none shrink-0 w-8"
              style={{ color: "rgba(255,255,255,0.2)" }}>
              {lines.length + 1}
            </span>
            <span className="animate-pulse inline-block w-2 h-5"
              style={{ background: "rgba(0,74,198,0.7)" }} />
          </div>
        </div>
      )}
    </div>
  )
}
