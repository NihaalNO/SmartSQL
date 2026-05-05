"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Database, History, BookmarkCheck, Search, Zap, LogOut, BarChart3 } from "lucide-react"
import { logout, getUser } from "@/lib/auth"
import { clsx } from "clsx"

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/query", label: "Query", icon: Search },
  { href: "/history", label: "History", icon: History },
  { href: "/saved", label: "Saved Queries", icon: BookmarkCheck },
  { href: "/live-db", label: "Live DB Mode", icon: Zap },
]

export default function Sidebar() {
  const pathname = usePathname()
  const user = getUser()

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
          <div className="mb-3">
            <p className="text-sm font-medium truncate">{user.full_name}</p>
            <p className="text-xs text-gray-500 truncate">{user.role}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-400 transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
