"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Search, History,
  BookmarkCheck, Zap, LogOut,
  PanelLeftClose, PanelLeftOpen,
  Settings,
} from "lucide-react"
import { logout, getUser } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { SmartSQLLogo } from "@/components/brand/SmartSQLLogo"

const ALL_NAV = [
  { href: "/dashboard", label: "Dashboard",    icon: LayoutDashboard, roles: ["analyst", "viewer"] },
  { href: "/query",     label: "Query",         icon: Search,          roles: ["analyst", "viewer"] },
  { href: "/history",   label: "History",       icon: History,         roles: ["analyst", "viewer"] },
  { href: "/saved",     label: "Saved Queries", icon: BookmarkCheck,   roles: ["analyst"] },
  { href: "/live-db",   label: "Live DB Mode",  icon: Zap,             roles: ["analyst"] },
  { href: "/settings",  label: "Settings",      icon: Settings,        roles: ["analyst", "viewer"] },
] as const

const ROLE_META: Record<string, { label: string; color: string }> = {
  admin:   { label: "Admin",   color: "var(--mint-error)" },
  analyst: { label: "Analyst", color: "var(--mint-tag)" },
  viewer:  { label: "Viewer",  color: "var(--mint-green-deep)" },
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

  return (
    <aside
      className={cn(
        "min-h-screen flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out",
        "border-r border-border bg-card",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className={cn(
        "flex items-center pt-5 pb-4 overflow-hidden transition-all duration-300",
        collapsed ? "justify-center px-0" : "px-4"
      )}>
        <SmartSQLLogo variant="icon" size={32} className="shrink-0" />
        {!collapsed && (
          <SmartSQLLogo variant="wordmark" className="ml-2.5 text-sm" />
        )}
      </div>

      {user && (
        <>
          <div className={cn(
            "flex items-center gap-3 pb-3 overflow-hidden transition-all duration-300",
            collapsed ? "justify-center px-0" : "px-4"
          )}>
            <div
              className="shrink-0 rounded-full flex items-center justify-center text-xs font-semibold text-primary-foreground bg-primary"
              style={{ width: "32px", height: "32px" }}
              title={collapsed ? (user.full_name ?? "") : undefined}
            >
              {getInitials(user.full_name ?? "U")}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm font-medium truncate text-foreground/90">
                  {user.full_name}
                </p>
                <p className="text-xs truncate text-muted-foreground">
                  {user.email}
                </p>
              </div>
            )}
          </div>
          <div className="h-px mx-4 mb-2 bg-border" />
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
              className={cn(
                "flex items-center rounded-md transition-colors duration-150 overflow-hidden group relative",
                collapsed ? "justify-center py-2.5" : "gap-2.5 px-3 py-2",
                active
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-accent" />
              )}
              <Icon size={16} strokeWidth={active ? 2.5 : 1.8} className="shrink-0" />
              {!collapsed && (
                <span className="text-sm whitespace-nowrap">{label}</span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="px-2 pb-2">
        <button
          onClick={toggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex items-center w-full rounded-md transition-colors duration-150 text-sm",
            collapsed ? "justify-center py-2.5" : "gap-2.5 px-3 py-2",
            "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          {collapsed
            ? <PanelLeftOpen  size={16} className="shrink-0" />
            : <PanelLeftClose size={16} className="shrink-0" />
          }
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>

      <div className={cn(
        "pt-2 pb-4 border-t border-border overflow-hidden transition-all duration-300",
        collapsed ? "px-0" : "px-4"
      )}>
        {badge && !collapsed && (
          <div className="mb-2">
            <span
              className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border border-border bg-secondary font-medium"
              style={{ color: badge.color }}
            >
              {badge.label}
            </span>
          </div>
        )}
        <button
          onClick={logout}
          title={collapsed ? "Sign out" : undefined}
          className={cn(
            "flex items-center w-full text-xs transition-colors",
            collapsed ? "justify-center" : "gap-2",
            "text-muted-foreground hover:text-destructive"
          )}
        >
          <LogOut size={14} className="shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  )
}
