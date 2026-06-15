"use client"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { authApi } from "@/lib/api"
import toast from "react-hot-toast"
import { Lock, Mail } from "lucide-react"
import Link from "next/link"

export const dynamic = 'force-dynamic'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  useEffect(() => {
    const urlToken = searchParams.get('token')
    if (urlToken) {
      setToken(urlToken)
    } else {
      toast.error('Invalid reset link')
      router.push('/forgot-password')
    }
  }, [router, searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      await authApi.resetPassword({ token, password })
      toast.success('Password has been reset successfully. You can now log in.')
      router.push('/login')
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Failed to reset password'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

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
            <Lock size={22} className="text-primary" />
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
              Reset Password
            </h1>
            <p className="text-sm text-on-surface-variant">
              Enter a new password for your account
            </p>
          </div>

          {/* Form Card */}
          <div className="w-full bg-surface border border-outline rounded-xl shadow-sm overflow-hidden">
            {/* Accent header strip */}
            <div className="h-1.5 w-full" style={{ background: "#004ac6" }} />

            <div className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-on-surface" htmlFor="password">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                    <input
                      id="password" type="password" required
                      placeholder="••••••••"
                      value={password} onChange={e => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-surface border rounded-lg text-sm outline-none transition-all"
                      style={{ borderColor: "#e5e7eb" }}
                      onFocus={e => { e.currentTarget.style.borderColor = "#004ac6"; e.currentTarget.style.boxShadow = `0 0 0 3px rgba(0,74,198,0.3)` }}
                      onBlur={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.boxShadow = "" }}
                    />
                  </div>
                  <p className="text-sm text-on-surface-variant mt-1">
                    Password must be at least 8 characters with uppercase, lowercase, number, and special character
                  </p>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-on-surface" htmlFor="confirm_password">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top/2 -translate-y-1/2 text-on-surface-variant" />
                    <input
                      id="confirm_password" type="password" required
                      placeholder="••••••••"
                      value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-surface border rounded-lg text-sm outline-none transition-all"
                      style={{ borderColor: "#e5e7eb" }}
                      onFocus={e => { e.currentTarget.style.borderColor = "#004ac6"; e.currentTarget.style.boxShadow = `0 0 0 3px rgba(0,74,198,0.3)` }}
                      onBlur={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.boxShadow = "" }}
                    />
                  </div>
                  {password !== confirmPassword && password !== "" && (
                    <p className="text-red-500 text-sm mt-1">
                      Passwords do not match
                    </p>
                  )}
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
                  {loading ? "Resetting…" : "Reset Password"}
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