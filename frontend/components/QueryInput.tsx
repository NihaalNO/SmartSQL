"use client"
import { useState } from "react"
import { Send, ChevronDown } from "lucide-react"

const PROVIDERS = [
  { value: "groq", label: "Groq (llama-3.3-70b)" },
  { value: "gemini", label: "Gemini 1.5 Flash" },
  { value: "ollama", label: "Ollama (local)" },
]

interface Props {
  onSubmit: (question: string, provider: string) => void
  loading: boolean
}

const EXAMPLE_QUESTIONS = [
  "How many users registered this month?",
  "Show me the last 10 query logs with their status",
  "Which users have the most saved queries?",
  "What is the breakdown of query execution statuses?",
]

export default function QueryInput({ onSubmit, loading }: Props) {
  const [question, setQuestion] = useState("")
  const [provider, setProvider] = useState("groq")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return
    onSubmit(question.trim(), provider)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-gray-800 mb-4">Ask a question about your data</h2>

      {/* Example chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {EXAMPLE_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => setQuestion(q)}
            className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors border border-blue-100"
          >
            {q}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. Show me the top 5 users by number of saved queries"
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit(e)
          }}
        />

        <div className="flex items-center gap-3">
          {/* Provider selector */}
          <div className="relative">
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white cursor-pointer"
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-3 text-gray-400 pointer-events-none" />
          </div>

          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed ml-auto"
          >
            <Send size={15} />
            {loading ? "Running…" : "Run Query"}
          </button>
        </div>
        <p className="text-xs text-gray-400">Tip: Press Ctrl+Enter to run</p>
      </form>
    </div>
  )
}
