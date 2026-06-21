"use client"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { authApi } from "@/lib/api"
import toast from "react-hot-toast"
import { Mail } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SmartSQLLogo } from "@/components/brand/SmartSQLLogo"

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
      setEmail("")
    } catch (err: any) {
      const message = err.response?.data?.detail || "Failed to send reset link"
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
            <h1 className="heading-md text-foreground mb-1">Forgot Password</h1>
            <p className="body-sm text-muted-foreground">Enter your email to receive a reset link</p>
          </div>

          <div className="rounded border border-white/[0.06] overflow-hidden">
            <div className="h-0.5 bg-primary" />
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground/80" htmlFor="email">Email address</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                    <input id="email" type="email" required placeholder="name@company.com"
                      value={email} onChange={e => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-sm bg-white/[0.04] border border-white/[0.08] rounded text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition-all duration-150"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={loading} variant="primary" className="w-full h-11">
                  {loading ? "Sending link..." : "Send Reset Link"}
                </Button>
              </form>
            </div>
          </div>

          <p className="mt-6 text-sm text-center text-muted-foreground">
            Remember your password?{" "}
            <Link href="/login" className="font-medium text-primary">Sign in</Link>
          </p>
          <p className="text-sm text-center text-muted-foreground mt-1">
            No account?{" "}
            <Link href="/register" className="font-medium text-primary">Create one</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
