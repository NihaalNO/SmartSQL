"use client"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { authApi } from "@/lib/api"
import toast from "react-hot-toast"
import { Lock } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SmartSQLLogo } from "@/components/brand/SmartSQLLogo"

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
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <SmartSQLLogo size={32} className="text-sm" />
          </Link>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Back to Sign In</Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h1 className="heading-md text-foreground mb-1">Reset Password</h1>
            <p className="body-sm text-muted-foreground">Enter a new password for your account</p>
          </div>

          <div className="rounded border border-white/[0.06] overflow-hidden">
            <div className="h-0.5 bg-primary" />
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground/80" htmlFor="password">New Password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                    <input id="password" type="password" required placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                      value={password} onChange={e => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-sm bg-white/[0.04] border border-white/[0.08] rounded text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition-all duration-150"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Min 8 characters with uppercase, lowercase, number & special char</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground/80" htmlFor="confirm_password">Confirm Password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                    <input id="confirm_password" type="password" required placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                      value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-sm bg-white/[0.04] border border-white/[0.08] rounded text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition-all duration-150"
                    />
                  </div>
                  {password !== confirmPassword && password !== "" && (
                    <p className="text-xs text-destructive mt-1">Passwords do not match</p>
                  )}
                </div>

                <Button type="submit" disabled={loading} variant="primary" className="w-full h-11">
                  {loading ? "Resetting..." : "Reset Password"}
                </Button>
              </form>
            </div>
          </div>

          <p className="mt-6 text-sm text-center text-muted-foreground">
            Remember your password?{" "}
            <Link href="/login" className="font-medium text-primary">Sign in</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
