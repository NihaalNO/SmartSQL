"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Search, History,
  BookmarkCheck, Zap, LogOut, Shield,
  PanelLeftClose, PanelLeftOpen,
} from "lucide-react"
import { logout, getUser } from "@/lib/auth"

// ---------------------------------------------------------------------------
// Nav config
// ---------------------------------------------------------------------------

const ALL_NAV = [
  { href: "/dashboard", label: "Dashboard",    icon: LayoutDashboard, roles: ["analyst", "viewer"] },
  { href: "/query",     label: "Query",         icon: Search,          roles: ["analyst", "viewer"] },
  { href: "/history",   label: "History",       icon: History,         roles: ["analyst", "viewer"] },
  { href: "/saved",     label: "Saved Queries", icon: BookmarkCheck,   roles: ["analyst"] },
  { href: "/live-db",   label: "Live DB Mode",  icon: Zap,             roles: ["analyst"] },
] as const

const ROLE_META: Record<string, { label: string; bg: string; color: string; border: string }> = {
  admin:   { label: "Admin",   bg: "rgba(186,26,26,0.20)", color: "#ffb4ab", border: "rgba(186,26,26,0.40)" },
  analyst: { label: "Analyst", bg: "rgba(0,74,198,0.20)",  color: "#b4c5ff", border: "rgba(0,74,198,0.40)"  },
  viewer:  { label: "Viewer",  bg: "rgba(87,94,112,0.20)", color: "#c0c6db", border: "rgba(87,94,112,0.40)" },
}

function getInitials(name: string) {
  const parts = name.trim().split(" ")
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase()
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Sidebar() {
  const [mounted,   setMounted]   = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
    // Persist collapsed state across sessions
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

  return (
    <aside
      className="min-h-screen flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out"
      style={{ width: collapsed ? "68px" : "240px", background: "#2e3039" }}
    >

      {/* ── Logo ── */}
      <div
        className="flex items-center pt-6 pb-5 overflow-hidden transition-all duration-300"
        style={{ padding: collapsed ? "24px 0 20px" : "24px 24px 20px" }}
      >
        {/* Database SVG icon — always visible */}
        <svg
          className="shrink-0"
          style={{ marginLeft: collapsed ? "auto" : "0", marginRight: collapsed ? "auto" : "8px" }}
          width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="#b4c5ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <ellipse cx="12" cy="5" rx="9" ry="3"/>
          <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
          <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>
        </svg>
        {!collapsed && (
          <h1 className="text-headline-sm font-bold whitespace-nowrap overflow-hidden" style={{ color: "#faf8ff" }}>
            SmartSQL
          </h1>
        )}
      </div>

      {/* ── User card ── */}
      {user && (
        <>
          <div
            className="flex items-center gap-3 pb-4 overflow-hidden transition-all duration-300"
            style={{ padding: collapsed ? "0 0 16px" : "0 24px 16px" }}
          >
            {/* Avatar — always visible */}
            <div
              className="shrink-0 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300"
              style={{
                width: "40px", height: "40px",
                background: "#dbe1ff", color: "#00174b",
                marginLeft: collapsed ? "auto" : "0",
                marginRight: collapsed ? "auto" : "0",
              }}
              title={collapsed ? (user.full_name ?? "") : undefined}
            >
              {getInitials(user.full_name ?? "U")}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-label-lg font-semibold truncate" style={{ color: "#faf8ff" }}>
                  {user.full_name}
                </p>
                <p className="text-label-sm truncate" style={{ color: "#c3c6d7" }}>
                  {user.email}
                </p>
              </div>
            )}
          </div>
          <div className="h-px mb-3" style={{
            marginLeft: collapsed ? "12px" : "24px",
            marginRight: collapsed ? "12px" : "24px",
            background: "rgba(195,198,215,0.15)",
          }} />
        </>
      )}

      {/* ── Navigation ── */}
      <nav className="flex-1 space-y-0.5 px-2">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className="flex items-center rounded-lg font-medium transition-all duration-150 overflow-hidden"
              style={{
                gap: collapsed ? "0" : "12px",
                padding: collapsed ? "10px 0" : "10px 16px",
                justifyContent: collapsed ? "center" : "flex-start",
                ...(active
                  ? { background: "#2563eb", color: "#eeefff" }
                  : { color: "#c0c6db" }),
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(67,70,85,0.25)" }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent" }}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 1.8} className="shrink-0" />
              {!collapsed && (
                <span className="text-label-lg whitespace-nowrap">{label}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* ── Collapse / expand toggle ── */}
      <div className="px-2 pb-2">
        <button
          onClick={toggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex items-center w-full rounded-lg transition-all duration-150 text-label-lg font-medium"
          style={{
            gap: collapsed ? "0" : "12px",
            padding: collapsed ? "10px 0" : "10px 16px",
            justifyContent: collapsed ? "center" : "flex-start",
            color: "rgba(192,198,219,0.55)",
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = "rgba(67,70,85,0.25)"
            el.style.color = "#c0c6db"
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = "transparent"
            el.style.color = "rgba(192,198,219,0.55)"
          }}
        >
          {collapsed
            ? <PanelLeftOpen  size={18} className="shrink-0" />
            : <PanelLeftClose size={18} className="shrink-0" />
          }
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>

      {/* ── Footer ── */}
      <div
        className="pt-3 pb-5 border-t overflow-hidden transition-all duration-300"
        style={{
          borderColor: "rgba(195,198,215,0.15)",
          padding: collapsed ? "12px 0 20px" : "12px 20px 20px",
        }}
      >
        {/* Role badge — hidden when collapsed */}
        {badge && !collapsed && (
          <div className="mb-3">
            <span
              className="inline-flex items-center gap-1.5 text-label-sm px-2.5 py-1 rounded-full border font-semibold"
              style={{ background: badge.bg, color: badge.color, borderColor: badge.border }}
            >
              <Shield size={10} />
              {badge.label}
            </span>
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={logout}
          title={collapsed ? "Sign out" : undefined}
          className="flex items-center transition-colors w-full text-label-sm"
          style={{
            gap: collapsed ? "0" : "8px",
            justifyContent: collapsed ? "center" : "flex-start",
            color: "#c0c6db",
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "#ffb4ab")}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "#c0c6db")}
        >
          <LogOut size={15} className="shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  )
}
