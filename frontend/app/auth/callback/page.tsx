"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { authApi } from "@/lib/api"
import { saveAuth } from "@/lib/auth/session"
import toast from "react-hot-toast"

export const dynamic = 'force-dynamic'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search)
        const accessToken = urlParams.get('access_token')
        const refreshToken = urlParams.get('refresh_token')

        // If we have tokens directly in the URL (implicit flow)
        if (accessToken) {
          // Get user data using the access token
          const userData = await authApi.me()

          // Create auth user object
          const authUser = {
            user_id: userData.id,
            full_name: userData.full_name,
            email: userData.email,
            role: userData.role,
            access_token: accessToken,
            email_verified: true // Assuming Google OAuth provides verified email
          }

          saveAuth(authUser)

          // Redirect to intended destination
          const redirectUrl = urlParams.get('redirect_to') || '/dashboard'
          router.push(redirectUrl)
          return
        }

        // Otherwise, check if we need to exchange code for tokens
        const code = urlParams.get('code')
        if (code) {
          // Exchange code for session
          const res = await authApi.loginWithGoogle({ code })
          saveAuth(res)

          // Redirect to intended destination
          const redirectUrl = urlParams.get('redirect_to') || '/dashboard'
          router.push(redirectUrl)
          return
        }

        // If neither tokens nor code, check for error
        const error = urlParams.get('error')
        if (error) {
          throw new Error(`Authentication failed: ${error}`)
        }

        // Fallback: try to get current user
        const userData = await authApi.me()
        const authUser = {
          user_id: userData.id,
          full_name: userData.full_name,
          email: userData.email,
          role: userData.role,
          access_token: "", // Would need to be obtained from session
          email_verified: true
        }

        saveAuth(authUser)
        router.push('/dashboard')
      } catch (err: any) {
        console.error('Auth callback error:', err)
        toast.error('Authentication failed. Please try again.')
        router.push('/login')
      } finally {
        setLoading(false)
        setCompleted(true)
      }
    }

    handleCallback()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Processing authentication...</h2>
          <p className="text-gray-600">
            We're processing your Google sign-in. This should only take a moment.
          </p>
          <div className="flex items-center justify-center mt-6">
            <div className="w-5 h-5 rounded-full border-2 border-t-transparent border-b-gray-400 animate-spin" />
          </div>
        </div>
      </div>
    )
  }

  if (completed) {
    return null // Redirect already happened in useEffect
  }

  return null
}