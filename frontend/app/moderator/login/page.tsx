"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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

  // ── Mount only ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isModLoggedIn()) {
      setRedirecting(true)
      router.replace("/moderator/dashboard")
      return
    }
    const params = new URLSearchParams(window.location.search)
    if (params.get("expired") === "1") {
      setError("Your session has expired. Please sign in again.")
    }
    nameRef.current?.focus()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Lockout countdown ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!lockedUntil) return
    const tick = setInterval(() => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000)
      if (remaining <= 0) {
        clearInterval(tick)
        setLockedUntil(null)
        setLockRemaining(0)
        setAttempts(0)
        setError(null)
      } else {
        setLockRemaining(remaining)
      }
    }, 1000)
    return () => clearInterval(tick)
  }, [lockedUntil])

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil

  const handleNameChange = (v: string) => { setName(v); if (error && !isLocked) setError(null) }
  const handleCodeChange = (v: string) => { setCode(v); if (error && !isLocked) setError(null) }

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !code || isLocked || loading) return

    setLoading(true)
    setError(null)

    try {
      const res = await authApi.adminLogin(name.trim(), code)
      if (res.role !== "admin") {
        setError("Access denied — this account does not have admin privileges.")
        return
      }
      saveModAuth(res)
      setRedirecting(true)
      // Use redirect from searchParams or fallback to moderator dashboard
      const redirectUrl = searchParams.get("redirect") || getAndClearRedirectUrl() || "/moderator/dashboard"
      router.replace(redirectUrl)
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })
          ?.response?.data?.detail ?? "Invalid credentials."

      const next = attempts + 1
      setAttempts(next)
      setCode("")

      if (next >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_SECS * 1000
        setLockedUntil(until)
        setLockRemaining(LOCKOUT_SECS)
        setError(`Too many failed attempts. Try again in ${LOCKOUT_SECS} seconds.`)
      } else {
        const left = MAX_ATTEMPTS - next
        setError(`${detail} ${left} attempt${left !== 1 ? "s" : ""} remaining.`)
      }
    } finally {
      setLoading(false)
    }
  }, [name, code, isLocked, loading, attempts, router, searchParams])

  // ── Redirecting splash ────────────────────────────────────────────────────
  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "radial-gradient(circle at top left, #f3f3fe 0%, #faf8ff 100%)" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-5 h-5 rounded-full border-2 animate-spin"
            style={{ borderColor: "#003594", borderTopColor: "transparent" }} />
          <p className="text-sm" style={{ color: "#737685" }}>Redirecting to panel…</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "radial-gradient(circle at top left, #f3f3fe 0%, #faf8ff 100%)",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Decorative blobs */}
      <div className="fixed top-0 right-0 -z-10 rounded-full pointer-events-none"
        style={{ width: "60vw", height: "60vh", background: "rgba(0,53,148,0.05)", filter: "blur(120px)" }} />
      <div className="fixed bottom-0 left-0 -z-10 rounded-full pointer-events-none"
        style={{ width: "40vw", height: "40vh", background: "rgba(78,0,174,0.05)", filter: "blur(100px)" }} />

      {/* Glass card — entrance animation */}
      <main className="w-full max-w-md" style={{ animation: "fadeSlideUp 0.6s cubic-bezier(0.16,1,0.3,1) forwards" }}>
        <div className="rounded-xl shadow-xl overflow-hidden p-8"
          style={{
            background: "rgba(255,255,255,0.75)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(225,225,237,0.5)",
          }}>

          {/* Brand header */}
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
              style={{ background: "#003594", boxShadow: "0 8px 20px -4px rgba(0,53,148,0.30)" }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3"/>
                <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
                <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#191b23" }}>SmartSQL</h1>
            <p className="text-sm mt-1" style={{ color: "#737685" }}>Enterprise Database Identity</p>
          </div>

          {/* Section heading */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold" style={{ color: "#191b23" }}>Sign In</h2>
            <p className="text-sm mt-0.5" style={{ color: "#5d6476" }}>
              Enter your credentials to access the admin dashboard.
            </p>
          </div>

          {/* Inline error */}
          {error && (
            <div className="flex items-start gap-2.5 rounded-lg px-4 py-3 mb-5 text-sm"
              style={{
                background: "rgba(186,26,26,0.06)",
                border: "1px solid rgba(186,26,26,0.20)",
                color: "#ba1a1a",
              }}>
              <svg className="shrink-0 mt-0.5" width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>
                {error}
                {isLocked && lockRemaining > 0 && (
                  <span className="font-mono ml-1">({lockRemaining}s)</span>
                )}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Username / Admin Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-widest"
                style={{ color: "#434654" }}>
                Username or ID
              </label>
              <div className="relative group">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors"
                  width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="#737685" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <input
                  ref={nameRef}
                  type="text"
                  value={name}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="dba_specialist"
                  required
                  disabled={loading || isLocked}
                  autoComplete="username"
                  className="w-full pl-12 pr-4 py-3 rounded-lg text-sm outline-none transition-all disabled:opacity-50"
                  style={{
                    background: "#ffffff",
                    border: `1px solid ${error && !isLocked ? "rgba(186,26,26,0.40)" : "#c3c6d6"}`,
                    color: "#191b23",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = "#003594"
                    e.currentTarget.style.boxShadow  = "0 0 0 3px rgba(0,53,148,0.10)"
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = error && !isLocked ? "rgba(186,26,26,0.40)" : "#c3c6d6"
                    e.currentTarget.style.boxShadow   = "0 1px 2px rgba(0,0,0,0.04)"
                  }}
                />
              </div>
            </div>

            {/* Credentials / Admin Code */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#434654" }}>
                  Credentials
                </label>
                <button type="button" className="text-xs font-semibold transition-colors"
                  style={{ color: "#003594" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#004ac6")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#003594")}>
                  Forgot Password?
                </button>
              </div>
              <div className="relative group">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="#737685" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  type={showCode ? "text" : "password"}
                  value={code}
                  onChange={e => handleCodeChange(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  disabled={loading || isLocked}
                  autoComplete="current-password"
                  className="w-full pl-12 pr-12 py-3 rounded-lg text-sm outline-none transition-all disabled:opacity-50"
                  style={{
                    background: "#ffffff",
                    border: `1px solid ${error && !isLocked ? "rgba(186,26,26,0.40)" : "#c3c6d6"}`,
                    color: "#191b23",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = "#003594"
                    e.currentTarget.style.boxShadow  = "0 0 0 3px rgba(0,53,148,0.10)"
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = error && !isLocked ? "rgba(186,26,26,0.40)" : "#c3c6d6"
                    e.currentTarget.style.boxShadow   = "0 1px 2px rgba(0,0,0,0.04)"
                  }}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowCode(s => !s)}
                  disabled={loading || isLocked}
                  className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors disabled:pointer-events-none"
                  style={{ color: "#737685" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#191b23")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#737685")}
                >
                  {showCode
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            {/* Stay authenticated checkbox */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="remember"
                className="w-4 h-4 rounded cursor-pointer"
                style={{ accentColor: "#003594" }}
              />
              <label htmlFor="remember" className="text-sm cursor-pointer select-none"
                style={{ color: "#434654" }}>
                Stay authenticated for 24h
              </label>
            </div>

            {/* Attempt progress dots */}
            {attempts > 0 && !isLocked && (
              <div className="flex items-center gap-1.5">
                {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                  <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                    style={{ background: i < attempts ? "#ba1a1a" : "#c3c6d6" }} />
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 space-y-4">
              {/* Primary — Authorize Access */}
              <button
                type="submit"
                disabled={loading || isLocked || !name.trim() || !code}
                className="w-full py-3 rounded-lg text-sm font-semibold transition-all active:scale-[0.98] disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{
                  background: isLocked
                    ? "rgba(186,26,26,0.12)"
                    : "linear-gradient(to right, #003594, #1b55d0)",
                  color:   isLocked ? "#ba1a1a" : "#ffffff",
                  opacity: !loading && !isLocked && (!name.trim() || !code) ? 0.55 : 1,
                  boxShadow: isLocked ? "none" : "0 4px 14px -2px rgba(0,53,148,0.30)",
                }}
                onMouseEnter={e => {
                  if (!loading && !isLocked)
                    (e.currentTarget as HTMLButtonElement).style.filter = "brightness(1.10)"
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.filter = ""
                }}
              >
                {loading && (
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                )}
                {isLocked
                  ? `Locked — wait ${lockRemaining}s`
                  : loading
                  ? "Authenticating…"
                  : "Authorize Access"}
                {!loading && !isLocked && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                )}
              </button>

              {/* Divider */}
              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t" style={{ borderColor: "rgba(195,198,214,0.50)" }} />
                <span className="mx-4 text-[10px] font-bold uppercase tracking-[0.2em]"
                  style={{ color: "#737685" }}>
                  New deployment?
                </span>
                <div className="flex-grow border-t" style={{ borderColor: "rgba(195,198,214,0.50)" }} />
              </div>

              {/* Secondary — Request Access */}
              <button
                type="button"
                className="w-full py-3 rounded-lg text-sm font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                style={{
                  background: "rgba(225,225,237,0.40)",
                  border:     "1px solid rgba(195,198,214,0.40)",
                  color:      "#191b23",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(225,225,237,0.70)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(225,225,237,0.40)")}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                Request Access
              </button>
            </div>
          </form>

          {/* Footer */}
          <footer className="mt-8 pt-5 text-center border-t" style={{ borderColor: "rgba(195,198,214,0.30)" }}>
            <p className="text-xs" style={{ color: "#737685" }}>
              Secured by{" "}
              <span className="font-bold" style={{ color: "#434654" }}>SmartSQL IAM v2.4.0</span>
            </p>
          </footer>
        </div>
      </main>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>
    </div>
  )
}
