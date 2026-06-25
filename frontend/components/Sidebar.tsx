"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Search,
  History,
  BookmarkCheck,
  Zap,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Menu,
  X,
  LogOut,
} from "lucide-react"
import { getUser, logout } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { SmartSQLLogo } from "@/components/brand/SmartSQLLogo"

const ALL_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/query", label: "Query", icon: Search },
  { href: "/history", label: "History", icon: History },
  { href: "/saved", label: "Saved Queries", icon: BookmarkCheck },
  { href: "/live-db", label: "Live DB Mode", icon: Zap },
  { href: "/settings", label: "Settings", icon: Settings },
] as const

function getInitials(name: string) {
  const parts = name.trim().split(" ")
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase()
}

export default function Sidebar() {
  const [mounted, setMounted] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem("sidebar-collapsed")
    if (saved === "true") setCollapsed(true)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const toggle = () => {
    setCollapsed((current) => {
      localStorage.setItem("sidebar-collapsed", String(!current))
      return !current
    })
  }

  const user = mounted ? getUser() : null
  const expanded = !collapsed || mobileOpen

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-3 z-40 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-secondary md:hidden"
        aria-label="Open navigation"
      >
        <Menu size={18} />
      </button>

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/20 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <aside
        className={cn(
          "z-50 flex flex-col items-stretch overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 ease-in-out",
          "fixed left-3 top-3 max-h-[calc(100dvh-24px)] w-[min(280px,calc(100vw-24px))] shadow-xl md:sticky md:left-auto md:top-3 md:shrink-0 md:self-start md:shadow-none",
          collapsed ? "md:w-16" : "md:w-[272px]",
          mobileOpen ? "translate-x-0" : "-translate-x-[calc(100%+24px)] md:translate-x-0"
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-3",
            collapsed ? "md:justify-center md:px-2" : "justify-between"
          )}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <SmartSQLLogo variant="icon" size={30} className="shrink-0" />
            {expanded && <SmartSQLLogo variant="wordmark" className="text-sm" />}
          </div>

          <button
            type="button"
            onClick={toggle}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "hidden h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:inline-flex",
              collapsed && "md:absolute md:right-2 md:top-3"
            )}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:hidden"
            aria-label="Close navigation"
          >
            <X size={16} />
          </button>
        </div>

        {user && (
          <>
            <div
              className={cn(
                "flex items-center gap-3 px-3 pb-3 pt-1",
                collapsed && "md:justify-center md:px-2"
              )}
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt=""
                  className="h-8 w-8 shrink-0 rounded-full object-cover"
                  title={!expanded ? user.full_name : undefined}
                />
              ) : (
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
                  title={!expanded ? (user.full_name ?? "") : undefined}
                >
                  {getInitials(user.full_name ?? "U")}
                </div>
              )}
              {expanded && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground/90">{user.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
              )}
              {expanded && (
                <button
                  type="button"
                  onClick={logout}
                  title="Sign out"
                  className="ml-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
                >
                  <LogOut size={14} />
                </button>
              )}
            </div>
            <div className="mx-3 h-px bg-border" />
          </>
        )}

        <nav className="h-auto space-y-1 px-2 py-3">
          {ALL_NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                title={!expanded ? label : undefined}
                className={cn(
                  "relative flex min-h-10 items-center rounded-md transition-colors duration-150",
                  collapsed ? "justify-center px-2" : "gap-2.5 px-3",
                  active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                {active && <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent" />}
                <Icon size={16} strokeWidth={active ? 2.5 : 1.8} className="shrink-0" />
                {expanded && <span className="truncate text-sm">{label}</span>}
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
