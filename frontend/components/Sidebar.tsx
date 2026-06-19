"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Search, History,
  BookmarkCheck, Zap, LogOut, Shield,
  PanelLeftClose, PanelLeftOpen, Layers,
} from "lucide-react"
import { logout, getUser } from "@/lib/auth"

const ALL_NAV = [
  { href: "/dashboard",        label: "Dashboard",       icon: LayoutDashboard, roles: ["analyst", "viewer"] },
  { href: "/query",            label: "Query",            icon: Search,          roles: ["analyst", "viewer"] },
  { href: "/history",          label: "History",          icon: History,         roles: ["analyst", "viewer"] },
  { href: "/saved",            label: "Saved Queries",    icon: BookmarkCheck,   roles: ["analyst"] },
  { href: "/schema-visualizer", label: "Schema Visualizer", icon: Layers,       roles: ["analyst", "viewer"] },
  { href: "/live-db",          label: "Live DB Mode",     icon: Zap,             roles: ["analyst"] },
] as const

const ROLE_META: Record<string, { label: string; color: string }> = {
  admin:   { label: "Admin",   color: "#EF4444" },
  analyst: { label: "Analyst", color: "#3B82F6" },
  viewer:  { label: "Viewer",  color: "#22C55E" },
}

function getInitials(name: string) {
  const parts = name.trim().split(" ")
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase()
}

export default function Sidebar() {
  const [mounted,   setMounted]   = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem("sidebar-collapsed")
    if (saved === "true") setCollapsed(true)
  }, [])

  const toggle = () => {
    setCollapsed(c => {
      localStorage.setItem("sidebar-collapsed", String(!c))
      return !c
    })
  }

  const user  = mounted ? getUser() : null
  const role  = user?.role ?? ""
  const nav   = mounted
    ? ALL_NAV.filter(item => (item.roles as readonly string[]).includes(role))
    : []
  const badge = ROLE_META[role]

  const sidebarW = collapsed ? "w-[68px]" : "w-[240px]"

  return (
    <aside
      className={`${sidebarW} min-h-screen flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out
                  bg-[#050816] border-r border-white/[0.06]`}
    >
      <div className={`flex items-center pt-5 pb-4 overflow-hidden transition-all duration-300 ${collapsed ? "justify-center px-0" : "px-5"}`}>
        <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-[#14B8A6]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
          </svg>
        </div>
        {!collapsed && (
          <h1 className="ml-2.5 text-sm font-bold text-[#F8FAFC] whitespace-nowrap overflow-hidden" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            Smart<span className="text-[#14B8A6]">SQL</span>
          </h1>
        )}
      </div>

      {user && (
        <>
          <div className={`flex items-center gap-3 pb-3 overflow-hidden transition-all duration-300 ${collapsed ? "justify-center px-0" : "px-5"}`}>
            <div
              className="shrink-0 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ width: "36px", height: "36px", background: "#14B8A6" }}
              title={collapsed ? (user.full_name ?? "") : undefined}
            >
              {getInitials(user.full_name ?? "U")}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm font-medium truncate text-[#F8FAFC]">
                  {user.full_name}
                </p>
                <p className="text-xs truncate text-[#64748B]">
                  {user.email}
                </p>
              </div>
            )}
          </div>
          <div className="h-px mx-5 mb-2 bg-white/[0.06]" />
        </>
      )}

      <nav className="flex-1 space-y-0.5 px-2">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex items-center rounded-lg font-medium transition-all duration-150 overflow-hidden group relative
                ${collapsed ? "justify-center py-2.5" : "gap-3 px-3 py-2.5"}
                ${active
                  ? "bg-[#14B8A6]/10 text-[#14B8A6]"
                  : "text-[#64748B] hover:text-[#F8FAFC] hover:bg-white/[0.04]"
                }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-[#14B8A6]" />
              )}
              <Icon size={17} strokeWidth={active ? 2.5 : 1.8} className="shrink-0 transition-transform duration-150 group-hover:scale-110" />
              {!collapsed && (
                <span className="text-sm whitespace-nowrap">{label}</span>
              )}
              {active && !collapsed && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#14B8A6] animate-pulse-dot" />
              )}
            </Link>
          )
        })}
      </nav>

      <div className="px-2 pb-2">
        <button
          onClick={toggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`flex items-center w-full rounded-lg transition-all duration-150 text-sm font-medium
            ${collapsed ? "justify-center py-2.5" : "gap-3 px-3 py-2.5"}
            text-[#64748B]/50 hover:text-[#64748B] hover:bg-white/[0.04]`}
        >
          {collapsed
            ? <PanelLeftOpen  size={17} className="shrink-0" />
            : <PanelLeftClose size={17} className="shrink-0" />
          }
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>

      <div className={`pt-2 pb-4 border-t border-white/[0.06] overflow-hidden transition-all duration-300 ${collapsed ? "px-0" : "px-5"}`}>
        {badge && !collapsed && (
          <div className="mb-2">
            <span
              className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-md font-medium"
              style={{
                background: `${badge.color}15`,
                color: badge.color,
              }}
            >
              <Shield size={10} />
              {badge.label}
            </span>
          </div>
        )}
        <button
          onClick={logout}
          title={collapsed ? "Sign out" : undefined}
          className={`flex items-center w-full text-xs transition-colors
            ${collapsed ? "justify-center" : "gap-2"}
            text-[#64748B] hover:text-[#EF4444]`}
        >
          <LogOut size={14} className="shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  )
}
