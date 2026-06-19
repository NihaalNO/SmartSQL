"use client"

import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import toast from "react-hot-toast"
import {
  BarChart2,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react"
import Link from "next/link"

import { authApi } from "@/lib/api"
import { saveAuth, getAndClearRedirectUrl } from "@/lib/auth/session"
import { getAuthDisplayError } from "@/lib/auth/errors"
import { startSmartSqlGoogleAuth } from "@/lib/auth/google"
import { supabase } from "@/lib/supabase"

type RoleId = "analyst" | "viewer"

const ROLES = [
  {
    id: "analyst",
    label: "Analyst",
    icon: BarChart2,
    tagline: "Data Explorer",
    description: "Query and visualise data at scale",
    perks: [
      "Run text-to-SQL queries",
      "Save & manage queries",
      "Connect live databases",
      "Chart & visualise results",
    ],
    color: "#14B8A6",
  },
  {
    id: "viewer",
    label: "Viewer",
    icon: Eye,
    tagline: "Read-Only Access",
    description: "Explore shared insights safely",
    perks: [
      "Browse query history",
      "View shared results",
      "Read-only data access",
      "No write permissions",
    ],
    color: "#60A5FA",
  },
] as const

interface RegisterForm {
  full_name: string
  email: string
  password: string
}

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [loading, setLoading] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [selectedRole, setSelectedRole] = useState<RoleId>("analyst")

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>()

  const active = useMemo(() => ROLES.find((r) => r.id === selectedRole)!, [selectedRole])
  const ActiveIcon = active.icon

  const handleGoogleSignUp = async () => {
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

  const onSubmit = async (data: RegisterForm) => {
    if (loading) return
    if (!agreed) { toast.error("Please agree to the Terms of Service"); return }
    setLoading(true)
    try {
      const res = await authApi.register({ ...data, role: selectedRole })
      saveAuth(res)
      const redirectUrl = searchParams.get("redirect") || getAndClearRedirectUrl() || "/dashboard"
      toast.success("Account created successfully")
      router.push(redirectUrl)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Registration failed. Please try again."
      toast.error(msg)
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#050816" }}>
      <header className="sticky top-0 z-50 border-b border-white/[0.06]" style={{ background: "rgba(5,8,22,0.92)" }}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center h-14">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md flex items-center justify-center bg-[#14B8A6]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
              </svg>
            </div>
            <span className="text-sm font-bold text-[#F8FAFC]">SmartSQL</span>
          </Link>
          <Link href="/login" className="text-sm" style={{ color: "#64748B" }}>
            Sign in
          </Link>
        </div>
      </header>

      <main className="flex-grow flex justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <h1 className="text-xl font-bold text-[#F8FAFC] mb-1.5">Create your account</h1>
            <p className="text-sm" style={{ color: "#64748B" }}>Select your role to get the right level of access</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
            {ROLES.map((role) => {
              const Icon = role.icon
              const isActive = selectedRole === role.id
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRole(role.id)}
                  className="relative p-4 rounded-lg border transition-all duration-300"
                  style={{
                    backgroundColor: isActive ? `${role.color}10` : "rgba(255,255,255,0.02)",
                    borderColor: isActive ? role.color : "rgba(148,163,184,0.1)",
                  }}
                >
                  {isActive && <CheckCircle2 className="absolute top-2.5 right-2.5" size={16} style={{ color: role.color }} />}
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2.5"
                    style={{ background: isActive ? role.color : "rgba(255,255,255,0.06)" }}>
                    <Icon size={18} color={isActive ? "#fff" : "#64748B"} />
                  </div>
                  <h3 className="text-sm font-semibold text-center" style={{ color: isActive ? role.color : "#CBD5E1" }}>
                    {role.label}
                  </h3>
                  <p className="text-xs text-center" style={{ color: "#64748B" }}>{role.tagline}</p>
                </button>
              )
            })}
          </div>

          <div className="rounded-lg border p-4 mb-5" style={{ borderColor: "rgba(148,163,184,0.1)", background: "rgba(255,255,255,0.02)" }}>
            <div className="flex items-center gap-2 mb-3">
              <ActiveIcon size={14} style={{ color: active.color }} />
              <span className="text-sm font-medium" style={{ color: active.color }}>
                {active.label} — {active.description}
              </span>
            </div>
            <ul className="grid md:grid-cols-2 gap-1.5">
              {active.perks.map((perk) => (
                <li key={perk} className="flex items-center gap-2 text-xs" style={{ color: "#CBD5E1" }}>
                  <CheckCircle2 size={12} style={{ color: active.color }} />
                  {perk}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg overflow-hidden border" style={{ borderColor: "rgba(148,163,184,0.1)" }}>
            <div className="h-1" style={{ background: active.color }} />
            <div className="p-6" style={{ background: "rgba(255,255,255,0.02)" }}>
              <button
                type="button"
                onClick={handleGoogleSignUp}
                className="w-full h-10 rounded-lg border flex items-center justify-center gap-2.5 text-sm transition-all"
                style={{ borderColor: "rgba(148,163,184,0.1)", color: "#CBD5E1" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(148,163,184,0.2)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)" }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(148,163,184,0.1)"; e.currentTarget.style.background = "transparent" }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.16H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.84l3.66-2.75z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 2.09 12 1 7.7 1 3.99 3.47 2.18 7.16l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Sign up with Google
              </button>

              <div className="my-4 text-center text-xs" style={{ color: "#64748B" }}>OR CONTINUE WITH EMAIL</div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
                <input
                  {...register("full_name", { required: "Name is required" })}
                  placeholder="Full Name"
                  className="surface-input w-full h-10 px-3 text-sm"
                  style={{ borderColor: "rgba(148,163,184,0.15)" }}
                />
                {errors.full_name && <p className="text-xs" style={{ color: "#EF4444" }}>{errors.full_name.message}</p>}

                <input
                  {...register("email", { required: "Email is required", pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter valid email" } })}
                  placeholder="Email"
                  className="surface-input w-full h-10 px-3 text-sm"
                  style={{ borderColor: "rgba(148,163,184,0.15)" }}
                />
                {errors.email && <p className="text-xs" style={{ color: "#EF4444" }}>{errors.email.message}</p>}

                <div className="relative">
                  <input
                    {...register("password", { required: "Password is required", minLength: { value: 8, message: "Minimum 8 characters" } })}
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    className="surface-input w-full h-10 px-3 pr-10 text-sm"
                    style={{ borderColor: "rgba(148,163,184,0.15)" }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#64748B" }}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="text-xs" style={{ color: "#EF4444" }}>{errors.password.message}</p>}

                <label className="flex items-center gap-2 text-sm" style={{ color: "#CBD5E1" }}>
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="accent-[#14B8A6]" />
                  I agree to Terms & Privacy Policy
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all"
                  style={{ background: active.color }}
                >
                  {loading ? "Creating..." : `Create ${active.label} Account`}
                </button>
              </form>

              <p className="mt-5 text-sm text-center" style={{ color: "#64748B" }}>
                Already have an account?{" "}
                <Link href="/login" className="font-medium" style={{ color: active.color }}>
                  Login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
