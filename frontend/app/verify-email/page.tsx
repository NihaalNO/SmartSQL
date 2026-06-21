"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { authApi } from "@/lib/api"
import toast from "react-hot-toast"
import { MailCheck, Loader2 } from "lucide-react"
import { SmartSQLLogo } from "@/components/brand/SmartSQLLogo"

export const dynamic = 'force-dynamic'

export default function VerifyEmailPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    const verifyEmail = async () => {
      setLoading(true)
      try {
        const urlParams = new URLSearchParams(window.location.search)
        const token = urlParams.get('token')

        if (!token) {
          toast.error('Invalid verification link')
          router.push('/login')
          return
        }

        await authApi.verifyEmail(token)
        setVerified(true)
        toast.success('Email verified successfully! You can now log in.')

        setTimeout(() => {
          router.push('/login')
        }, 3000)
      } catch (err: any) {
        const message = err.response?.data?.detail || 'Verification failed'
        toast.error(message)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    verifyEmail()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="text-center">
          <SmartSQLLogo variant="icon" size={36} className="mx-auto mb-4 animate-pulse" />
          <h2 className="heading-md text-foreground mb-2">Verifying your email&hellip;</h2>
          <p className="body-sm text-muted-foreground">This should only take a moment.</p>
        </div>
      </div>
    )
  }

  if (verified) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <MailCheck size={32} className="text-primary" />
          </div>
          <h2 className="heading-md text-foreground mb-2">Email Verified!</h2>
          <p className="body-sm text-muted-foreground mb-6">
            Your email has been successfully verified. You can now log in to your account.
          </p>
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm text-muted-foreground bg-white/[0.04]">
            <SmartSQLLogo variant="icon" size={16} className="animate-pulse" />
            Redirecting to login&hellip;
          </span>
        </div>
      </div>
    )
  }

  return null
}
