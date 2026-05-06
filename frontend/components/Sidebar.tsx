"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Database, History, BookmarkCheck, Search, Zap, LogOut, BarChart3, Shield } from "lucide-react"
import { logout, getUser, hasRole } from "@/lib/auth"
import { clsx } from "clsx"

const ROLE_BADGE: Record<string, { label: string; className: string }> = {
  admin:   { label: "Admin",   className: "bg-red-900/40 text-red-300 border border-red-700" },
  analyst: { label: "Analyst", className: "bg-blue-900/40 text-blue-300 border border-blue-700" },
  viewer:  { label: "Viewer",  className: "bg-gray-700 text-gray-300 border border-gray-600" },
}

export default function Sidebar() {
  const pathname = usePathname()
  const user = getUser()
  const role = user?.role ?? ""

  const NAV = [
    { href: "/dashboard", label: "Dashboard", icon: BarChart3,     roles: ["admin"] },
    { href: "/query",     label: "Query",      icon: Search,        roles: ["admin", "analyst", "viewer"] },
    { href: "/history",   label: "History",    icon: History,       roles: ["admin", "analyst", "viewer"] },
    { href: "/saved",     label: "Saved Queries", icon: BookmarkCheck, roles: ["admin", "analyst"] },
    { href: "/live-db",   label: "Live DB Mode",  icon: Zap,           roles: ["admin", "analyst"] },
  ].filter(item => item.roles.includes(role))

  const badge = ROLE_BADGE[role]

  return (
    <aside className="w-60 min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-700">
        <Database className="text-brand-500" size={22} />
        <span className="font-bold text-lg tracking-tight">SmartSQL</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-3">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              pathname.startsWith(href)
                ? "bg-brand-600 text-white"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-gray-700 px-4 py-4">
        {user && (
          <div className="mb-3 space-y-1">
            <p className="text-sm font-medium truncate">{user.full_name}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
            {badge && (
              <span className={clsx("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium", badge.className)}>
                <Shield size={10} />
                {badge.label}
              </span>
            )}
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-400 transition-colors mt-1"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
