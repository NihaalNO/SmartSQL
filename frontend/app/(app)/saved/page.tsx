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
    if (!canSaveQueries()) router.replace("/dashboard")
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
    <div className="mint-page-narrow">
      <div>
        <p className="mint-kicker">Library</p>
        <h1 className="mint-title mt-2">Saved Queries</h1>
        <p className="mint-subtitle mt-2">Your bookmarked and favorite queries</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 py-8 text-muted-foreground">
          <div className="w-4 h-4 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
          <span className="text-sm">Loading&hellip;</span>
        </div>
      ) : queries.length === 0 ? (
        <div className="mint-card py-12 text-center">
          <BookmarkCheck size={28} className="text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No saved queries yet</p>
          <p className="text-xs mt-1 text-muted-foreground/50">Run a query and click &quot;Save&quot; to add it here</p>
        </div>
      ) : (
        <div className="mint-table">
          {queries.map((q) => (
            <div key={q.id} className="border-b border-border last:border-0">
              <div className="flex items-start gap-3 px-4 py-3">
                {q.is_favorite && <Star size={14} className="text-amber-400 fill-amber-400 shrink-0 mt-1" />}
                <div className="flex-1 min-w-0">
                  <button onClick={() => setExpanded(expanded === q.id ? null : q.id)} className="text-left w-full">
                    <p className="text-sm font-medium text-foreground">{q.title}</p>
                    <p className="text-xs mt-0.5 truncate text-muted-foreground">{q.natural_language_query}</p>
                    <p className="text-xs mt-0.5 text-muted-foreground/50">{new Date(q.created_at).toLocaleDateString()}</p>
                  </button>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => router.push(`/query?q=${encodeURIComponent(q.natural_language_query)}`)}
                    className="cursor-pointer p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    title="Run again"
                  >
                    <Play size={14} />
                  </button>
                  <button
                    onClick={() => deleteQuery(q.id)}
                    className="cursor-pointer p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {expanded === q.id && (
                <div className="px-4 pb-3 animate-slide-in-right">
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
