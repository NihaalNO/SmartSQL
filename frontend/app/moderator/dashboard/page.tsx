"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { adminApi } from "@/lib/api"
import { getModUser, modLogout } from "@/lib/modAuth"

// ---------------------------------------------------------------------------
// Stitch design tokens (Premium Login schema)
// ---------------------------------------------------------------------------
const C = {
  surface:               "#faf8ff",
  surfaceLow:            "#f3f3fe",
  surfaceContainer:      "#ededf8",
  surfaceHigh:           "#e7e7f3",
  surfaceHighest:        "#e1e1ed",
  onSurface:             "#191b23",
  onSurfaceVariant:      "#434654",
  onSecondaryContainer:  "#5d6476",
  outline:               "#737685",
  outlineVariant:        "#c3c6d6",
  primary:               "#003594",
  primaryContainer:      "#004ac6",
  primaryFaint:          "rgba(0,53,148,0.08)",
  error:                 "#ba1a1a",
  errorFaint:            "rgba(186,26,26,0.08)",
  success:               "#065f46",
  successFaint:          "rgba(5,150,105,0.08)",
  tertiary:              "#4e00ae",
  tertiaryFaint:         "rgba(78,0,174,0.08)",
  amber:                 "#92400e",
  amberFaint:            "rgba(161,98,7,0.08)",
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({ label, value, sub, accentColor }: {
  label: string; value: string | number; sub?: string; accentColor: string
}) {
  return (
    <div className="rounded-xl p-5"
      style={{
        background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(8px)",
        border: `1px solid ${C.outlineVariant}40`,
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}>
      <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: C.outline }}>{label}</p>
      <p className="text-3xl font-bold mb-1" style={{ color: accentColor }}>{value}</p>
      {sub && <p className="text-xs" style={{ color: C.onSecondaryContainer }}>{sub}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Status badge — light theme
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string }> = {
    active:   { bg: C.successFaint,  color: C.success   },
    inactive: { bg: C.errorFaint,    color: C.error      },
    success:  { bg: C.successFaint,  color: C.success    },
    failed:   { bg: C.errorFaint,    color: C.error      },
    blocked:  { bg: C.amberFaint,    color: C.amber      },
    template: { bg: C.tertiaryFaint, color: C.tertiary   },
  }
  const s = cfg[status] ?? { bg: `${C.outlineVariant}40`, color: C.outline }
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

  useEffect(() => { loadData() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData() {
    setLoading(true)
    try {
      const [s, u, l] = await Promise.all([adminApi.stats(), adminApi.users(), adminApi.logs(100)])
      setStats(s); setUsers(u); setLogs(l)
    } catch {
      toast.error("Failed to load data")
    } finally {
      setLoading(false)
    }
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

  const inputStyle: React.CSSProperties = {
    background: "#ffffff",
    border: `1px solid ${C.outlineVariant}`,
    color: C.onSurface,
    borderRadius: "0.5rem",
    fontSize: "0.875rem",
    padding: "6px 12px",
    outline: "none",
    width: "240px",
  }

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: `radial-gradient(circle at top left, ${C.surfaceLow} 0%, ${C.surface} 100%)`, fontFamily: "Inter, sans-serif" }}>

      {/* Decorative blobs */}
      <div className="fixed top-0 right-0 -z-10 rounded-full pointer-events-none"
        style={{ width: "50vw", height: "50vh", background: `${C.primary}08`, filter: "blur(100px)" }} />
      <div className="fixed bottom-0 left-0 -z-10 rounded-full pointer-events-none"
        style={{ width: "35vw", height: "35vh", background: `${C.tertiary}06`, filter: "blur(80px)" }} />

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-6 py-3 border-b sticky top-0 z-20"
        style={{
          background: "rgba(250,248,255,0.85)",
          backdropFilter: "blur(12px)",
          borderColor: `${C.outlineVariant}60`,
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}>
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: C.primary, boxShadow: `0 4px 10px -2px ${C.primary}40` }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <ellipse cx="12" cy="5" rx="9" ry="3"/>
              <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
              <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>
            </svg>
          </div>
          <div>
            <span className="font-bold text-sm" style={{ color: C.onSurface }}>SmartSQL</span>
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: C.primaryFaint, color: C.primary, border: `1px solid ${C.primary}30` }}>
              Admin Panel
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm" style={{ color: C.onSurfaceVariant }}>{user?.full_name}</span>
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: C.outline, border: `1px solid ${C.outlineVariant}` }}
            onMouseEnter={e => { e.currentTarget.style.color = C.error; e.currentTarget.style.borderColor = `${C.error}50` }}
            onMouseLeave={e => { e.currentTarget.style.color = C.outline; e.currentTarget.style.borderColor = C.outlineVariant }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign out
          </button>
        </div>
      </header>

      {/* ── Tab bar ── */}
      <div className="flex items-center gap-1 px-6 pt-5 pb-0">
        {(["overview", "users", "logs"] as Tab[]).map(t => (
          <button key={t} onClick={() => { setTab(t); setSearch("") }}
            className="px-4 py-2 rounded-t-lg text-sm font-semibold transition-all capitalize"
            style={{
              background:   tab === t ? "rgba(255,255,255,0.80)" : "transparent",
              color:        tab === t ? C.primary : C.outline,
              borderBottom: tab === t ? `2px solid ${C.primary}` : "2px solid transparent",
              backdropFilter: tab === t ? "blur(8px)" : "none",
            }}>
            {t}
          </button>
        ))}
        <button onClick={loadData}
          className="ml-auto text-xs px-3 py-1.5 rounded-lg transition-all"
          style={{ color: C.outline, border: `1px solid ${C.outlineVariant}` }}
          onMouseEnter={e => { e.currentTarget.style.color = C.primary; e.currentTarget.style.borderColor = `${C.primary}50` }}
          onMouseLeave={e => { e.currentTarget.style.color = C.outline; e.currentTarget.style.borderColor = C.outlineVariant }}>
          ↻ Refresh
        </button>
      </div>

      {/* ── Content ── */}
      <main className="flex-1 p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64 gap-3" style={{ color: C.outline }}>
            <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: `${C.primary}40`, borderTopColor: C.primary }} />
            <span className="text-sm">Loading…</span>
          </div>
        ) : (
          <>
            {/* ── Overview ── */}
            {tab === "overview" && stats && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-semibold mb-4" style={{ color: C.onSurface }}>Platform Overview</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Total Users"    value={stats.total_users}    sub={`${stats.active_users} active`}   accentColor={C.primary} />
                    <StatCard label="Inactive Users" value={stats.inactive_users}                                          accentColor={C.error} />
                    <StatCard label="Total Queries"  value={stats.total_queries}  sub={`${stats.success_rate}% success`} accentColor={C.success} />
                    <StatCard label="Saved Queries"  value={stats.saved_queries}                                           accentColor={C.tertiary} />
                  </div>
                </div>

                {/* Query breakdown */}
                <div className="rounded-xl p-5"
                  style={{
                    background: "rgba(255,255,255,0.75)",
                    backdropFilter: "blur(8px)",
                    border: `1px solid ${C.outlineVariant}40`,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                  }}>
                  <h3 className="text-xs font-semibold uppercase tracking-widest mb-4"
                    style={{ color: C.outline }}>Query Execution Breakdown</h3>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs w-14" style={{ color: C.onSecondaryContainer }}>Success</span>
                    <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: C.surfaceHighest }}>
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${stats.success_rate}%`, background: `linear-gradient(to right, ${C.success}, #16a34a)` }} />
                    </div>
                    <span className="text-xs font-mono font-semibold" style={{ color: C.success }}>{stats.success_rate}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs w-14" style={{ color: C.onSecondaryContainer }}>Failed</span>
                    <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: C.surfaceHighest }}>
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${100 - stats.success_rate}%`, background: `linear-gradient(to right, ${C.error}, #dc2626)` }} />
                    </div>
                    <span className="text-xs font-mono font-semibold" style={{ color: C.error }}>{(100 - stats.success_rate).toFixed(1)}%</span>
                  </div>
                </div>

                {/* Recent logs preview */}
                <div className="rounded-xl overflow-hidden"
                  style={{ border: `1px solid ${C.outlineVariant}50`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                  <div className="px-5 py-3 border-b"
                    style={{ background: C.surfaceLow, borderColor: `${C.outlineVariant}50` }}>
                    <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.outline }}>
                      Recent Queries (last 5)
                    </span>
                  </div>
                  <table className="w-full text-sm" style={{ background: "rgba(255,255,255,0.70)" }}>
                    <tbody>
                      {logs.slice(0, 5).map(l => (
                        <tr key={l.id} className="transition-colors"
                          style={{ borderBottom: `1px solid ${C.outlineVariant}30` }}
                          onMouseEnter={e => (e.currentTarget.style.background = C.primaryFaint)}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          <td className="px-5 py-3 text-xs max-w-xs truncate" style={{ color: C.onSurfaceVariant }}>{l.user_email}</td>
                          <td className="px-5 py-3 text-xs max-w-sm truncate" style={{ color: C.onSurface }}>{l.natural_language_query}</td>
                          <td className="px-5 py-3"><StatusBadge status={l.execution_status} /></td>
                          <td className="px-5 py-3 text-xs text-right" style={{ color: C.outline }}>
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
                  <h2 className="text-base font-semibold" style={{ color: C.onSurface }}>
                    User Management
                    <span className="ml-2 text-sm font-normal" style={{ color: C.outline }}>({users.length} users)</span>
                  </h2>
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name or email…"
                    style={inputStyle}
                    onFocus={e => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.boxShadow = `0 0 0 3px ${C.primaryFaint}` }}
                    onBlur={e  => { e.currentTarget.style.borderColor = C.outlineVariant; e.currentTarget.style.boxShadow = "none" }}
                  />
                </div>

                <div className="rounded-xl overflow-hidden"
                  style={{ border: `1px solid ${C.outlineVariant}50`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: C.surfaceLow, borderBottom: `1px solid ${C.outlineVariant}50` }}>
                        {["Name", "Email", "Role", "Status", "Joined", "Actions"].map(h => (
                          <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                            style={{ color: C.onSurfaceVariant }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody style={{ background: "rgba(255,255,255,0.70)" }}>
                      {filteredUsers.map(u => (
                        <tr key={u.id} className="transition-colors"
                          style={{ borderBottom: `1px solid ${C.outlineVariant}30` }}
                          onMouseEnter={e => (e.currentTarget.style.background = C.primaryFaint)}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          <td className="px-5 py-3 font-medium text-sm" style={{ color: C.onSurface }}>{u.full_name}</td>
                          <td className="px-5 py-3 text-sm" style={{ color: C.onSurfaceVariant }}>{u.email}</td>
                          <td className="px-5 py-3">
                            <select value={u.role} onChange={e => handleRoleChange(u, e.target.value)}
                              className="text-xs rounded px-2 py-1 outline-none cursor-pointer"
                              style={{
                                background: C.surfaceLow,
                                border: `1px solid ${C.outlineVariant}`,
                                color: C.primary,
                                fontWeight: 600,
                              }}>
                              <option value="analyst">Analyst</option>
                              <option value="viewer">Viewer</option>
                            </select>
                          </td>
                          <td className="px-5 py-3"><StatusBadge status={u.status} /></td>
                          <td className="px-5 py-3 text-xs" style={{ color: C.outline }}>
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleStatusToggle(u)}
                                className="text-xs px-2.5 py-1 rounded-md font-medium transition-all"
                                style={{
                                  background: u.status === "active" ? C.errorFaint   : C.successFaint,
                                  color:      u.status === "active" ? C.error        : C.success,
                                }}>
                                {u.status === "active" ? "Deactivate" : "Activate"}
                              </button>
                              <button onClick={() => handleDelete(u)}
                                className="text-xs px-2 py-1 rounded-md font-medium transition-all"
                                style={{ background: C.errorFaint, color: C.error }}
                                onMouseEnter={e => (e.currentTarget.style.background = `${C.error}18`)}
                                onMouseLeave={e => (e.currentTarget.style.background = C.errorFaint)}>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-sm" style={{ color: C.outline }}>
                            No users found.
                          </td>
                        </tr>
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
                  <h2 className="text-base font-semibold" style={{ color: C.onSurface }}>
                    Query Logs
                    <span className="ml-2 text-sm font-normal" style={{ color: C.outline }}>({logs.length} entries)</span>
                  </h2>
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by query or email…"
                    style={inputStyle}
                    onFocus={e => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.boxShadow = `0 0 0 3px ${C.primaryFaint}` }}
                    onBlur={e  => { e.currentTarget.style.borderColor = C.outlineVariant; e.currentTarget.style.boxShadow = "none" }}
                  />
                </div>

                <div className="rounded-xl overflow-hidden"
                  style={{ border: `1px solid ${C.outlineVariant}50`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: C.surfaceLow, borderBottom: `1px solid ${C.outlineVariant}50` }}>
                        {["User", "Query", "Status", "Time (ms)", "Rows", "Model", "When"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                            style={{ color: C.onSurfaceVariant }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody style={{ background: "rgba(255,255,255,0.70)" }}>
                      {filteredLogs.map(l => (
                        <tr key={l.id} className="transition-colors"
                          style={{ borderBottom: `1px solid ${C.outlineVariant}30` }}
                          onMouseEnter={e => (e.currentTarget.style.background = C.primaryFaint)}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          <td className="px-4 py-3 text-xs" style={{ color: C.onSurfaceVariant }}>{l.user_email}</td>
                          <td className="px-4 py-3 max-w-xs">
                            <p className="truncate text-xs" style={{ color: C.onSurface }}>{l.natural_language_query}</p>
                          </td>
                          <td className="px-4 py-3"><StatusBadge status={l.execution_status} /></td>
                          <td className="px-4 py-3 text-xs font-mono" style={{ color: C.outline }}>{l.execution_time_ms ?? "—"}</td>
                          <td className="px-4 py-3 text-xs font-mono" style={{ color: C.outline }}>{l.row_count ?? "—"}</td>
                          <td className="px-4 py-3 text-xs" style={{ color: C.outline }}>{l.model_provider ?? "—"}</td>
                          <td className="px-4 py-3 text-xs" style={{ color: C.onSecondaryContainer }}>
                            {new Date(l.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {filteredLogs.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center py-12 text-sm" style={{ color: C.outline }}>
                            No logs found.
                          </td>
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
