"use client"
import { useState, useRef, useEffect } from "react"
import { Check } from "lucide-react"
import hljs from "highlight.js"
import "highlight.js/styles/atom-one-dark.css"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface Props {
  sql: string
  status: string
}

export default function SQLPreview({ sql, status }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [copied, setCopied] = useState(false)
  const codeRef = useRef<HTMLPreElement>(null)
  const [highlightedLines, setHighlightedLines] = useState<string[]>([])

  useEffect(() => {
    if (sql.trim()) {
      const lines = sql.split("\n")
      const highlighted = lines.map((line) => {
        // Simple syntax highlighting - in a real app, we'd use highlight.js properly
        // For now, we'll return the line as is and highlight in the JSX
        return line
      })
      setHighlightedLines(highlighted)
    }
  }, [sql])

  const copy = async () => {
    if (!codeRef.current) return
    try {
      await navigator.clipboard.writeText(sql)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  return (
    <Card className="bg-[#030712] border border-white/5">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#111827]">
          {/* macOS traffic lights */}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: "#ff5f56" }} />
            <div className="w-3 h-3 rounded-full" style={{ background: "#ffbd2e" }} />
            <div className="w-3 h-3 rounded-full" style={{ background: "#27c93f" }} />
          </div>

          <span
            className="font-mono text-[11px] uppercase tracking-widest text-white/30"
          >
            query_editor.sql
          </span>

          <div className="flex items-center gap-3">
            {/* Status badge */}
            {status === "success" && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-900/20 text-green-400">
                success
              </span>
            )}
            {status === "template" && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-900/20 text-blue-400">
                template
              </span>
            )}
            {status === "failed" && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-900/20 text-red-400">
                failed
              </span>
            )}

            {/* Copy */}
            <Button
              variant="ghost"
              size="icon"
              onClick={copy}
              title="Copy SQL"
              className="opacity-40 hover:opacity-100"
            >
              {copied ? (
                <Check size={15} className="text-green-400" />
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </Button>

            {/* Collapse */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? "Expand" : "Collapse"}
              className="opacity-40 hover:opacity-80"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {collapsed ? (
                  <polyline points="6 9 12 15 18 9" />
                ) : (
                  <polyline points="18 15 12 9 6 15" />
                )}
              </svg>
            </Button>
          </div>
        </div>
      </CardHeader>

      {(!collapsed) && (
        <CardContent className="p-4 overflow-auto max-h-72 space-y-0.5">
          {highlightedLines.map((line, idx) => (
            <div key={idx} className="flex">
              <span
                className="pr-4 text-right select-none shrink-0 w-8 text-white/20"
              >
                {idx + 1}
              </span>
              <pre className="whitespace-pre-wrap break-all m-0 font-mono text-[13px] leading-6 text-white">
                {/* We'll do simple keyword highlighting here */}
                {highlightLine(line)}
              </pre>
            </div>
          ))}
          {/* Animated cursor */}
          <div className="flex">
            <span className="pr-4 text-right select-none shrink-0 w-8 text-white/20">
              {highlightedLines.length + 1}
            </span>
            <span className="animate-pulse inline-block w-2 h-5 bg-[#004ac6]" />
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// Simple syntax highlighting function
function highlightLine(line: string): JSX.Element {
  // This is a simplified version - in production, you'd want to use highlight.js properly
  // For now, we'll do basic regex-based highlighting

  // We'll split by words and highlight keywords
  const words = line.split(/(\s+)/) // Split on whitespace, keeping the whitespace

  return (
    <>
      {words.map((word, index) => {
        if (word.trim() === "") {
          return <span key={index}>{word}</span> // whitespace
        }

        // Check if it's a keyword (case insensitive)
        const isKeyword = /^(SELECT|DISTINCT|FROM|WHERE|GROUP BY|ORDER BY|HAVING|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|FULL JOIN|CROSS JOIN|UNION|INSERT INTO|UPDATE|DELETE FROM|CREATE TABLE|ALTER TABLE|DROP TABLE|VALUES|SET|AND|OR|NOT|IN|IS NULL|IS NOT NULL|BETWEEN|LIKE|EXISTS|CASE|WHEN|THEN|ELSE|END|TRUE|FALSE|null)$/i.test(word)

        if (isKeyword) {
          return <span key={index} className="text-[#818cf8] font-medium">{word}</span>
        }

        // Numbers
        if (/\b\d+(\.\d+)?\b/.test(word)) {
          return <span key={index} className="text-[#fb923c]">{word}</span>
        }

        // Strings
        if (/^'[^']*'$/.test(word)) {
          return <span key={index} className="text-[#34d399]">{word}</span>
        }

        // Comments
        if (/^--/.test(word)) {
          return <span key={index} className="text-[#6b7280]">{word}</span>
        }

        return <span key={index} className="text-white">{word}</span>
      })}
    </>
  )
}