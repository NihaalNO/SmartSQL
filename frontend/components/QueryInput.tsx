"use client"
import { useState } from "react"
import { ChevronDown, Zap } from "lucide-react"

const PROVIDERS = [
  { value: "groq",   label: "Groq · llama-3.3-70b" },
  { value: "gemini", label: "Gemini 1.5 Flash" },
  { value: "ollama", label: "Ollama (local)" },
]

const EXAMPLES = [
  "How many users registered this month?",
  "Show me the last 10 query logs with their status",
  "Which users have the most saved queries?",
  "What is the breakdown of query execution statuses?",
]

interface Props {
  onSubmit: (question: string, provider: string) => void
  loading: boolean
}

export default function QueryInput({ onSubmit, loading }: Props) {
  const [question, setQuestion] = useState("")
  const [provider, setProvider] = useState("groq")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim() || loading) return
    onSubmit(question.trim(), provider)
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">

      {/* Example chips */}
      <div className="px-5 pt-4 pb-3 border-b border-outline-variant/40 flex flex-wrap gap-2">
        <span className="text-label-sm text-on-surface-variant self-center mr-1">Try:</span>
        {EXAMPLES.map((q) => (
          <button
            key={q}
            onClick={() => setQuestion(q)}
            className="text-xs px-3 py-1.5 rounded-full border transition-colors"
            style={{
              background: "rgba(0,74,198,0.06)",
              borderColor: "rgba(0,74,198,0.20)",
              color: "#004ac6",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,74,198,0.12)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(0,74,198,0.06)")}
          >
            {q}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <textarea
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="Ask anything in plain English — e.g. 'Show me the top 5 users by saved queries'"
          rows={3}
          className="w-full px-4 py-3 border border-outline-variant rounded-xl text-body-md text-on-surface bg-surface-container-low
                     placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 resize-none transition-shadow"
          style={{ "--tw-ring-color": "#004ac6" } as React.CSSProperties}
          onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit(e) }}
        />

        <div className="flex items-center gap-3">
          {/* Provider selector */}
          <div className="relative">
            <select
              value={provider}
              onChange={e => setProvider(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 border border-outline-variant rounded-lg
                         text-label-lg text-on-surface bg-surface-container-low
                         focus:outline-none focus:ring-2 cursor-pointer transition-colors"
              style={{ "--tw-ring-color": "#004ac6" } as React.CSSProperties}
            >
              {PROVIDERS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
          </div>

          <p className="text-label-sm text-on-surface-variant ml-1 hidden sm:block">
            Ctrl+Enter to run
          </p>

          {/* Lightning bolt run button */}
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-full font-label-lg text-label-lg
                       text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            style={{ background: loading ? "#004ac6cc" : "#004ac6" }}
          >
            <Zap size={16} className={loading ? "animate-pulse" : ""} />
            {loading ? "Running…" : "Run Query"}
          </button>
        </div>
      </form>
    </div>
  )
}
