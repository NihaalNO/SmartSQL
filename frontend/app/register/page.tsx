"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import toast from "react-hot-toast"
import { Database, User, Mail, Lock, Shield, BarChart2, Eye, CheckCircle2 } from "lucide-react"
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
  perks: string[]
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
    description: "Complete control over the platform",
    perks: ["Manage all users & roles", "Access full analytics dashboard", "Configure data sources", "All analyst capabilities"],
    accent: "#b91c1c",
    accentBg: "rgba(185,28,28,0.07)",
    accentBorder: "rgba(185,28,28,0.28)",
    gradient: "linear-gradient(135deg,#b91c1c 0%,#7f1d1d 100%)",
  },
  {
    id: "analyst",
    label: "Analyst",
    icon: BarChart2,
    tagline: "Data Explorer",
    description: "Query and visualise data at scale",
    perks: ["Run text-to-SQL queries", "Save & manage queries", "Connect live databases", "Chart & visualise results"],
    accent: "#004ac6",
    accentBg: "rgba(0,74,198,0.07)",
    accentBorder: "rgba(0,74,198,0.28)",
    gradient: "linear-gradient(135deg,#004ac6 0%,#6a1edb 100%)",
  },
  {
    id: "viewer",
    label: "Viewer",
    icon: Eye,
    tagline: "Read-Only Access",
    description: "Explore shared insights safely",
    perks: ["Browse query history", "View shared results", "Read-only data access", "No write permissions"],
    accent: "#047857",
    accentBg: "rgba(4,120,87,0.07)",
    accentBorder: "rgba(4,120,87,0.28)",
    gradient: "linear-gradient(135deg,#047857 0%,#065f46 100%)",
  },
]

