"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { authApi } from "@/lib/api"
import { saveAuth } from "@/lib/auth/session"
import toast from "react-hot-toast"

export const dynamic = 'force-dynamic'

export default function VerifyEmailWarningPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
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
        console.error('Failed to load user data:', err)
        toast.error('Session expired. Please log in again.')
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [router])

  const handleResendVerification = async () => {
    setLoading(true)
    try {
      // Call backend to resend verification email
      await authApi.resendVerificationEmail()
      toast.success('Verification email resent! Please check your inbox.')
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Failed to resend verification email'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !email) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Loading account information...</h2>
          <p className="text-gray-600">
            We're loading your account details. This should only take a moment.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12">
      <div className="w-full max-w-xl space-y-6 text-center p-6 bg-white rounded-lg shadow-lg">
        {/* Icon */}
        <div className="w-16 h-16 flex items-center justify-center bg-yellow-50 rounded-full mb-4">
          <svg className="w-10 h-10 text-yellow-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Email Not Verified</h1>

        {/* Message */}
        <p className="text-gray-600 mb-6">
          You need to verify your email address before accessing this feature.
          Please check your inbox for the verification email we sent when you signed up.
        </p>

        {/* Email display */}
        {email && (
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700">Email:</p>
            <p className="break-all text-gray-600 mb-4">{email}</p>
          </div>
        )}

        {/* Button */}
        <div className="w-full">
          <button
            onClick={handleResendVerification}
            disabled={loading}
            className={`w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors ${loading ? 'opacity-70' : ''}`}
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 6v6l4 2" />
                </svg>
                <span>Sending...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581a8.008 8.008 0 01-1.416-2.944m0 0L10 11l1 1"/>
                </svg>
                <span>Resend Verification Email</span>
              </>
            )}
          </button>
        </div>

        {/* Hint */}
        <p className="text-sm text-gray-500 mt-6">
          If you didn't receive the email, please check your spam folder.
        </p>
      </div>
    </div>
  )
}