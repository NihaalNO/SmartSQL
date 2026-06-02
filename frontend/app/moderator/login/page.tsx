"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { authApi } from "@/lib/api"
import { saveModAuth, isModLoggedIn } from "@/lib/modAuth"

const MAX_ATTEMPTS = 5
const LOCKOUT_SECS = 30

export default function ModeratorLoginPage() {
  const router  = useRouter()
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

  // ── Mount only — run once, no router dependency ───────────────────────────
  useEffect(() => {
    // Redirect immediately if session is still valid
    if (isModLoggedIn()) {
      setRedirecting(true)
      router.replace("/moderator/dashboard")
      return
    }

    // Read URL params manually — avoids useSearchParams which needs Suspense
    // and causes the component to remount on every internal search-param update
    const params = new URLSearchParams(window.location.search)
    if (params.get("expired") === "1") {
      setError("Your session has expired. Please sign in again.")
    }

    nameRef.current?.focus()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])   // empty deps — intentionally runs once on mount only

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

  // ── Field change — clear non-lockout errors immediately ──────────────────
  const handleNameChange = (v: string) => {
    setName(v)
    if (error && !isLocked) setError(null)
  }
  const handleCodeChange = (v: string) => {
    setCode(v)
    if (error && !isLocked) setError(null)
  }

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

      // Success — persist session then redirect
      saveModAuth(res)
      setRedirecting(true)
      router.replace("/moderator/dashboard")

    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })
          ?.response?.data?.detail ?? "Invalid admin name or code."

      const next = attempts + 1
      setAttempts(next)
      setCode("") // clear code field on every failure

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
      // Always reset loading — even if setRedirecting(true) was called,
      // `redirecting` hides the form so the loading state is invisible anyway
      setLoading(false)
    }
  }, [name, code, isLocked, loading, attempts, router])

  // ── Redirecting splash ────────────────────────────────────────────────────
  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0f1117" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          <p className="text-sm" style={{ color: "#64748b" }}>Redirecting to panel…</p>
        </div>
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  const borderColor = (withError: boolean) =>
    withError ? "rgba(239,68,68,0.60)" : "rgba(255,255,255,0.08)"

  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    background: "#0f1117",
    border:     `1px solid ${borderColor(hasError)}`,
    color:      "#f1f5f9",
  })

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#0f1117" }}>
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: "rgba(0,74,198,0.15)", border: "1px solid rgba(0,74,198,0.30)" }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke="#b4c5ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold" style={{ color: "#f8fafc" }}>Admin Access</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>SmartSQL Moderator Panel</p>
        </div>

        {/* Persistent inline error */}
        {error && (
          <div
            className="flex items-start gap-2.5 rounded-xl px-4 py-3 mb-5 text-sm"
            style={{
              background: "rgba(239,68,68,0.10)",
              border:     "1px solid rgba(239,68,68,0.25)",
              color:      "#fca5a5",
            }}
          >
            <svg className="shrink-0 mt-0.5" width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8"  x2="12"    y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>
              {error}
              {isLocked && lockRemaining > 0 && (
                <span className="font-mono ml-1" style={{ color: "#f87171" }}>
                  ({lockRemaining}s)
                </span>
              )}
            </span>
          </div>
        )}

        {/* Form card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl p-8 space-y-5"
          style={{ background: "#1a1d27", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          {/* Admin name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#94a3b8" }}>
              Admin Name
            </label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <input
                ref={nameRef}
                type="text"
                value={name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="Enter admin name"
                required
                disabled={loading || isLocked}
                autoComplete="username"
                className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none transition-all disabled:opacity-50"
                style={inputStyle(!!error && !isLocked)}
                onFocus={e => (e.currentTarget.style.borderColor = "rgba(0,74,198,0.60)")}
                onBlur={e  => (e.currentTarget.style.borderColor  = borderColor(!!error && !isLocked))}
              />
            </div>
          </div>

          {/* Admin code */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#94a3b8" }}>
              Admin Code
            </label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                className="w-full pl-9 pr-10 py-2.5 rounded-lg text-sm outline-none transition-all disabled:opacity-50"
                style={inputStyle(!!error && !isLocked)}
                onFocus={e => (e.currentTarget.style.borderColor = "rgba(0,74,198,0.60)")}
                onBlur={e  => (e.currentTarget.style.borderColor  = borderColor(!!error && !isLocked))}
              />
              <button
                type="button"
                onClick={() => setShowCode(s => !s)}
                disabled={loading || isLocked}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-80 transition-opacity disabled:pointer-events-none"
              >
                {showCode
                  ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                }
              </button>
            </div>
          </div>

          {/* Attempt progress dots */}
          {attempts > 0 && !isLocked && (
            <div className="flex items-center gap-1.5">
              {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                <div
                  key={i}
                  className="h-1 flex-1 rounded-full transition-all duration-300"
                  style={{ background: i < attempts ? "#ef4444" : "rgba(255,255,255,0.08)" }}
                />
              ))}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || isLocked || !name.trim() || !code}
            className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all active:scale-95 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{
              background: isLocked ? "rgba(239,68,68,0.20)" : "#004ac6",
              color:      isLocked ? "#f87171"              : "#fff",
              opacity:    !loading && !isLocked && (!name.trim() || !code) ? 0.55 : 1,
            }}
            onMouseEnter={e => { if (!loading && !isLocked) e.currentTarget.style.background = "#0052e0" }}
            onMouseLeave={e => { if (!isLocked) e.currentTarget.style.background = "#004ac6" }}
          >
            {loading && (
              <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            )}
            {isLocked
              ? `Locked — wait ${lockRemaining}s`
              : loading
              ? "Authenticating…"
              : "Access Panel"
            }
          </button>
        </form>

        <p className="text-center text-xs mt-6" style={{ color: "#1e293b" }}>
          Restricted access — authorised personnel only
        </p>
      </div>
    </div>
  )
}
