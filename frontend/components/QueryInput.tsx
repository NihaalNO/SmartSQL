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
  { value: "groq", label: "Groq \u00B7 llama-3.3-70b" },
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
    <div className="mint-card overflow-hidden transition-colors duration-200"
      style={{ borderColor: focused ? "var(--mint-green)" : undefined }}>
      <div className="px-4 pt-3 pb-2.5 border-b border-border flex flex-wrap gap-2">
        <span className="text-xs self-center mr-1 text-muted-foreground">Try:</span>
        {EXAMPLES.map((q) => (
          <button
            key={q}
            onClick={() => setQuestion(q)}
            className="cursor-pointer text-xs px-2.5 py-1 rounded-md border border-border text-muted-foreground bg-secondary hover:text-foreground transition-colors"
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
          placeholder="Ask anything in plain English \u2014 e.g. 'Show me the top 5 users by saved queries'"
          rows={3}
          className="w-full rounded-md px-4 py-3 text-sm border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/25 resize-none transition-colors duration-150"
          disabled={loading}
        />

        <div className="flex items-center gap-3">
          <div style={{ width: "180px" }}>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger className="w-full h-9 px-3 rounded-md border border-input bg-card text-xs text-foreground focus:outline-none focus:border-accent transition-colors">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent className="rounded-md border border-border bg-card text-xs text-foreground">
                {PROVIDERS.map((p) => (
                  <SelectItem
                    key={p.value}
                    value={p.value}
                    className="cursor-pointer py-1.5 px-3 hover:bg-secondary focus:bg-secondary transition-colors"
                  >
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground hidden sm:block">
            Ctrl+Enter to run
          </p>

          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-xs font-medium text-primary-foreground transition-colors duration-150 hover:bg-[var(--mint-charcoal)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <>
                <div className="w-3 h-3 rounded-full border border-white/30 border-t-white animate-spin" />
                Generating\u2026
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
