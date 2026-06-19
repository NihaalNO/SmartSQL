"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Lock, User, Eye, EyeOff, ArrowRight, Database, HelpCircle, Shield } from "lucide-react"
import { authApi } from "@/lib/api"
import { saveModAuth, isModLoggedIn } from "@/lib/modAuth"
import { getAndClearRedirectUrl } from "@/lib/auth/session"

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
      if (res.role !== "admin") { setError("Access denied — this account does not have admin privileges."); return }
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#050816" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(20,184,166,0.3)", borderTopColor: "#14B8A6" }} />
          <p className="text-sm" style={{ color: "#64748B" }}>Redirecting to panel…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#050816" }}>
      <main className="w-full max-w-md animate-fade-in-up">
        <div className="rounded-xl overflow-hidden" style={{ background: "rgba(17,24,39,0.95)", border: "1px solid rgba(148,163,184,0.08)" }}>
          <div className="p-8">
            <div className="flex flex-col items-center mb-8 text-center">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={{ background: "rgba(20,184,166,0.1)" }}>
                <Database size={26} style={{ color: "#14B8A6" }} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#F8FAFC", fontFamily: "'Fira Code', 'JetBrains Mono', monospace" }}>SmartSQL</h1>
              <p className="text-sm mt-1" style={{ color: "#64748B" }}>Enterprise Database Identity</p>
            </div>

            <div className="mb-6">
              <h2 className="text-lg font-semibold" style={{ color: "#F8FAFC" }}>Sign In</h2>
              <p className="text-sm mt-0.5" style={{ color: "#64748B" }}>Enter your credentials to access the admin dashboard.</p>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded-lg px-4 py-3 mb-5 text-sm" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}>
                <Shield size={15} className="shrink-0 mt-0.5" />
                <span>
                  {error}
                  {isLocked && lockRemaining > 0 && <span className="font-mono ml-1">({lockRemaining}s)</span>}
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-widest" style={{ color: "#64748B" }}>Username or ID</label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#64748B" }} />
                  <input
                    ref={nameRef}
                    type="text"
                    value={name}
                    onChange={e => handleNameChange(e.target.value)}
                    placeholder="dba_specialist"
                    required
                    disabled={loading || isLocked}
                    autoComplete="username"
                    className="surface-input w-full pl-12 pr-4 py-3 disabled:opacity-50"
                    style={{ borderColor: error && !isLocked ? "rgba(239,68,68,0.4)" : undefined }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#64748B" }}>Credentials</label>
                  <button type="button" className="text-xs font-semibold transition-colors" style={{ color: "#14B8A6" }}>
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#64748B" }} />
                  <input
                    type={showCode ? "text" : "password"}
                    value={code}
                    onChange={e => handleCodeChange(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    disabled={loading || isLocked}
                    autoComplete="current-password"
                    className="surface-input w-full pl-12 pr-12 py-3 disabled:opacity-50"
                    style={{ borderColor: error && !isLocked ? "rgba(239,68,68,0.4)" : undefined }}
                  />
                  <button type="button" tabIndex={-1} onClick={() => setShowCode(s => !s)} disabled={loading || isLocked} className="absolute right-4 top-1/2 -translate-y-1/2 disabled:pointer-events-none" style={{ color: "#64748B" }}>
                    {showCode ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input type="checkbox" id="remember" className="w-4 h-4 rounded accent-[#14B8A6]" />
                <label htmlFor="remember" className="text-sm cursor-pointer select-none" style={{ color: "#64748B" }}>Stay authenticated for 24h</label>
              </div>

              {attempts > 0 && !isLocked && (
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                    <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300" style={{ background: i < attempts ? "#EF4444" : "rgba(255,255,255,0.08)" }} />
                  ))}
                </div>
              )}

              <div className="pt-2 space-y-4">
                <button
                  type="submit"
                  disabled={loading || isLocked || !name.trim() || !code}
                  className="w-full py-3 rounded-lg text-sm font-semibold transition-all active:scale-[0.98] disabled:cursor-not-allowed flex items-center justify-center gap-2 text-white disabled:opacity-55"
                  style={{ background: "#14B8A6" }}
                >
                  {loading && <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
                  {isLocked ? `Locked — wait ${lockRemaining}s` : loading ? "Authenticating…" : "Authorize Access"}
                  {!loading && !isLocked && <ArrowRight size={16} />}
                </button>

                <div className="relative flex items-center py-1">
                  <div className="flex-grow border-t" style={{ borderColor: "rgba(148,163,184,0.1)" }} />
                  <span className="mx-4 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "#64748B" }}>New deployment?</span>
                  <div className="flex-grow border-t" style={{ borderColor: "rgba(148,163,184,0.1)" }} />
                </div>

                <button type="button"
                  className="w-full py-3 rounded-lg text-sm font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  style={{ color: "#F8FAFC", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(148,163,184,0.1)" }}>
                  <HelpCircle size={16} />
                  Request Access
                </button>
              </div>
            </form>
          </div>

          <div style={{ borderTop: "1px solid rgba(148,163,184,0.08)" }}>
            <footer className="px-8 py-4 text-center">
              <p className="text-xs" style={{ color: "#64748B" }}>
                Secured by <span className="font-bold" style={{ color: "#F8FAFC" }}>SmartSQL IAM v2.4.0</span>
              </p>
            </footer>
          </div>
        </div>
      </main>
    </div>
  )
}
