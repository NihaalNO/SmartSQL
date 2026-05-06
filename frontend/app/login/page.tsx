"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import toast from "react-hot-toast"
import { Database, Mail, Lock } from "lucide-react"
import { authApi } from "@/lib/api"
import { saveAuth, isAdmin } from "@/lib/auth"
import Link from "next/link"

interface LoginForm {
  email: string
  password: string
}

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>()

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    try {
      const res = await authApi.login(data.email, data.password)
      saveAuth(res)
      router.push(isAdmin() ? "/dashboard" : "/query")
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Login failed"
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const inputBase = {
    borderColor: "#e5e7eb",
  }
  const inputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "#004ac6"
    e.currentTarget.style.boxShadow = "0 0 0 2px rgba(0,74,198,0.20)"
  }
  const inputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "#e5e7eb"
    e.currentTarget.style.boxShadow = ""
  }

  return (
    <div className="min-h-screen flex flex-col font-body-md text-on-surface"
      style={{
        background: `radial-gradient(circle at top left, rgba(37,99,235,0.05), transparent),
                     radial-gradient(circle at bottom right, rgba(124,58,237,0.05), transparent),
                     #f9fafb`,
      }}>

      {/* Navbar */}
      <header className="sticky top-0 w-full z-50 backdrop-blur-md border-b shadow-sm"
        style={{ backgroundColor: "rgba(255,255,255,0.80)", borderColor: "rgba(229,231,235,0.10)" }}>
        <div className="max-w-container-max-xl mx-auto px-page-p flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-base">
            <span className="text-title-lg font-bold text-on-surface" style={{ fontFamily: "Inter,sans-serif" }}>SmartSQL</span>
          </Link>
          <div className="flex items-center gap-md">
            <Link href="/login" className="text-label-lg text-on-surface-variant hover:text-primary transition-colors">Sign In</Link>
            <Link href="/register"
              className="bg-primary-container text-on-primary-container text-label-lg font-semibold px-md py-xs rounded-lg transition-transform hover:scale-95">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-grow flex flex-col items-center justify-center px-page-p py-3xl">
        <div className="w-full max-w-container-max-sm flex flex-col items-center">

          {/* Brand cluster */}
          <div className="mb-2xl text-center">
            <div className="w-16 h-16 bg-primary-container rounded-xl flex items-center justify-center mb-lg shadow-lg mx-auto">
              <Database size={32} className="text-on-primary-container" />
            </div>
            <h1 className="text-headline-lg font-bold text-on-surface tracking-tight mb-xs" style={{ fontFamily: "Inter,sans-serif" }}>
              Welcome back
            </h1>
            <p className="text-body-md text-on-surface-variant">Log in to your SmartSQL analytics dashboard.</p>
          </div>

          {/* Login card */}
          <div className="w-full bg-surface border border-outline rounded-lg shadow-sm p-page-padding">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-lg">

              {/* Email */}
              <div className="space-y-xs">
                <label className="text-label-lg text-on-surface" htmlFor="email">Email address</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input
                    {...register("email", { required: "Email is required" })}
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    className="w-full pl-11 pr-md py-sm bg-surface border rounded-lg text-body-md outline-none transition-all"
                    style={inputBase}
                    onFocus={inputFocus}
                    onBlur={inputBlur}
                  />
                </div>
                {errors.email && <p className="text-error text-label-sm">{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div className="space-y-xs">
                <div className="flex justify-between items-center">
                  <label className="text-label-lg text-on-surface" htmlFor="password">Password</label>
                  <Link href="#" className="text-label-sm text-primary hover:underline underline-offset-4">Forgot password?</Link>
                </div>
                <div className="relative">
                  <Lock size={18} className="absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input
                    {...register("password", { required: "Password is required" })}
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="w-full pl-11 pr-md py-sm bg-surface border rounded-lg text-body-md outline-none transition-all"
                    style={inputBase}
                    onFocus={inputFocus}
                    onBlur={inputBlur}
                  />
                </div>
                {errors.password && <p className="text-error text-label-sm">{errors.password.message}</p>}
              </div>

              {/* Primary CTA */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-container text-on-primary-container text-label-lg font-semibold py-sm rounded-lg shadow-md transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                onMouseEnter={e => { if (!loading) { e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(0,74,198,0.25)"; e.currentTarget.style.transform = "translateY(-2px)"; } }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = ""; e.currentTarget.style.transform = ""; }}>
                {loading ? "Signing in…" : "Sign In"}
              </button>

              {/* Divider */}
              <div className="relative py-md">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-outline" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-surface px-md text-label-sm text-on-surface-variant uppercase tracking-wider">Or continue with</span>
                </div>
              </div>

              {/* Google SSO */}
              <button
                type="button"
                onClick={() => toast("Google sign-in coming soon")}
                className="w-full flex items-center justify-center gap-md border border-outline bg-surface py-sm rounded-lg text-label-lg text-on-surface transition-all duration-200 hover:bg-surface-container-low group">
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.16H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.84l3.66-2.75z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.16l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Sign in with Google
              </button>
            </form>
          </div>

          {/* Footer link */}
          <p className="mt-2xl text-body-md text-on-surface-variant">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary font-semibold hover:underline underline-offset-4">Create an account</Link>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-xl bg-surface border-t border-outline">
        <div className="max-w-container-max-xl mx-auto px-page-p flex flex-col md:flex-row justify-between items-center gap-md">
          <span className="text-title-md font-bold text-on-surface" style={{ fontFamily: "Inter,sans-serif" }}>SmartSQL</span>
          <div className="flex flex-wrap justify-center gap-lg">
            {["Privacy Policy", "Terms of Service", "Security", "Status"].map(l => (
              <Link key={l} href="#"
                className="text-label-md text-on-secondary-container hover:text-on-surface hover:underline decoration-primary underline-offset-4 transition-all">
                {l}
              </Link>
            ))}
          </div>
          <p className="text-label-md text-on-secondary-container opacity-60">© 2025 SmartSQL Analytics. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
