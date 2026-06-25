"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import toast from "react-hot-toast"
import { Eye, EyeOff } from "lucide-react"
import Link from "next/link"

import { authApi } from "@/lib/api"
import { getAuthDisplayError } from "@/lib/auth/errors"
import { startSmartSqlGoogleAuth } from "@/lib/auth/google"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { SmartSQLLogo } from "@/components/brand/SmartSQLLogo"

interface RegisterForm {
  full_name: string
  email: string
  password: string
}

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const { register, handleSubmit } = useForm<RegisterForm>()

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
    if (!agreed) {
      toast.error("Please agree to the Terms of Service")
      return
    }

    setLoading(true)
    try {
      await authApi.register(data)
      toast.success("Account created. Please check your email to verify your account, then log in.")
      router.push("/login")
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Registration failed. Please try again."
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <SmartSQLLogo size={32} className="text-sm" />
          </Link>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sign in</Link>
        </div>
      </header>

      <main className="flex-1 flex justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <h1 className="heading-md text-foreground mb-1">Create your account</h1>
            <p className="body-sm text-muted-foreground">Start generating SQL, saving queries, and connecting live databases.</p>
          </div>

          <div className="rounded border border-white/[0.06] overflow-hidden">
            <div className="h-0.5 bg-primary" />
            <div className="p-6">
              <button
                type="button"
                onClick={handleGoogleSignUp}
                className="w-full flex items-center justify-center gap-2.5 border border-white/[0.08] py-2.5 rounded text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all duration-150 mb-4"
              >
                <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.832 1.24 6.926l4.026 2.839Z"/><path fill="#34A853" d="M16.04 18.013c-1.09.703-2.474 1.078-4.04 1.078a7.077 7.077 0 0 1-6.723-4.823l-4.04 2.859A11.965 11.965 0 0 0 12 24c2.933 0 5.735-1.043 7.834-3l-3.793-2.987Z"/><path fill="#4A90E2" d="M19.834 21c2.195-2.048 3.545-5.09 3.545-9 0-.706-.109-1.472-.272-2.182H12v4.364h6.109c-.82 2.263-2.719 3.545-4.909 3.545a5.5 5.5 0 0 1-1.473-.205l-3.993 2.891A6.929 6.929 0 0 0 12 21c2.265 0 4.338-.676 5.834-2.987Z"/><path fill="#FBBC05" d="M5.277 14.268A7.12 7.12 0 0 1 4.909 12c0-.782.125-1.533.357-2.235L1.24 6.926A11.922 11.922 0 0 0 0 12c0 1.92.445 3.73 1.237 5.34l4.04-3.072Z"/></svg>
                <span>Sign up with Google</span>
              </button>

              <div className="relative py-1 mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/[0.06]" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 text-xs text-muted-foreground bg-background">OR CONTINUE WITH EMAIL</span>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground/80" htmlFor="full_name">Full Name</label>
                  <input
                    id="full_name"
                    {...register("full_name", { required: true })}
                    placeholder="Jane Smith"
                    className="w-full px-3 py-2.5 text-sm bg-white/[0.04] border border-white/[0.08] rounded text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition-all duration-150"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground/80" htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    {...register("email", { required: true })}
                    placeholder="jane@company.com"
                    className="w-full px-3 py-2.5 text-sm bg-white/[0.04] border border-white/[0.08] rounded text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition-all duration-150"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground/80" htmlFor="password">Password</label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      {...register("password", { required: true, minLength: 8 })}
                      placeholder="Password"
                      className="w-full px-3 py-2.5 pr-10 text-sm bg-white/[0.04] border border-white/[0.08] rounded text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition-all duration-150"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 accent-primary" />
                  <span className="text-xs text-muted-foreground">
                    I agree to the <span className="text-primary">Terms of Service</span> and <span className="text-primary">Privacy Policy</span>
                  </span>
                </label>

                <Button type="submit" disabled={loading} variant="primary" className="w-full h-11">
                  {loading ? "Creating account..." : "Create account"}
                </Button>
              </form>
            </div>
          </div>

          <p className="mt-6 text-sm text-center text-muted-foreground">
            Already have an account? <Link href="/login" className="font-medium text-primary">Sign in</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
