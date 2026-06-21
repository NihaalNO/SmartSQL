"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Activity, Bookmark, LogOut, RefreshCw, Users, XCircle } from "lucide-react"
import toast from "react-hot-toast"
import { adminApi } from "@/lib/api"
import { getModUser, modLogout } from "@/lib/modAuth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SmartSQLLogo } from "@/components/brand/SmartSQLLogo"

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

function StatCard({ label, value, sub, icon }: {
  label: string; value: string | number; sub?: string; icon: React.ReactNode
}) {
  return (
    <div className="mint-card p-5">
      <div className="flex items-center justify-between">
        <p className="mint-kicker">{label}</p>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className="mt-4 font-mono text-3xl font-semibold text-foreground">{value}</p>
      {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === "failed" || status === "inactive"
    ? "destructive"
    : status === "blocked"
      ? "warning"
      : status === "success" || status === "active"
        ? "success"
        : "secondary"

  return <Badge variant={variant}>{status}</Badge>
}

export default function ModeratorDashboard() {
  const router = useRouter()
  const user = getModUser()

  const [tab, setTab] = useState<Tab>("overview")
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => { loadData() }, [])

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
    } catch {
      toast.error("Failed to update status")
    }
  }

  const handleRoleChange = async (u: User, role: string) => {
    try {
      await adminApi.updateUserRole(u.id, role)
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role } : x))
      toast.success(`${u.full_name} role updated`)
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

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 px-6 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <SmartSQLLogo variant="icon" size={32} />
            <div>
              <span className="text-sm font-semibold text-foreground">SmartSQL</span>
              <Badge className="ml-2" variant="secondary">Admin Panel</Badge>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.full_name}</span>
            <Button onClick={handleLogout} variant="secondary" size="sm">
              <LogOut size={13} />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mint-kicker">Moderator Console</p>
            <h1 className="mint-title mt-2">Admin</h1>
            <p className="mint-subtitle mt-2">Manage users, platform health, and query logs.</p>
          </div>
          <Button onClick={loadData} variant="secondary" size="sm">
            <RefreshCw size={12} />
            Refresh
          </Button>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2">
          {(["overview", "users", "logs"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setSearch("") }}
              className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium capitalize transition-colors ${
                tab === t ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center gap-3 text-muted-foreground">
            <SmartSQLLogo variant="icon" size={28} className="animate-pulse" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : (
          <>
            {tab === "overview" && stats && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <StatCard label="Total Users" value={stats.total_users} sub={`${stats.active_users} active`} icon={<Users size={16} />} />
                  <StatCard label="Inactive Users" value={stats.inactive_users} icon={<XCircle size={16} />} />
                  <StatCard label="Total Queries" value={stats.total_queries} sub={`${stats.success_rate}% success`} icon={<Activity size={16} />} />
                  <StatCard label="Saved Queries" value={stats.saved_queries} icon={<Bookmark size={16} />} />
                </div>

                <div className="mint-card p-6">
                  <h2 className="text-lg font-semibold">Query Execution Breakdown</h2>
                  <div className="mt-5 space-y-4">
                    <div className="grid gap-3 sm:grid-cols-[80px_1fr_56px] sm:items-center">
                      <span className="text-sm text-muted-foreground">Success</span>
                      <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${stats.success_rate}%` }} />
                      </div>
                      <span className="font-mono text-sm text-[var(--mint-green-deep)]">{stats.success_rate}%</span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[80px_1fr_56px] sm:items-center">
                      <span className="text-sm text-muted-foreground">Failed</span>
                      <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full bg-destructive" style={{ width: `${100 - stats.success_rate}%` }} />
                      </div>
                      <span className="font-mono text-sm text-destructive">{(100 - stats.success_rate).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                <AdminLogTable logs={logs.slice(0, 5)} />
              </div>
            )}

            {tab === "users" && (
              <AdminUserTable
                users={filteredUsers}
                total={users.length}
                search={search}
                setSearch={setSearch}
                onRoleChange={handleRoleChange}
                onStatusToggle={handleStatusToggle}
                onDelete={handleDelete}
              />
            )}

            {tab === "logs" && (
              <div className="space-y-4">
                <SearchHeader title="Query Logs" count={logs.length} search={search} setSearch={setSearch} placeholder="Search by query or email..." />
                <AdminLogTable logs={filteredLogs} />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function SearchHeader({ title, count, search, setSearch, placeholder }: {
  title: string; count: number; search: string; setSearch: (value: string) => void; placeholder: string
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">
        {title}
        <span className="ml-2 text-sm font-normal text-muted-foreground">({count})</span>
      </h2>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder={placeholder} className="mint-input w-full px-4 text-sm sm:w-72" />
    </div>
  )
}

function AdminUserTable({ users, total, search, setSearch, onRoleChange, onStatusToggle, onDelete }: {
  users: User[]; total: number; search: string; setSearch: (value: string) => void
  onRoleChange: (user: User, role: string) => void
  onStatusToggle: (user: User) => void
  onDelete: (user: User) => void
}) {
  return (
    <div className="space-y-4">
      <SearchHeader title="User Management" count={total} search={search} setSearch={setSearch} placeholder="Search by name or email..." />
      <div className="mint-table overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr>
              {["Name", "Email", "Role", "Status", "Joined", "Actions"].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t border-border transition-colors hover:bg-secondary">
                <td className="px-5 py-3 font-medium">{u.full_name}</td>
                <td className="px-5 py-3 text-muted-foreground">{u.email}</td>
                <td className="px-5 py-3">
                  <select value={u.role} onChange={e => onRoleChange(u, e.target.value)} className="mint-input h-8 cursor-pointer px-2 text-xs">
                    <option value="analyst">Analyst</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </td>
                <td className="px-5 py-3"><StatusBadge status={u.status} /></td>
                <td className="px-5 py-3 text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Button onClick={() => onStatusToggle(u)} variant="secondary" size="sm">
                      {u.status === "active" ? "Deactivate" : "Activate"}
                    </Button>
                    <Button onClick={() => onDelete(u)} variant="destructive" size="sm">Delete</Button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AdminLogTable({ logs }: { logs: Log[] }) {
  return (
    <div className="mint-table overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-secondary">
          <tr>
            {["User", "Query", "Status", "Time", "Rows", "Model", "When"].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {logs.map(l => (
            <tr key={l.id} className="border-t border-border transition-colors hover:bg-secondary">
              <td className="px-4 py-3 text-xs text-muted-foreground">{l.user_email}</td>
              <td className="max-w-xs px-4 py-3"><p className="truncate text-xs">{l.natural_language_query}</p></td>
              <td className="px-4 py-3"><StatusBadge status={l.execution_status} /></td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{l.execution_time_ms ?? "-"}</td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{l.row_count ?? "-"}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{l.model_provider ?? "-"}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</td>
            </tr>
          ))}
          {logs.length === 0 && (
            <tr><td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">No logs found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
