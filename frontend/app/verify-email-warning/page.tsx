"use client"

import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { authApi } from "@/lib/api"
import toast from "react-hot-toast"
import { AlertTriangle, Mail, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SmartSQLLogo } from "@/components/brand/SmartSQLLogo"

export const dynamic = 'force-dynamic'

export default function VerifyEmailWarningPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [email, setEmail] = useState("")

  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true)
      try {
        const userData = await authApi.me()
        if (userData && userData.email) {
          setEmail(userData.email)
        }
      } catch (err) {
        toast.error('Session expired. Please log in again.')
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [router])

  const handleResendVerification = async () => {
    setSending(true)
    try {
      await authApi.resendVerificationEmail()
      toast.success('Verification email resent! Please check your inbox.')
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Failed to resend verification email'
      toast.error(message)
    } finally {
      setSending(false)
    }
  }

  if (loading && !email) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="text-center">
          <SmartSQLLogo variant="icon" size={36} className="mx-auto mb-4 animate-pulse" />
          <h2 className="heading-md text-foreground mb-2">Loading account information&hellip;</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded border border-amber-500/20 bg-amber-500/[0.04] p-8 text-center">
          <SmartSQLLogo size={36} className="mx-auto mb-6 justify-center text-sm" />
          <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={28} className="text-amber-400" />
          </div>

          <h1 className="heading-md text-foreground mb-2">Email Not Verified</h1>
          <p className="body-sm text-muted-foreground mb-6">
            You need to verify your email address before accessing this feature.
            Please check your inbox for the verification email we sent when you signed up.
          </p>

          {email && (
            <div className="flex items-center justify-center gap-2 mb-6 p-3 rounded bg-white/[0.04]">
              <Mail size={14} className="text-muted-foreground" />
              <span className="text-sm text-foreground/80">{email}</span>
            </div>
          )}

          <Button onClick={handleResendVerification} disabled={sending} variant="primary" className="w-full h-11">
            {sending ? (
              <><Loader2 size={14} className="animate-spin" /> Sending&hellip;</>
            ) : (
              <><Mail size={14} /> Resend Verification Email</>
            )}
          </Button>

          <p className="text-xs text-muted-foreground mt-4">
            If you didn&apos;t receive the email, please check your spam folder.
          </p>
        </div>
      </div>
    </div>
  )
}
