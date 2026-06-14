"use client"
import { useState } from "react"
import { ChevronDown, Zap } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"

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
          <Button
            key={q}
            variant="outline"
            size="icon"
            asChild
          >
            <button
              onClick={() => setQuestion(q)}
              className="text-xs px-3 py-1.5 rounded-full border transition-colors"
              style={{
                background: "rgba(0,74,198,0.06)",
                borderColor: "rgba(0,74,198,0.20)",
                color: "#004ac6",
              } as React.CSSProperties}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLElement).style.background =
                  "rgba(0,74,198,0.12)"
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLElement).style.background =
                  "rgba(0,74,198,0.06)"
              }}
            >
              {q}
            </button>
          </Button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask anything in plain English — e.g. 'Show me the top 5 users by saved queries'"
          rows={3}
          className="w-full"
          disabled={loading}
        />

        <div className="flex items-center gap-3">
          {/* Provider selector */}
          <div className="relative w-[200px]">
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger
                className="w-full h-10 pl-3 pr-8 border border-outline-variant rounded-lg bg-surface-container-low text-label-lg text-on-surface focus:-outline-none focus:ring-2 transition-colors"
                style={{
                  "--tw-ring-color": "#004ac6",
                } as React.CSSProperties}
              >
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent className="w-full popover">
                {PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ChevronDown
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
            />
          </div>

          <p className="text-label-sm text-on-surface-variant ml-1 hidden sm:block">
            Ctrl+Enter to run
          </p>

          {/* Lightning bolt run button */}
          <Button
            type="submit"
            disabled={loading || !question.trim()}
            className="ml-auto"
            variant={loading ? "default" : "default"}
          >
            {loading ? (
              <>
                <Zap size={16} className="animate-pulse" />
                Running…
              </>
            ) : (
              <>
                <Zap size={16} />
                Run Query
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}