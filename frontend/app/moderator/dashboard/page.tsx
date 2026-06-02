"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { adminApi } from "@/lib/api"
import { getModUser, modLogout } from "@/lib/modAuth"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Stats {
  total_users: number; active_users: number; inactive_users: number
  total_queries: number; success_queries: number; success_rate: number; saved_queries: number
}

interface User {
  id: number; full_name: string; email: string
  role: string; status: string; created_at: string
}

interface Log {
  id: number; user_email: string; user_full_name: string
  natural_language_query: string; execution_status: string
  execution_time_ms: number | null; row_count: number | null
  model_provider: string | null; created_at: string
}

type Tab = "overview" | "users" | "logs"

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent: string }) {
  return (
    <div className="rounded-xl p-5" style={{ background: "#1a1d27", border: "1px solid rgba(255,255,255,0.06)" }}>
      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#64748b" }}>{label}</p>
      <p className="text-3xl font-bold mb-1" style={{ color: accent }}>{value}</p>
      {sub && <p className="text-xs" style={{ color: "#475569" }}>{sub}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string }> = {
    active:   { bg: "rgba(34,197,94,0.12)",  color: "#4ade80" },
    inactive: { bg: "rgba(239,68,68,0.12)",  color: "#f87171" },
    success:  { bg: "rgba(34,197,94,0.12)",  color: "#4ade80" },
    failed:   { bg: "rgba(239,68,68,0.12)",  color: "#f87171" },
    blocked:  { bg: "rgba(234,179,8,0.12)",  color: "#facc15" },
    template: { bg: "rgba(99,102,241,0.12)", color: "#a5b4fc" },
  }
  const s = cfg[status] ?? { bg: "rgba(100,116,139,0.12)", color: "#94a3b8" }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ModeratorDashboard() {
  const router = useRouter()
  const user   = getModUser()

  const [tab,     setTab]     = useState<Tab>("overview")
  const [stats,   setStats]   = useState<Stats | null>(null)
  const [users,   setUsers]   = useState<User[]>([])
  const [logs,    setLogs]    = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState("")

  useEffect(() => {
    loadData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData() {
    setLoading(true)
    try {
      const [s, u, l] = await Promise.all([
        adminApi.stats(),
        adminApi.users(),
        adminApi.logs(100),
      ])
      setStats(s); setUsers(u); setLogs(l)
    } catch {
      toast.error("Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    modLogout()
    router.replace("/moderator/login")
  }

  const handleStatusToggle = async (u: User) => {
    const next = u.status === "active" ? "inactive" : "active"
    try {
      await adminApi.updateUserStatus(u.id, next)
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, status: next } : x))
      toast.success(`${u.full_name} set to ${next}`)
    } catch {
      toast.error("Failed to update status")
    }
  }

  const handleRoleChange = async (u: User, role: string) => {
    try {
      await adminApi.updateUserRole(u.id, role)
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role } : x))
      toast.success(`${u.full_name} role → ${role}`)
    } catch {
      toast.error("Failed to update role")
    }
  }

  const handleDelete = async (u: User) => {
    if (!confirm(`Delete ${u.full_name} (${u.email})? This is irreversible.`)) return
    try {
      await adminApi.deleteUser(u.id)
      setUsers(prev => prev.filter(x => x.id !== u.id))
      toast.success(`${u.full_name} deleted`)
    } catch {
      toast.error("Failed to delete user")
    }
  }

  const filteredUsers = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  const filteredLogs = logs.filter(l =>
    l.natural_language_query?.toLowerCase().includes(search.toLowerCase()) ||
    l.user_email?.toLowerCase().includes(search.toLowerCase())
  )

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0f1117" }}>

      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "#1a1d27" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(0,74,198,0.20)", border: "1px solid rgba(0,74,198,0.40)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b4c5ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <div>
            <span className="font-bold text-sm" style={{ color: "#f1f5f9" }}>SmartSQL</span>
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: "rgba(185,28,28,0.20)", color: "#fca5a5", border: "1px solid rgba(185,28,28,0.30)" }}>
              Moderator
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm" style={{ color: "#64748b" }}>{user?.full_name}</span>
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: "#94a3b8", border: "1px solid rgba(255,255,255,0.08)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#f87171")}
            onMouseLeave={e => (e.currentTarget.style.color = "#94a3b8")}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign out
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-6 pt-5 pb-0">
        {(["overview", "users", "logs"] as Tab[]).map(t => (
          <button key={t} onClick={() => { setTab(t); setSearch("") }}
            className="px-4 py-2 rounded-t-lg text-sm font-semibold transition-colors capitalize"
            style={{
              background: tab === t ? "#1a1d27" : "transparent",
              color:      tab === t ? "#f1f5f9"  : "#64748b",
              borderBottom: tab === t ? "2px solid #004ac6" : "2px solid transparent",
            }}>
            {t}
          </button>
        ))}
        <button onClick={loadData} className="ml-auto text-xs px-3 py-1.5 rounded-lg transition-colors"
          style={{ color: "#64748b", border: "1px solid rgba(255,255,255,0.06)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#94a3b8")}
          onMouseLeave={e => (e.currentTarget.style.color = "#64748b")}>
          ↻ Refresh
        </button>
      </div>

      {/* Content */}
      <main className="flex-1 p-6" style={{ background: "#0f1117" }}>
        {loading ? (
          <div className="flex items-center justify-center h-64 gap-3" style={{ color: "#475569" }}>
            <div className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
            Loading…
          </div>
        ) : (
          <>
            {/* ── Overview ── */}
            {tab === "overview" && stats && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-lg font-bold mb-4" style={{ color: "#f1f5f9" }}>Platform Overview</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Total Users"    value={stats.total_users}    sub={`${stats.active_users} active`}   accent="#b4c5ff" />
                    <StatCard label="Inactive Users" value={stats.inactive_users}                                          accent="#f87171" />
                    <StatCard label="Total Queries"  value={stats.total_queries}  sub={`${stats.success_rate}% success`} accent="#4ade80" />
                    <StatCard label="Saved Queries"  value={stats.saved_queries}                                           accent="#facc15" />
                  </div>
                </div>

                {/* Query breakdown */}
                <div className="rounded-xl p-6" style={{ background: "#1a1d27", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <h3 className="text-sm font-semibold mb-4" style={{ color: "#94a3b8" }}>Query Execution Breakdown</h3>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs" style={{ color: "#64748b", width: "60px" }}>Success</span>
                    <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <div className="h-full rounded-full" style={{ width: `${stats.success_rate}%`, background: "#4ade80" }} />
                    </div>
                    <span className="text-xs font-mono" style={{ color: "#4ade80" }}>{stats.success_rate}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs" style={{ color: "#64748b", width: "60px" }}>Failed</span>
                    <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <div className="h-full rounded-full" style={{ width: `${100 - stats.success_rate}%`, background: "#f87171" }} />
                    </div>
                    <span className="text-xs font-mono" style={{ color: "#f87171" }}>{(100 - stats.success_rate).toFixed(1)}%</span>
                  </div>
                </div>

                {/* Recent logs preview */}
                <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="px-5 py-3" style={{ background: "#1a1d27", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <span className="text-sm font-semibold" style={{ color: "#94a3b8" }}>Recent Queries (last 5)</span>
                  </div>
                  <table className="w-full text-sm">
                    <tbody>
                      {logs.slice(0, 5).map(l => (
                        <tr key={l.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <td className="px-5 py-3 max-w-xs truncate" style={{ color: "#94a3b8" }}>{l.user_email}</td>
                          <td className="px-5 py-3 max-w-sm truncate" style={{ color: "#cbd5e1" }}>{l.natural_language_query}</td>
                          <td className="px-5 py-3"><StatusBadge status={l.execution_status} /></td>
                          <td className="px-5 py-3 text-xs text-right" style={{ color: "#475569" }}>
                            {new Date(l.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Users ── */}
            {tab === "users" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold" style={{ color: "#f1f5f9" }}>
                    User Management
                    <span className="ml-2 text-sm font-normal" style={{ color: "#475569" }}>({users.length} users)</span>
                  </h2>
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name or email…"
                    className="text-sm px-3 py-2 rounded-lg outline-none"
                    style={{ background: "#1a1d27", border: "1px solid rgba(255,255,255,0.08)", color: "#f1f5f9", width: "240px" }}
                  />
                </div>

                <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: "#1a1d27", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        {["Name", "Email", "Role", "Status", "Joined", "Actions"].map(h => (
                          <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#475569" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(u => (
                        <tr key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: "transparent" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          <td className="px-5 py-3 font-medium" style={{ color: "#e2e8f0" }}>{u.full_name}</td>
                          <td className="px-5 py-3" style={{ color: "#94a3b8" }}>{u.email}</td>
                          <td className="px-5 py-3">
                            <select value={u.role}
                              onChange={e => handleRoleChange(u, e.target.value)}
                              className="text-xs rounded px-2 py-1 outline-none"
                              style={{ background: "#0f1117", border: "1px solid rgba(255,255,255,0.10)", color: "#b4c5ff" }}>
                              <option value="analyst">Analyst</option>
                              <option value="viewer">Viewer</option>
                            </select>
                          </td>
                          <td className="px-5 py-3"><StatusBadge status={u.status} /></td>
                          <td className="px-5 py-3 text-xs" style={{ color: "#475569" }}>
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              {/* Toggle status */}
                              <button onClick={() => handleStatusToggle(u)}
                                className="text-xs px-2.5 py-1 rounded transition-colors"
                                style={{
                                  background: u.status === "active" ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)",
                                  color:      u.status === "active" ? "#f87171"              : "#4ade80",
                                }}>
                                {u.status === "active" ? "Deactivate" : "Activate"}
                              </button>
                              {/* Delete */}
                              <button onClick={() => handleDelete(u)}
                                className="text-xs px-2 py-1 rounded transition-colors"
                                style={{ background: "rgba(239,68,68,0.08)", color: "#f87171" }}
                                onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.20)")}
                                onMouseLeave={e => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredUsers.length === 0 && (
                        <tr><td colSpan={6} className="text-center py-10 text-sm" style={{ color: "#475569" }}>No users found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Logs ── */}
            {tab === "logs" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold" style={{ color: "#f1f5f9" }}>
                    Query Logs
                    <span className="ml-2 text-sm font-normal" style={{ color: "#475569" }}>({logs.length} entries)</span>
                  </h2>
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by query or email…"
                    className="text-sm px-3 py-2 rounded-lg outline-none"
                    style={{ background: "#1a1d27", border: "1px solid rgba(255,255,255,0.08)", color: "#f1f5f9", width: "240px" }}
                  />
                </div>

                <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: "#1a1d27", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        {["User", "Query", "Status", "Time (ms)", "Rows", "Model", "When"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#475569" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.map(l => (
                        <tr key={l.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: "transparent" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          <td className="px-4 py-3 text-xs" style={{ color: "#94a3b8" }}>{l.user_email}</td>
                          <td className="px-4 py-3 max-w-xs">
                            <p className="truncate text-xs" style={{ color: "#cbd5e1" }}>{l.natural_language_query}</p>
                          </td>
                          <td className="px-4 py-3"><StatusBadge status={l.execution_status} /></td>
                          <td className="px-4 py-3 text-xs font-mono" style={{ color: "#64748b" }}>{l.execution_time_ms ?? "—"}</td>
                          <td className="px-4 py-3 text-xs font-mono" style={{ color: "#64748b" }}>{l.row_count ?? "—"}</td>
                          <td className="px-4 py-3 text-xs" style={{ color: "#64748b" }}>{l.model_provider ?? "—"}</td>
                          <td className="px-4 py-3 text-xs" style={{ color: "#475569" }}>
                            {new Date(l.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {filteredLogs.length === 0 && (
                        <tr><td colSpan={7} className="text-center py-10 text-sm" style={{ color: "#475569" }}>No logs found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
