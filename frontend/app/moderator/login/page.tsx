"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Lock, User, Eye, EyeOff, ArrowRight, Shield } from "lucide-react"
import { authApi } from "@/lib/api"
import { saveModAuth, isModLoggedIn } from "@/lib/modAuth"
import { getAndClearRedirectUrl } from "@/lib/auth/session"
import { Button } from "@/components/ui/button"
import { SmartSQLLogo } from "@/components/brand/SmartSQLLogo"

export const dynamic = 'force-dynamic'

const MAX_ATTEMPTS = 5
const LOCKOUT_SECS = 30

export default function ModeratorLoginPage() {
  const router  = useRouter()
  const searchParams = useSearchParams()
  const nameRef = useRef<HTMLInputElement>(null)

  const [name,     setName]     = useState("")
  const [code,     setCode]     = useState("")
  const [showCode, setShowCode] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [redirecting, setRedirecting] = useState(false)

  const [attempts,      setAttempts]      = useState(0)
  const [lockedUntil,   setLockedUntil]   = useState<number | null>(null)
  const [lockRemaining, setLockRemaining] = useState(0)

  useEffect(() => {
    if (isModLoggedIn()) { setRedirecting(true); router.replace("/moderator/dashboard"); return }
    const params = new URLSearchParams(window.location.search)
    if (params.get("expired") === "1") setError("Your session has expired. Please sign in again.")
    nameRef.current?.focus()
  }, [router])

  useEffect(() => {
    if (!lockedUntil) return
    const tick = setInterval(() => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000)
      if (remaining <= 0) {
        clearInterval(tick); setLockedUntil(null); setLockRemaining(0); setAttempts(0); setError(null)
      } else { setLockRemaining(remaining) }
    }, 1000)
    return () => clearInterval(tick)
  }, [lockedUntil])

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil

  const handleNameChange = (v: string) => { setName(v); if (error && !isLocked) setError(null) }
  const handleCodeChange = (v: string) => { setCode(v); if (error && !isLocked) setError(null) }

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !code || isLocked || loading) return
    setLoading(true); setError(null)
    try {
      const res = await authApi.adminLogin(name.trim(), code)
      if (res.role !== "admin") { setError("Access denied \u2014 this account does not have admin privileges."); return }
      saveModAuth(res); setRedirecting(true)
      const redirectUrl = searchParams.get("redirect") || getAndClearRedirectUrl() || "/moderator/dashboard"
      router.replace(redirectUrl)
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Invalid credentials."
      const next = attempts + 1; setAttempts(next); setCode("")
      if (next >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_SECS * 1000; setLockedUntil(until); setLockRemaining(LOCKOUT_SECS)
        setError(`Too many failed attempts. Try again in ${LOCKOUT_SECS} seconds.`)
      } else { const left = MAX_ATTEMPTS - next; setError(`${detail} ${left} attempt${left !== 1 ? "s" : ""} remaining.`) }
    } finally { setLoading(false) }
  }, [name, code, isLocked, loading, attempts, router, searchParams])

  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <SmartSQLLogo variant="icon" size={32} className="animate-pulse" />
          <p className="text-sm text-muted-foreground">Redirecting to panel\u2026</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <main className="w-full max-w-md animate-fade-in-up">
        <div className="rounded border border-white/[0.06] overflow-hidden bg-card">
          <div className="p-8">
            <div className="flex flex-col items-center mb-8 text-center">
              <SmartSQLLogo size={44} className="mb-4 text-lg" />
              <p className="body-sm text-muted-foreground mt-1">Admin Panel</p>
            </div>

            <div className="mb-6">
              <h2 className="text-sm font-medium text-foreground">Sign In</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Enter your credentials to access the admin dashboard.</p>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded px-4 py-3 mb-5 text-sm"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}>
                <Shield size={15} className="shrink-0 mt-0.5" />
                <span>
                  {error}
                  {isLocked && lockRemaining > 0 && <span className="font-mono ml-1">({lockRemaining}s)</span>}
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="label-sm text-muted-foreground">Username or ID</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                  <input
                    ref={nameRef}
                    type="text"
                    value={name}
                    onChange={e => handleNameChange(e.target.value)}
                    placeholder="admin"
                    required
                    disabled={loading || isLocked}
                    autoComplete="username"
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-white/[0.04] border border-white/[0.08] rounded text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 disabled:opacity-50 transition-all duration-150"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="label-sm text-muted-foreground">Access Code</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                  <input
                    type={showCode ? "text" : "password"}
                    value={code}
                    onChange={e => handleCodeChange(e.target.value)}
                    placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                    required
                    disabled={loading || isLocked}
                    autoComplete="current-password"
                    className="w-full pl-9 pr-10 py-2.5 text-sm bg-white/[0.04] border border-white/[0.08] rounded text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 disabled:opacity-50 transition-all duration-150"
                  />
                  <button type="button" tabIndex={-1} onClick={() => setShowCode(s => !s)} disabled={loading || isLocked} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showCode ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {attempts > 0 && !isLocked && (
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                    <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                      style={{ background: i < attempts ? "#EF4444" : "rgba(255,255,255,0.08)" }} />
                  ))}
                </div>
              )}

              <div className="pt-2">
                <Button type="submit" disabled={loading || isLocked || !name.trim() || !code} variant="primary" className="w-full h-11">
                  {loading ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Authenticating\u2026</>
                    : isLocked ? `Locked \u2014 wait ${lockRemaining}s`
                      : <><ArrowRight size={16} /> Authorize Access</>}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
