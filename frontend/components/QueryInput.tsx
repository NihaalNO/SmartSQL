"use client"
import { useState } from "react"
import { Zap } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"

const PROVIDERS = [
  { value: "groq", label: "Groq · llama-3.3-70b" },
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
  const [focused, setFocused] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim() || loading) return
    onSubmit(question.trim(), provider)
  }

  return (
    <div className="rounded-lg border overflow-hidden" style={{
      borderColor: focused ? "rgba(20,184,166,0.3)" : "rgba(148,163,184,0.1)",
      background: "rgba(255,255,255,0.02)",
      transition: "border-color 0.2s",
    }}>
      <div className="px-4 pt-3 pb-2.5 border-b flex flex-wrap gap-2" style={{ borderColor: "rgba(148,163,184,0.06)" }}>
        <span className="text-xs self-center mr-1" style={{ color: "#64748B" }}>Try:</span>
        {EXAMPLES.map((q) => (
          <button
            key={q}
            onClick={() => setQuestion(q)}
            className="text-xs px-2.5 py-1 rounded-md border transition-colors"
            style={{ borderColor: "rgba(20,184,166,0.15)", color: "#14B8A6", background: "rgba(20,184,166,0.06)" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(20,184,166,0.12)" }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(20,184,166,0.06)" }}
          >
            {q}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-3">
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Ask anything in plain English — e.g. 'Show me the top 5 users by saved queries'"
          rows={3}
          className="w-full rounded-lg px-3 py-2.5 text-sm border transition-colors resize-none"
          style={{
            background: "rgba(0,0,0,0.25)",
            borderColor: focused ? "rgba(20,184,166,0.3)" : "rgba(148,163,184,0.1)",
            color: "#CBD5E1",
          }}
          disabled={loading}
        />

        <div className="flex items-center gap-3">
          <div className="relative" style={{ width: "180px" }}>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger
                className="w-full h-9 pl-3 pr-7 rounded-lg border text-xs transition-colors"
                style={{
                  background: "rgba(0,0,0,0.25)",
                  borderColor: "rgba(148,163,184,0.1)",
                  color: "#CBD5E1",
                }}
              >
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent
                className="rounded-lg border text-xs"
                style={{
                  background: "#0A1020",
                  borderColor: "rgba(148,163,184,0.1)",
                  color: "#CBD5E1",
                }}
              >
                {PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}
                    className="cursor-pointer py-1.5 px-3"
                    style={{ color: "#CBD5E1" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(20,184,166,0.08)" }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs hidden sm:block" style={{ color: "#64748B" }}>
            Ctrl+Enter to run
          </p>

          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all duration-200 disabled:opacity-40"
            style={{ background: "#14B8A6" }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.boxShadow = "0 0 12px rgba(20,184,166,0.3)" }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "none" }}
          >
            {loading ? (
              <>
                <div className="w-3 h-3 rounded-full border border-white/30 border-t-white animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Zap size={14} />
                Generate SQL
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
