"use client"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import toast from "react-hot-toast"
import { Mail, Lock, BarChart2, Eye, Shield } from "lucide-react"
import { authApi } from "@/lib/api"
import { saveAuth, getAndClearRedirectUrl } from "@/lib/auth/session"
import Link from "next/link"
import { getAuthDisplayError } from "@/lib/auth/errors"
import { startSmartSqlGoogleAuth } from "@/lib/auth/google"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { SmartSQLLogo } from "@/components/brand/SmartSQLLogo"

export const dynamic = 'force-dynamic'

type RoleId = "analyst" | "viewer"

const ROLES = [
  { id: "analyst", label: "Analyst", icon: BarChart2, tagline: "Data Explorer", description: "Run queries, save insights, connect databases & visualise results", color: "#533AFD" },
  { id: "viewer",  label: "Viewer",  icon: Eye,       tagline: "Read-Only",     description: "Browse query history and explore shared data insights securely", color: "#22C55E" },
] as const

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading,      setLoading]      = useState(false)
  const [selectedRole, setSelectedRole] = useState<RoleId>("analyst")
  const [email,        setEmail]        = useState("")
  const [password,     setPassword]     = useState("")

  const handleGoogleSignIn = async () => {
    try {
      if (startSmartSqlGoogleAuth()) return
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : ""
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, queryParams: { access_type: "offline", prompt: "consent" } },
      })
      if (error) toast.error(getAuthDisplayError(error.message))
    } catch (error) {
      toast.error(getAuthDisplayError(error instanceof Error ? error.message : null))
    }
  }

  const active = ROLES.find(r => r.id === selectedRole)!
  const ActiveIcon = active.icon

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await authApi.login(email.trim(), password)
      saveAuth(res)
      const redirectUrl = searchParams.get("redirect") || getAndClearRedirectUrl() || "/dashboard"
      router.push(redirectUrl)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Login failed. Please check your credentials."
      toast.error(msg)
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <SmartSQLLogo size={32} className="text-sm" />
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">New to SmartSQL?</span>
            <Link href="/register">
              <Button variant="primary" size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h1 className="heading-md text-foreground mb-1">Sign in</h1>
            <p className="body-sm text-muted-foreground">Select your role, then sign in to continue</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            {ROLES.map(role => {
              const Icon = role.icon
              const isActive = selectedRole === role.id
              return (
                <button key={role.id} type="button" onClick={() => setSelectedRole(role.id)}
                  className="flex flex-col items-center gap-3 p-4 rounded border transition-all duration-200 text-center"
                  style={{
                    background: isActive ? `${role.color}08` : "transparent",
                    borderColor: isActive ? `${role.color}40` : "rgba(255,255,255,0.06)",
                  }}
                >
                  <div className="w-10 h-10 rounded flex items-center justify-center"
                    style={{ background: isActive ? role.color : "rgba(255,255,255,0.04)" }}>
                    <Icon size={18} color={isActive ? "#fff" : "rgba(255,255,255,0.3)"} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{role.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{role.tagline}</p>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded border text-xs mb-5"
            style={{
              background: `${active.color}06`,
              borderColor: `${active.color}15`,
              color: active.color,
            }}>
            <ActiveIcon size={14} className="mt-0.5 shrink-0" />
            <span>{active.description}</span>
          </div>

          <div className="rounded border border-white/[0.06] overflow-hidden">
            <div className="h-0.5 bg-primary" />
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground/80" htmlFor="email">Email</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                    <input id="email" type="email" required placeholder="name@company.com"
                      value={email} onChange={e => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-sm bg-white/[0.04] border border-white/[0.08] rounded text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition-all duration-150"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-foreground/80" htmlFor="password">Password</label>
                    <Link href="/forgot-password" className="text-xs text-primary">Forgot?</Link>
                  </div>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                    <input id="password" type="password" required placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                      value={password} onChange={e => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-sm bg-white/[0.04] border border-white/[0.08] rounded text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition-all duration-150"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={loading} variant="primary" className="w-full h-11">
                  {loading ? "Signing in..." : `Sign in as ${active.label}`}
                </Button>

                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/[0.06]" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-3 text-xs text-muted-foreground bg-background">Or</span>
                  </div>
                </div>

                <button type="button" onClick={handleGoogleSignIn}
                  className="w-full flex items-center justify-center gap-2.5 border border-white/[0.08] py-2.5 rounded text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all duration-150"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.832 1.24 6.926l4.026 2.839Z"/><path fill="#34A853" d="M16.04 18.013c-1.09.703-2.474 1.078-4.04 1.078a7.077 7.077 0 0 1-6.723-4.823l-4.04 2.859A11.965 11.965 0 0 0 12 24c2.933 0 5.735-1.043 7.834-3l-3.793-2.987Z"/><path fill="#4A90E2" d="M19.834 21c2.195-2.048 3.545-5.09 3.545-9 0-.706-.109-1.472-.272-2.182H12v4.364h6.109c-.82 2.263-2.719 3.545-4.909 3.545a5.5 5.5 0 0 1-1.473-.205l-3.993 2.891A6.929 6.929 0 0 0 12 21c2.265 0 4.338-.676 5.834-2.987Z"/><path fill="#FBBC05" d="M5.277 14.268A7.12 7.12 0 0 1 4.909 12c0-.782.125-1.533.357-2.235L1.24 6.926A11.922 11.922 0 0 0 0 12c0 1.92.445 3.73 1.237 5.34l4.04-3.072Z"/></svg>
                  <span>Google</span>
                </button>
              </form>
            </div>
          </div>

          <p className="mt-6 text-sm text-center text-muted-foreground">
            No account?{" "}
            <Link href="/register" className="font-medium text-primary">Create one</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
