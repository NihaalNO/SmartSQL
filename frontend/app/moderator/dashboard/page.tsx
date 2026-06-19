"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Database, LogOut, RefreshCw, Users, Activity, CheckCircle, XCircle, AlertTriangle, Bookmark } from "lucide-react"
import toast from "react-hot-toast"
import { adminApi } from "@/lib/api"
import { getModUser, modLogout } from "@/lib/modAuth"

interface Stats {
  total_users: number; active_users: number; inactive_users: number
  total_queries: number; success_queries: number; success_rate: number; saved_queries: number
}
interface User {
  id: number; full_name: string; email: string; role: string; status: string; created_at: string
}
interface Log {
  id: number; user_email: string; user_full_name: string
  natural_language_query: string; execution_status: string
  execution_time_ms: number | null; row_count: number | null
  model_provider: string | null; created_at: string
}
type Tab = "overview" | "users" | "logs"

function StatCard({ label, value, sub, accentColor, icon }: {
  label: string; value: string | number; sub?: string; accentColor: string; icon: React.ReactNode
}) {
  return (
    <div className="surface-1 rounded-xl p-5" style={{ borderColor: "rgba(148,163,184,0.08)" }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#64748B" }}>{label}</p>
        <span style={{ color: accentColor }}>{icon}</span>
      </div>
      <p className="text-3xl font-bold mb-1" style={{ color: accentColor }}>{value}</p>
      {sub && <p className="text-xs" style={{ color: "#64748B" }}>{sub}</p>}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { cls: string; color: string }> = {
    active:   { cls: "bg-[#22C55E]/10", color: "#22C55E" },
    inactive: { cls: "bg-[#EF4444]/10", color: "#EF4444" },
    success:  { cls: "bg-[#22C55E]/10", color: "#22C55E" },
    failed:   { cls: "bg-[#EF4444]/10", color: "#EF4444" },
    blocked:  { cls: "bg-[#F59E0B]/10", color: "#F59E0B" },
    template: { cls: "bg-[#14B8A6]/10", color: "#14B8A6" },
  }
  const s = cfg[status] ?? { cls: "bg-white/5", color: "#64748B" }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${s.cls}`} style={{ color: s.color }}>
      {status}
    </span>
  )
}

export default function ModeratorDashboard() {
  const router = useRouter()
  const user   = getModUser()

  const [tab,     setTab]     = useState<Tab>("overview")
  const [stats,   setStats]   = useState<Stats | null>(null)
  const [users,   setUsers]   = useState<User[]>([])
  const [logs,    setLogs]    = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState("")

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [s, u, l] = await Promise.all([adminApi.stats(), adminApi.users(), adminApi.logs(100)])
      setStats(s); setUsers(u); setLogs(l)
    } catch { toast.error("Failed to load data") }
    finally { setLoading(false) }
  }

  const handleLogout = () => { modLogout(); router.replace("/moderator/login") }

  const handleStatusToggle = async (u: User) => {
    const next = u.status === "active" ? "inactive" : "active"
    try {
      await adminApi.updateUserStatus(u.id, next)
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, status: next } : x))
      toast.success(`${u.full_name} set to ${next}`)
    } catch { toast.error("Failed to update status") }
  }

  const handleRoleChange = async (u: User, role: string) => {
    try {
      await adminApi.updateUserRole(u.id, role)
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role } : x))
      toast.success(`${u.full_name} role updated`)
    } catch { toast.error("Failed to update role") }
  }

  const handleDelete = async (u: User) => {
    if (!confirm(`Delete ${u.full_name} (${u.email})? This is irreversible.`)) return
    try {
      await adminApi.deleteUser(u.id)
      setUsers(prev => prev.filter(x => x.id !== u.id))
      toast.success(`${u.full_name} deleted`)
    } catch { toast.error("Failed to delete user") }
  }

  const filteredUsers = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )
  const filteredLogs = logs.filter(l =>
    l.natural_language_query?.toLowerCase().includes(search.toLowerCase()) ||
    l.user_email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#050816" }}>
      <header className="flex items-center justify-between px-6 py-3 sticky top-0 z-20" style={{ background: "rgba(10,16,32,0.85)", borderBottom: "1px solid rgba(148,163,184,0.08)", backdropFilter: "blur(12px)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(20,184,166,0.1)" }}>
            <Database size={15} style={{ color: "#14B8A6" }} />
          </div>
          <div>
            <span className="font-bold text-sm" style={{ color: "#F8FAFC", fontFamily: "'Fira Code', 'JetBrains Mono', monospace" }}>SmartSQL</span>
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(20,184,166,0.1)", color: "#14B8A6", border: "1px solid rgba(20,184,166,0.2)" }}>
              Admin Panel
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm" style={{ color: "#64748B" }}>{user?.full_name}</span>
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: "#64748B", border: "1px solid rgba(148,163,184,0.1)" }}>
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </header>

      <div className="flex items-center gap-1 px-6 pt-5 pb-0">
        {(["overview", "users", "logs"] as Tab[]).map(t => (
          <button key={t} onClick={() => { setTab(t); setSearch("") }}
            className="px-4 py-2 rounded-t-lg text-sm font-semibold transition-all capitalize"
            style={tab === t ? { color: "#14B8A6", borderBottom: "2px solid #14B8A6", background: "rgba(255,255,255,0.02)" } : { color: "#64748B", borderBottom: "2px solid transparent" }}>
            {t}
          </button>
        ))}
        <button onClick={loadData}
          className="ml-auto text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
          style={{ color: "#64748B", border: "1px solid rgba(148,163,184,0.1)" }}>
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      <main className="flex-1 p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64 gap-3" style={{ color: "#64748B" }}>
            <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(20,184,166,0.3)", borderTopColor: "#14B8A6" }} />
            <span className="text-sm">Loading…</span>
          </div>
        ) : (
          <>
            {tab === "overview" && stats && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-semibold mb-4" style={{ color: "#F8FAFC" }}>Platform Overview</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Total Users"    value={stats.total_users}    sub={`${stats.active_users} active`}   accentColor="#14B8A6" icon={<Users size={16} />} />
                    <StatCard label="Inactive Users" value={stats.inactive_users}                                         accentColor="#EF4444" icon={<XCircle size={16} />} />
                    <StatCard label="Total Queries"  value={stats.total_queries}  sub={`${stats.success_rate}% success`} accentColor="#22C55E" icon={<Activity size={16} />} />
                    <StatCard label="Saved Queries"  value={stats.saved_queries}                                          accentColor="#60A5FA" icon={<Bookmark size={16} />} />
                  </div>
                </div>

                <div className="surface-1 rounded-xl p-5" style={{ borderColor: "rgba(148,163,184,0.08)" }}>
                  <h3 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "#64748B" }}>
                    Query Execution Breakdown
                  </h3>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs w-14" style={{ color: "#64748B" }}>Success</span>
                    <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${stats.success_rate}%`, background: "linear-gradient(90deg, #22C55E, #16a34a)" }} />
                    </div>
                    <span className="text-xs font-mono font-semibold" style={{ color: "#22C55E" }}>{stats.success_rate}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs w-14" style={{ color: "#64748B" }}>Failed</span>
                    <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${100 - stats.success_rate}%`, background: "linear-gradient(90deg, #EF4444, #dc2626)" }} />
                    </div>
                    <span className="text-xs font-mono font-semibold" style={{ color: "#EF4444" }}>{(100 - stats.success_rate).toFixed(1)}%</span>
                  </div>
                </div>

                <div className="rounded-xl overflow-hidden surface-1" style={{ borderColor: "rgba(148,163,184,0.08)" }}>
                  <div className="px-5 py-3" style={{ borderBottom: "1px solid rgba(148,163,184,0.05)", background: "rgba(255,255,255,0.02)" }}>
                    <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#64748B" }}>
                      Recent Queries (last 5)
                    </span>
                  </div>
                  <table className="w-full text-sm">
                    <tbody>
                      {logs.slice(0, 5).map(l => (
                        <tr key={l.id} className="transition-colors" style={{ borderBottom: "1px solid rgba(148,163,184,0.05)" }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <td className="px-5 py-3 text-xs max-w-xs truncate" style={{ color: "#64748B" }}>{l.user_email}</td>
                          <td className="px-5 py-3 text-xs max-w-sm truncate" style={{ color: "#CBD5E1" }}>{l.natural_language_query}</td>
                          <td className="px-5 py-3"><StatusBadge status={l.execution_status} /></td>
                          <td className="px-5 py-3 text-xs text-right" style={{ color: "#64748B" }}>
                            {new Date(l.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === "users" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold" style={{ color: "#F8FAFC" }}>
                    User Management
                    <span className="ml-2 text-sm font-normal" style={{ color: "#64748B" }}>({users.length} users)</span>
                  </h2>
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name or email…"
                    className="surface-input px-3 py-1.5 text-xs w-[240px]"
                    style={{ borderColor: "rgba(148,163,184,0.15)" }}
                  />
                </div>

                <div className="rounded-xl overflow-hidden surface-1" style={{ borderColor: "rgba(148,163,184,0.08)" }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(148,163,184,0.05)" }}>
                        {["Name", "Email", "Role", "Status", "Joined", "Actions"].map(h => (
                          <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(u => (
                        <tr key={u.id} className="transition-colors" style={{ borderBottom: "1px solid rgba(148,163,184,0.05)" }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <td className="px-5 py-3 font-medium text-sm" style={{ color: "#CBD5E1" }}>{u.full_name}</td>
                          <td className="px-5 py-3 text-sm" style={{ color: "#64748B" }}>{u.email}</td>
                          <td className="px-5 py-3">
                            <select value={u.role} onChange={e => handleRoleChange(u, e.target.value)}
                              className="text-xs rounded px-2 py-1 outline-none cursor-pointer font-semibold"
                              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(148,163,184,0.1)", color: "#14B8A6" }}>
                              <option value="analyst">Analyst</option>
                              <option value="viewer">Viewer</option>
                            </select>
                          </td>
                          <td className="px-5 py-3"><StatusBadge status={u.status} /></td>
                          <td className="px-5 py-3 text-xs" style={{ color: "#64748B" }}>
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleStatusToggle(u)}
                                className="text-xs px-2.5 py-1 rounded-md font-medium transition-all"
                                style={{
                                  background: u.status === "active" ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
                                  color: u.status === "active" ? "#EF4444" : "#22C55E"
                                }}>
                                {u.status === "active" ? "Deactivate" : "Activate"}
                              </button>
                              <button onClick={() => handleDelete(u)}
                                className="text-xs px-2 py-1 rounded-md font-medium transition-all"
                                style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444" }}>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-sm" style={{ color: "#64748B" }}>No users found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === "logs" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold" style={{ color: "#F8FAFC" }}>
                    Query Logs
                    <span className="ml-2 text-sm font-normal" style={{ color: "#64748B" }}>({logs.length} entries)</span>
                  </h2>
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by query or email…"
                    className="surface-input px-3 py-1.5 text-xs w-[240px]"
                    style={{ borderColor: "rgba(148,163,184,0.15)" }}
                  />
                </div>

                <div className="rounded-xl overflow-hidden surface-1" style={{ borderColor: "rgba(148,163,184,0.08)" }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(148,163,184,0.05)" }}>
                        {["User", "Query", "Status", "Time (ms)", "Rows", "Model", "When"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.map(l => (
                        <tr key={l.id} className="transition-colors" style={{ borderBottom: "1px solid rgba(148,163,184,0.05)" }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <td className="px-4 py-3 text-xs" style={{ color: "#64748B" }}>{l.user_email}</td>
                          <td className="px-4 py-3 max-w-xs">
                            <p className="truncate text-xs" style={{ color: "#CBD5E1" }}>{l.natural_language_query}</p>
                          </td>
                          <td className="px-4 py-3"><StatusBadge status={l.execution_status} /></td>
                          <td className="px-4 py-3 text-xs font-mono" style={{ color: "#64748B" }}>{l.execution_time_ms ?? "—"}</td>
                          <td className="px-4 py-3 text-xs font-mono" style={{ color: "#64748B" }}>{l.row_count ?? "—"}</td>
                          <td className="px-4 py-3 text-xs" style={{ color: "#64748B" }}>{l.model_provider ?? "—"}</td>
                          <td className="px-4 py-3 text-xs" style={{ color: "#64748B" }}>
                            {new Date(l.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {filteredLogs.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center py-12 text-sm" style={{ color: "#64748B" }}>No logs found.</td>
                        </tr>
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
