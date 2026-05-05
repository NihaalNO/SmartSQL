"use client"
import { useEffect, useState } from "react"
import { BookmarkCheck, Star, Trash2, Play } from "lucide-react"
import toast from "react-hot-toast"
import { queryApi } from "@/lib/api"
import type { SavedQuery } from "@/types"
import { useRouter } from "next/navigation"

export default function SavedPage() {
  const [queries, setQueries] = useState<SavedQuery[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)
  const router = useRouter()

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
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Saved Queries</h1>
        <p className="text-gray-500 text-sm mt-1">Your bookmarked and favorite queries</p>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : queries.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <BookmarkCheck size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No saved queries yet</p>
          <p className="text-gray-400 text-sm mt-1">Run a query and click &quot;Save Query&quot; to add it here</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {queries.map((q) => (
            <div key={q.id}>
              <div className="flex items-start gap-3 px-5 py-4">
                {q.is_favorite && <Star size={15} className="text-yellow-400 shrink-0 mt-0.5 fill-yellow-400" />}
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => setExpanded(expanded === q.id ? null : q.id)}
                    className="text-left"
                  >
                    <p className="text-sm font-semibold text-gray-800">{q.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{q.natural_language_query}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(q.created_at).toLocaleDateString()}</p>
                  </button>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => router.push(`/query?q=${encodeURIComponent(q.natural_language_query)}`)}
                    className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-brand-600 transition-colors"
                    title="Run again"
                  >
                    <Play size={15} />
                  </button>
                  <button
                    onClick={() => deleteQuery(q.id)}
                    className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {expanded === q.id && (
                <div className="px-5 pb-4">
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
