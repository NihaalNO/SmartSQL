"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import toast from "react-hot-toast"
import { Database, Mail, Lock, Shield, BarChart2, Eye } from "lucide-react"
import { authApi } from "@/lib/api"
import { saveAuth } from "@/lib/auth"
import Link from "next/link"

// ---------------------------------------------------------------------------
// Role definitions
// ---------------------------------------------------------------------------
type RoleId = "admin" | "analyst" | "viewer"

const ROLES: {
  id: RoleId
  label: string
  icon: React.ElementType
  tagline: string
  description: string
  accent: string
  accentBg: string
  accentBorder: string
  gradient: string
}[] = [
  {
    id: "admin",
    label: "Admin",
    icon: Shield,
    tagline: "Platform Manager",
    description: "Full access — manage users, all analytics, data sources & dashboards",
    accent: "#b91c1c",
    accentBg: "rgba(185,28,28,0.07)",
    accentBorder: "rgba(185,28,28,0.30)",
    gradient: "linear-gradient(135deg,#b91c1c 0%,#7f1d1d 100%)",
  },
  {
    id: "analyst",
    label: "Analyst",
    icon: BarChart2,
    tagline: "Data Explorer",
    description: "Run queries, save insights, connect live databases & visualise results",
    accent: "#004ac6",
    accentBg: "rgba(0,74,198,0.07)",
    accentBorder: "rgba(0,74,198,0.30)",
    gradient: "linear-gradient(135deg,#004ac6 0%,#6a1edb 100%)",
  },
  {
    id: "viewer",
    label: "Viewer",
    icon: Eye,
    tagline: "Read-Only Access",
    description: "Browse query history and explore shared data insights securely",
    accent: "#047857",
    accentBg: "rgba(4,120,87,0.07)",
    accentBorder: "rgba(4,120,87,0.30)",
    gradient: "linear-gradient(135deg,#047857 0%,#065f46 100%)",
  },
]

