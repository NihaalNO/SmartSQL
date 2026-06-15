"use client"

import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import toast from "react-hot-toast"
import {
  Database,
  User,
  Mail,
  Lock,
  BarChart2,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react"
import Link from "next/link"

import { authApi } from "@/lib/api"
import { saveAuth, getAndClearRedirectUrl } from "@/lib/auth/session"
import { supabase } from "@/lib/supabase"

// -----------------------------------------------------------------------------
// Role Definitions
// -----------------------------------------------------------------------------

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
    perks: [
      "Browse query history",
      "View shared results",
      "Read-only data access",
      "No write permissions",
    ],
    accent: "#047857",
    accentBg: "rgba(4,120,87,0.07)",
    accentBorder: "rgba(4,120,87,0.28)",
    gradient: "linear-gradient(135deg,#047857 0%,#065f46 100%)",
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
  const [selectedRole, setSelectedRole] =
    useState<RoleId>("analyst")

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>()

  const active = useMemo(
    () => ROLES.find((r) => r.id === selectedRole)!,
    [selectedRole]
  )

  const ActiveIcon = active.icon

  // ---------------------------------------------------------------------------
  // Google Auth
  // ---------------------------------------------------------------------------

  const handleGoogleSignUp = async () => {
    try {
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback`
          : ""

      const { error } =
        await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo,
            queryParams: {
              access_type: "offline",
              prompt: "consent",
            },
          },
        })

      if (error) {
        toast.error(error.message)
      }
    } catch {
      toast.error("Google sign in failed")
    }
  }

  // ---------------------------------------------------------------------------
  // Form Submit
  // ---------------------------------------------------------------------------

  const onSubmit = async (data: RegisterForm) => {
    if (loading) return

    if (!agreed) {
      toast.error(
        "Please agree to the Terms of Service"
      )
      return
    }

    setLoading(true)

    try {
      const res = await authApi.register({
        ...data,
        role: selectedRole,
      })

      saveAuth(res)

      const redirectUrl =
        searchParams.get("redirect") ||
        getAndClearRedirectUrl() ||
        "/dashboard"

      toast.success("Account created successfully")

      router.push(redirectUrl)
    } catch (err: unknown) {
      const msg =
        (
          err as {
            response?: {
              data?: { detail?: string }
            }
          }
        )?.response?.data?.detail ||
        "Registration failed. Please try again."

      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#f9fafb" }}
    >
      {/* Background blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div
          className="absolute top-[8%] left-[4%] w-96 h-96 rounded-full blur-[100px]"
          style={{
            backgroundColor: active.accentBg,
          }}
        />
        <div
          className="absolute bottom-[8%] right-[4%] w-80 h-80 rounded-full blur-[80px]"
          style={{
            backgroundColor: active.accentBg,
          }}
        />
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b backdrop-blur-md bg-white/85 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center h-16">
          <Link
            href="/"
            className="flex items-center gap-2"
          >
            <Database size={22} />
            <span className="text-lg font-bold">
              SmartSQL
            </span>
          </Link>

          <div className="hidden md:flex gap-6">
            <Link href="/#features">
              Features
            </Link>
            <Link href="/#how-it-works">
              How it Works
            </Link>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-grow flex justify-center px-4 py-10">
        <div className="w-full max-w-2xl">
          {/* Heading */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">
              Create your account
            </h1>

            <p className="text-gray-500 text-sm">
              Select your role to get the right
              level of access
            </p>
          </div>

          {/* Role Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            {ROLES.map((role) => {
              const Icon = role.icon
              const isActive =
                selectedRole === role.id

              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() =>
                    setSelectedRole(role.id)
                  }
                  className="relative p-5 rounded-xl border-2 transition-all duration-300"
                  style={{
                    backgroundColor: isActive
                      ? role.accentBg
                      : "#fff",
                    borderColor: isActive
                      ? role.accent
                      : "#e5e7eb",
                    transform: isActive
                      ? "translateY(-2px)"
                      : "none",
                  }}
                >
                  {isActive && (
                    <CheckCircle2
                      className="absolute top-3 right-3"
                      size={18}
                      style={{
                        color: role.accent,
                      }}
                    />
                  )}

                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                    style={{
                      background: isActive
                        ? role.gradient
                        : "#f3f4f6",
                    }}
                  >
                    <Icon
                      size={22}
                      color={
                        isActive
                          ? "#fff"
                          : "#6b7280"
                      }
                    />
                  </div>

                  <h3
                    className="font-semibold"
                    style={{
                      color: isActive
                        ? role.accent
                        : "#111827",
                    }}
                  >
                    {role.label}
                  </h3>

                  <p className="text-sm text-gray-500">
                    {role.tagline}
                  </p>
                </button>
              )
            })}
          </div>

          {/* Role Perks */}
          <div
            className="rounded-xl border p-5 mb-6"
            style={{
              backgroundColor:
                active.accentBg,
              borderColor:
                active.accentBorder,
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <ActiveIcon
                size={16}
                style={{
                  color: active.accent,
                }}
              />

              <span
                className="font-semibold"
                style={{
                  color: active.accent,
                }}
              >
                {active.label} —{" "}
                {active.description}
              </span>
            </div>

            <ul className="grid md:grid-cols-2 gap-2">
              {active.perks.map((perk) => (
                <li
                  key={perk}
                  className="flex items-center gap-2 text-sm"
                >
                  <CheckCircle2
                    size={14}
                    style={{
                      color:
                        active.accent,
                    }}
                  />
                  {perk}
                </li>
              ))}
            </ul>
          </div>

          {/* Register Card */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div
              className="h-1.5"
              style={{
                background:
                  active.gradient,
              }}
            />

            <div className="p-8">
              {/* Google Button */}
              <button
                type="button"
                onClick={
                  handleGoogleSignUp
                }
                className="w-full h-11 border rounded-lg flex items-center justify-center gap-3 hover:bg-gray-50 transition"
              >
                Sign up with Google
              </button>

              <div className="my-5 text-center text-xs text-gray-400">
                OR CONTINUE WITH EMAIL
              </div>

              <form
                onSubmit={handleSubmit(
                  onSubmit
                )}
                className="space-y-4"
              >
                <input
                  {...register(
                    "full_name",
                    {
                      required:
                        "Name is required",
                    }
                  )}
                  placeholder="Full Name"
                  className="w-full h-11 border rounded-lg px-4"
                />

                <input
                  {...register("email", {
                    required:
                      "Email is required",
                    pattern: {
                      value:
                        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message:
                        "Enter valid email",
                    },
                  })}
                  placeholder="Email"
                  className="w-full h-11 border rounded-lg px-4"
                />

                <div className="relative">
                  <input
                    {...register(
                      "password",
                      {
                        required:
                          "Password is required",
                        minLength: {
                          value: 8,
                          message:
                            "Minimum 8 characters",
                        },
                      }
                    )}
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Password"
                    className="w-full h-11 border rounded-lg px-4 pr-12"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        !showPassword
                      )
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>

                <label className="flex gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) =>
                      setAgreed(
                        e.target.checked
                      )
                    }
                  />
                  I agree to Terms &
                  Privacy Policy
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl text-white font-semibold disabled:opacity-50"
                  style={{
                    background:
                      active.gradient,
                  }}
                >
                  {loading
                    ? "Creating..."
                    : `Create ${active.label} Account`}
                </button>
              </form>

              <div className="mt-6 text-center text-sm">
                Already have an
                account?{" "}
                <Link
                  href="/login"
                  className="font-semibold"
                  style={{
                    color:
                      active.accent,
                  }}
                >
                  Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} SmartSQL
        Analytics
      </footer>
    </div>
  )
}