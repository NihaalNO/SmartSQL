"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { authApi } from "@/lib/api"
import toast from "react-hot-toast"

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

        // Auto-redirect to login after 3 seconds
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Verifying your email...</h2>
          <p className="text-gray-600">
            We're verifying your email address. This should only take a moment.
          </p>
        </div>
      </div>
    )
  }

  if (verified) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Email Verified!</h2>
          <p className="text-gray-600 mb-6">
            Your email has been successfully verified. You can now log in to your account.
          </p>
          <div className="animate-pulse inline-flex items-center px-3 py-2 rounded-full text-sm font-medium text-bg-gray-100 bg-gray-800">
            Redirecting to login page...
          </div>
        </div>
      </div>
    )
  }

  return null
}