function getRedirectPath(_role: string) {
  return "/dashboard"
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
interface LoginForm {
  email: string
  password: string
}

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState<RoleId>("analyst")
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>()

  const active = ROLES.find(r => r.id === selectedRole)!

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    try {
      const res = await authApi.login(data.email, data.password)
      saveAuth(res)
      router.push(getRedirectPath(res.role))
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Login failed. Please check your credentials."
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col font-body-md text-on-surface"
      style={{
        background: `radial-gradient(circle at top left,rgba(37,99,235,0.05),transparent),
                     radial-gradient(circle at bottom right,rgba(124,58,237,0.05),transparent),#f9fafb`,
      }}
    >
      {/* Navbar */}
      <header
        className="sticky top-0 w-full z-50 backdrop-blur-md border-b shadow-sm"
        style={{ backgroundColor: "rgba(255,255,255,0.85)", borderColor: "rgba(229,231,235,0.15)" }}
      >
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2">
            <Database size={22} className="text-primary" />
            <span className="text-lg font-bold text-on-surface" style={{ fontFamily: "Inter,sans-serif" }}>
              SmartSQL
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">
              Sign In
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold px-4 py-2 rounded-lg transition-all duration-200 hover:scale-95"
              style={{ backgroundColor: active.accentBg, color: active.accent, border: `1px solid ${active.accentBorder}` }}
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-grow flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg flex flex-col items-center">

          {/* Brand */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-on-surface tracking-tight mb-2" style={{ fontFamily: "Inter,sans-serif" }}>
              Welcome back
            </h1>
            <p className="text-sm text-on-surface-variant">Choose your role, then sign in to continue</p>
          </div>

          {/* ── Role selector cards ─────────────────────────────────────── */}
          <div className="w-full grid grid-cols-3 gap-3 mb-6">
            {ROLES.map(role => {
              const Icon = role.icon
              const isActive = selectedRole === role.id
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRole(role.id)}
                  className="relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 text-center focus:outline-none"
                  style={{
                    backgroundColor: isActive ? role.accentBg : "#fff",
                    borderColor: isActive ? role.accent : "#e5e7eb",
                    boxShadow: isActive ? `0 0 0 3px ${role.accentBg}, 0 4px 12px ${role.accentBg}` : "none",
                    transform: isActive ? "translateY(-2px)" : "none",
                  }}
                >
                  {/* Active indicator dot */}
                  {isActive && (
                    <span
                      className="absolute top-2 right-2 w-2 h-2 rounded-full"
                      style={{ backgroundColor: role.accent }}
                    />
                  )}

                  {/* Icon container */}
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{
                      background: isActive ? role.gradient : "rgba(107,114,128,0.10)",
                    }}
                  >
                    <Icon
                      size={18}
                      style={{ color: isActive ? "#fff" : "#6b7280" }}
                    />
                  </div>

                  <div>
                    <p
                      className="text-sm font-bold leading-tight"
                      style={{ color: isActive ? role.accent : "#374151" }}
                    >
                      {role.label}
                    </p>
                    <p
                      className="text-xs leading-tight mt-0.5"
                      style={{ color: isActive ? role.accent : "#9ca3af", opacity: isActive ? 0.8 : 1 }}
                    >
                      {role.tagline}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Role description hint */}
          <div
            className="w-full mb-6 px-4 py-3 rounded-lg text-xs flex items-start gap-2 transition-all duration-300"
            style={{
              backgroundColor: active.accentBg,
              border: `1px solid ${active.accentBorder}`,
              color: active.accent,
            }}
          >
            <active.icon size={14} className="mt-0.5 flex-shrink-0" />
            <span>{active.description}</span>
          </div>

          {/* ── Login card ──────────────────────────────────────────────── */}
          <div className="w-full bg-surface border border-outline rounded-xl shadow-sm overflow-hidden">

            {/* Card accent header strip */}
            <div className="h-1.5 w-full" style={{ background: active.gradient }} />

            <div className="p-8">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-on-surface" htmlFor="email">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                    <input
                      {...register("email", { required: "Email is required" })}
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-surface border rounded-lg text-sm outline-none transition-all"
                      style={{ borderColor: "#e5e7eb" }}
                      onFocus={e => {
                        e.currentTarget.style.borderColor = active.accent
                        e.currentTarget.style.boxShadow = `0 0 0 3px ${active.accentBg}`
                      }}
                      onBlur={e => {
                        e.currentTarget.style.borderColor = "#e5e7eb"
                        e.currentTarget.style.boxShadow = ""
                      }}
                    />
                  </div>
                  {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-on-surface" htmlFor="password">
                      Password
                    </label>
                    <Link href="#" className="text-xs hover:underline underline-offset-4" style={{ color: active.accent }}>
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                    <input
                      {...register("password", { required: "Password is required" })}
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 bg-surface border rounded-lg text-sm outline-none transition-all"
                      style={{ borderColor: "#e5e7eb" }}
                      onFocus={e => {
                        e.currentTarget.style.borderColor = active.accent
                        e.currentTarget.style.boxShadow = `0 0 0 3px ${active.accentBg}`
                      }}
                      onBlur={e => {
                        e.currentTarget.style.borderColor = "#e5e7eb"
                        e.currentTarget.style.boxShadow = ""
                      }}
                    />
                  </div>
                  {errors.password && <p className="text-red-500 text-xs">{errors.password.message}</p>}
                </div>

                {/* CTA */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold text-white shadow-md transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ background: active.gradient }}
                  onMouseEnter={e => {
                    if (!loading) {
                      e.currentTarget.style.transform = "translateY(-1px)"
                      e.currentTarget.style.boxShadow = `0 8px 20px -4px ${active.accentBorder}`
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = ""
                    e.currentTarget.style.boxShadow = ""
                  }}
                >
                  {loading ? "Signing in…" : `Sign in as ${active.label}`}
                </button>

                {/* Divider */}
                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-outline" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-surface px-3 text-xs text-on-surface-variant uppercase tracking-wider">
                      Or continue with
                    </span>
                  </div>
                </div>

                {/* Google SSO */}
                <button
                  type="button"
                  onClick={() => toast("Google sign-in coming soon")}
                  className="w-full flex items-center justify-center gap-3 border border-outline bg-surface py-2.5 rounded-lg text-sm text-on-surface transition-all duration-200 hover:bg-gray-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.16H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.84l3.66-2.75z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.16l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Sign in with Google
                </button>
              </form>
            </div>
          </div>

          {/* Footer link */}
          <p className="mt-8 text-sm text-on-surface-variant">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-semibold hover:underline underline-offset-4" style={{ color: active.accent }}>
              Create an account
            </Link>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 bg-surface border-t border-outline">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="text-base font-bold text-on-surface" style={{ fontFamily: "Inter,sans-serif" }}>SmartSQL</span>
          <div className="flex flex-wrap justify-center gap-6">
            {["Privacy Policy", "Terms of Service", "Security", "Status"].map(l => (
              <Link key={l} href="#" className="text-xs text-on-secondary-container hover:text-on-surface transition-colors">
                {l}
              </Link>
            ))}
          </div>
          <p className="text-xs text-on-secondary-container opacity-60">© 2025 SmartSQL Analytics.</p>
        </div>
      </footer>
    </div>
  )
}
