"use client"
import { useEffect, useState } from "react"
import { BookmarkCheck, Star, Trash2, Play } from "lucide-react"
import toast from "react-hot-toast"
import { queryApi } from "@/lib/api"
import { canSaveQueries } from "@/lib/auth"
import type { SavedQuery } from "@/types"
import { useRouter } from "next/navigation"

export default function SavedPage() {
  const [queries, setQueries] = useState<SavedQuery[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!canSaveQueries()) router.replace("/query")
  }, [router])

  const load = () => {
    queryApi.savedList().then(setQueries).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const deleteQuery = async (id: number) => {
    try {
      await queryApi.deleteSaved(id)
      toast.success("Deleted")
      setQueries((prev) => prev.filter((q) => q.id !== id))
    } catch {
      toast.error("Could not delete")
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5 animate-fade-in-up">
      <div>
        <h1 className="text-lg font-bold text-[#F8FAFC]">Saved Queries</h1>
        <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>Your bookmarked and favorite queries</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 py-8" style={{ color: "#64748B" }}>
          <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(20,184,166,0.3)", borderTopColor: "#14B8A6" }} />
          <span className="text-sm">Loading…</span>
        </div>
      ) : queries.length === 0 ? (
        <div className="rounded-lg border py-12 text-center" style={{ borderColor: "rgba(148,163,184,0.08)", background: "rgba(255,255,255,0.02)" }}>
          <BookmarkCheck size={28} style={{ color: "rgba(148,163,184,0.3)" }} className="mx-auto mb-3" />
          <p className="text-sm" style={{ color: "#64748B" }}>No saved queries yet</p>
          <p className="text-xs mt-1" style={{ color: "rgba(148,163,184,0.5)" }}>Run a query and click &quot;Save&quot; to add it here</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: "rgba(148,163,184,0.08)" }}>
          {queries.map((q) => (
            <div key={q.id} className="border-b last:border-0" style={{ borderColor: "rgba(148,163,184,0.05)" }}>
              <div className="flex items-start gap-3 px-4 py-3">
                {q.is_favorite && <Star size={14} style={{ color: "#F59E0B", fill: "#F59E0B" }} className="shrink-0 mt-1" />}
                <div className="flex-1 min-w-0">
                  <button onClick={() => setExpanded(expanded === q.id ? null : q.id)} className="text-left w-full">
                    <p className="text-sm font-semibold text-[#CBD5E1]">{q.title}</p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: "#64748B" }}>{q.natural_language_query}</p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(148,163,184,0.5)" }}>{new Date(q.created_at).toLocaleDateString()}</p>
                  </button>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => router.push(`/query?q=${encodeURIComponent(q.natural_language_query)}`)}
                    className="p-1.5 rounded transition-colors"
                    style={{ color: "#64748B" }}
                    onMouseEnter={e => { e.currentTarget.style.color = "#14B8A6"; e.currentTarget.style.background = "rgba(20,184,166,0.1)" }}
                    onMouseLeave={e => { e.currentTarget.style.color = "#64748B"; e.currentTarget.style.background = "transparent" }}
                    title="Run again"
                  >
                    <Play size={14} />
                  </button>
                  <button
                    onClick={() => deleteQuery(q.id)}
                    className="p-1.5 rounded transition-colors"
                    style={{ color: "#64748B" }}
                    onMouseEnter={e => { e.currentTarget.style.color = "#EF4444"; e.currentTarget.style.background = "rgba(239,68,68,0.1)" }}
                    onMouseLeave={e => { e.currentTarget.style.color = "#64748B"; e.currentTarget.style.background = "transparent" }}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {expanded === q.id && (
                <div className="px-4 pb-3">
                  <pre className="sql-block text-xs">{q.generated_sql}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
