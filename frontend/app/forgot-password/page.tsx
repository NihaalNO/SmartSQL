"use client"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { authApi } from "@/lib/api"
import toast from "react-hot-toast"
import { Send, Mail } from "lucide-react"
import Link from "next/link"

export const dynamic = 'force-dynamic'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.forgotPassword(email.trim())
      toast.success("If an account with that email exists, we've sent a password reset link.")
      // Clear the form
      setEmail("")
    } catch (err: any) {
      const message = err.response?.data?.detail || "Failed to send reset link"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const redirectUrl = searchParams.get("redirect") || "/dashboard"

  return (
    <div
      className="min-h-screen flex flex-col font-body-md text-on-surface"
      style={{ backgroundColor: "#f9fafb" }}
    >
      {/* Navbar */}
      <header
        className="sticky top-0 w-full z-50 backdrop-blur-md border-b shadow-sm"
        style={{ backgroundColor: "rgba(255,255,255,0.85)", borderColor: "rgba(229,231,235,0.15)" }}
      >
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2">
            <Send size={22} className="text-primary" />
            <span className="text-lg font-bold text-on-surface" style={{ fontFamily: "Inter,sans-serif" }}>
              SmartSQL
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">
              Back to Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-grow flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg space-y-6">

          {/* Brand */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-on-surface tracking-tight mb-2" style={{ fontFamily: "Inter,sans-serif" }}>
              Forgot Password
            </h1>
            <p className="text-sm text-on-surface-variant">
              Enter your email address to receive a password reset link
            </p>
          </div>

          {/* Form Card */}
          <div className="w-full bg-surface border border-outline rounded-xl shadow-sm overflow-hidden">
            {/* Accent header strip */}
            <div className="h-1.5 w-full" style={{ background: "#004ac6" }} />

            <div className="p-8">
              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-on-surface" htmlFor="email">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                    <input
                      id="email" type="email" required
                      placeholder="name@company.com"
                      value={email} onChange={e => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-surface border rounded-lg text-sm outline-none transition-all"
                      style={{ borderColor: "#e5e7eb" }}
                      onFocus={e => { e.currentTarget.style.borderColor = "#004ac6"; e.currentTarget.style.boxShadow = `0 0 0 3px rgba(0,74,198,0.3)` }}
                      onBlur={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.boxShadow = "" }}
                    />
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold text-white shadow-md transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ background: "#004ac6" }}
                  onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = `0 8px 20px -4px rgba(0,74,198,0.3)` } }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "" }}
                >
                  {loading ? "Sending link…" : "Send Reset Link"}
                </button>
              </form>
            </div>
          </div>

          {/* Footer Links */}
          <div className="mt-8 text-center text-sm text-on-surface-variant">
            <p>
              Remember your password?{" "}
              <Link href="/login" className="font-semibold hover:underline" style={{ color: "#004ac6" }}>
                Sign in
              </Link>
            </p>
            <p>
              Don't have an account?{" "}
              <Link href="/register" className="font-semibold hover:underline" style={{ color: "#004ac6" }}>
                Create account
              </Link>
            </p>
          </div>
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