function getRedirectPath(_role: string) {
  return "/dashboard"
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
interface RegisterForm {
  full_name: string
  email: string
  password: string
}

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [selectedRole, setSelectedRole] = useState<RoleId>("analyst")
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>()

  const active = ROLES.find(r => r.id === selectedRole)!

  const onSubmit = async (data: RegisterForm) => {
    if (!agreed) { toast.error("Please agree to the Terms of Service"); return }
    setLoading(true)
    try {
      const res = await authApi.register({ ...data, role: selectedRole })
      saveAuth(res)
      router.push(getRedirectPath(res.role))
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Registration failed. Please try again."
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col font-body-md text-on-surface"
      style={{ backgroundColor: "#f9fafb" }}
    >
      {/* Background blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div
          className="absolute top-[8%] left-[4%] w-96 h-96 rounded-full"
          style={{ backgroundColor: `${active.accentBg}`, filter: "blur(100px)", transition: "background-color 0.4s" }}
        />
        <div
          className="absolute bottom-[8%] right-[4%] w-80 h-80 rounded-full"
          style={{ backgroundColor: `${active.accentBg}`, filter: "blur(80px)", transition: "background-color 0.4s" }}
        />
      </div>

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
          <div className="hidden md:flex gap-6">
            <Link href="/#features" className="text-sm text-on-surface-variant hover:text-primary transition-colors">Features</Link>
            <Link href="/#how-it-works" className="text-sm text-on-surface-variant hover:text-primary transition-colors">How it Works</Link>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-grow flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-2xl">

          {/* Heading */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-on-surface tracking-tight mb-2" style={{ fontFamily: "Inter,sans-serif" }}>
              Create your account
            </h1>
            <p className="text-sm text-on-surface-variant">Select your role to get the right level of access</p>
          </div>

          {/* ── Role selector cards ─────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {ROLES.map(role => {
              const Icon = role.icon
              const isActive = selectedRole === role.id
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRole(role.id)}
                  className="relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 text-center transition-all duration-250 focus:outline-none"
                  style={{
                    backgroundColor: isActive ? role.accentBg : "#fff",
                    borderColor: isActive ? role.accent : "#e5e7eb",
                    boxShadow: isActive ? `0 0 0 3px ${role.accentBg}, 0 6px 16px ${role.accentBg}` : "none",
                    transform: isActive ? "translateY(-3px)" : "none",
                  }}
                >
                  {/* Selected checkmark */}
                  {isActive && (
                    <span className="absolute top-2.5 right-2.5">
                      <CheckCircle2 size={16} style={{ color: role.accent }} />
                    </span>
                  )}

                  {/* Icon */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: isActive ? role.gradient : "rgba(107,114,128,0.10)",
                      transition: "background 0.3s",
                    }}
                  >
                    <Icon size={22} style={{ color: isActive ? "#fff" : "#6b7280" }} />
                  </div>

                  {/* Labels */}
                  <div>
                    <p
                      className="text-sm font-bold leading-tight"
                      style={{ color: isActive ? role.accent : "#374151", transition: "color 0.2s" }}
                    >
                      {role.label}
                    </p>
                    <p
                      className="text-xs mt-0.5 leading-tight"
                      style={{ color: isActive ? role.accent : "#9ca3af", opacity: isActive ? 0.85 : 1 }}
                    >
                      {role.tagline}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* ── Role perks panel ────────────────────────────────────────── */}
          <div
            className="w-full mb-6 px-5 py-4 rounded-xl border transition-all duration-300"
            style={{ backgroundColor: active.accentBg, borderColor: active.accentBorder }}
          >
            <div className="flex items-center gap-2 mb-3">
              <active.icon size={15} style={{ color: active.accent }} />
              <p className="text-sm font-semibold" style={{ color: active.accent }}>
                {active.label} — {active.description}
              </p>
            </div>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5">
              {active.perks.map(perk => (
                <li key={perk} className="flex items-center gap-1.5 text-xs" style={{ color: active.accent }}>
                  <CheckCircle2 size={12} className="flex-shrink-0" />
                  {perk}
                </li>
              ))}
            </ul>
          </div>

          {/* ── Registration card ───────────────────────────────────────── */}
          <div className="w-full bg-surface border border-outline rounded-xl shadow-sm overflow-hidden">

            {/* Accent header strip */}
            <div className="h-1.5 w-full transition-all duration-300" style={{ background: active.gradient }} />

            <div className="p-8">

              {/* Google SSO */}
              <button
                type="button"
                onClick={() => toast("Google sign-up coming soon")}
                className="w-full flex items-center justify-center gap-3 h-11 bg-surface border border-outline rounded-lg text-sm text-on-surface transition-all duration-200 hover:bg-gray-50 mb-5"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 6.34l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Sign up with Google
              </button>

              {/* Divider */}
              <div className="relative flex items-center mb-5">
                <div className="flex-grow border-t border-outline" />
                <span className="flex-shrink mx-3 text-xs text-on-surface-variant">OR CONTINUE WITH EMAIL</span>
                <div className="flex-grow border-t border-outline" />
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-on-surface-variant">Full Name</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                    <input
                      {...register("full_name", { required: "Name is required" })}
                      placeholder="John Doe"
                      className="w-full pl-10 h-11 bg-white border rounded-lg text-sm outline-none transition-all"
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
                  {errors.full_name && <p className="text-red-500 text-xs">{errors.full_name.message}</p>}
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-on-surface-variant">Business Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                    <input
                      {...register("email", { required: "Email is required" })}
                      type="email"
                      placeholder="john@company.com"
                      className="w-full pl-10 h-11 bg-white border rounded-lg text-sm outline-none transition-all"
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
                  <label className="text-sm font-medium text-on-surface-variant">Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                    <input
                      {...register("password", {
                        required: "Password is required",
                        minLength: { value: 8, message: "Minimum 8 characters" },
                      })}
                      type="password"
                      placeholder="••••••••"
                      className="w-full pl-10 h-11 bg-white border rounded-lg text-sm outline-none transition-all"
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

                {/* Terms */}
                <div className="flex items-start gap-3 pt-1">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={e => setAgreed(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded flex-shrink-0"
                    style={{ accentColor: active.accent }}
                  />
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    I agree to the{" "}
                    <Link href="#" className="hover:underline" style={{ color: active.accent }}>Terms of Service</Link>
                    {" "}and{" "}
                    <Link href="#" className="hover:underline" style={{ color: active.accent }}>Privacy Policy</Link>.
                  </p>
                </div>

                {/* CTA */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl text-sm font-semibold text-white shadow-md transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
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
                  {loading ? "Creating account…" : `Create ${active.label} Account`}
                </button>
              </form>

              {/* Redirect */}
              <div className="mt-5 pt-5 text-center border-t border-outline">
                <p className="text-sm text-on-surface-variant">
                  Already have an account?{" "}
                  <Link href="/login" className="font-semibold hover:underline" style={{ color: active.accent }}>
                    Log in
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 bg-surface border-t border-outline mt-6">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 opacity-60 grayscale">
            <Database size={16} />
            <span className="text-base font-bold" style={{ fontFamily: "Inter,sans-serif" }}>SmartSQL</span>
          </div>
          <div className="flex gap-6">
            {["Privacy Policy", "Terms of Service", "Contact Sales"].map(l => (
              <Link key={l} href="#" className="text-xs text-on-secondary-container hover:text-on-surface transition-colors">{l}</Link>
            ))}
          </div>
          <p className="text-xs text-on-secondary-fixed-variant opacity-60">© 2025 SmartSQL Analytics.</p>
        </div>
      </footer>
    </div>
  )
}
