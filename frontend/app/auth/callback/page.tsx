"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { authApi } from "@/lib/api"
import { saveAuth } from "@/lib/auth/session"
import { getGoogleRedirectUri } from "@/lib/auth/google"
import { supabase } from "@/lib/supabase"
import toast from "react-hot-toast"
import { SmartSQLLogo } from "@/components/brand/SmartSQLLogo"

export const dynamic = 'force-dynamic'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("Processing authentication...")

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search)

        // ── Path 1: Code from custom Google OAuth (startSmartSqlGoogleAuth) ──
        const code = urlParams.get('code')
        if (code) {
          const res = await authApi.loginWithGoogle({
            code,
            redirect_uri: getGoogleRedirectUri(),
          })
          saveAuth(res)
          const redirectUrl = urlParams.get('redirect_to') || '/dashboard'
          router.push(redirectUrl)
          return
        }

        // ── Path 2: Session from Supabase OAuth (hash fragment) ──
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          // Save the token so authApi.me() can use it
          saveAuth({
            user_id: 0,
            full_name: "",
            email: session.user?.email || "",
            access_token: session.access_token,
            email_verified: !!session.user?.email_confirmed_at,
          })

          // Fetch full user profile from our backend
          const userData = await authApi.me()
          saveAuth({
            user_id: userData.id,
            full_name: userData.full_name,
            email: userData.email,
            access_token: session.access_token,
            email_verified: !!session.user?.email_confirmed_at,
            created_at: userData.created_at,
            updated_at: userData.updated_at,
            avatar_url: userData.avatar_url,
          })

          const redirectUrl = urlParams.get('redirect_to') || '/dashboard'
          router.push(redirectUrl)
          return
        }

        // ── Path 3: Error parameter ──
        const error = urlParams.get('error')
        if (error) {
          throw new Error(`Authentication failed: ${error}`)
        }

        // ── Path 4: Fallback — try fetching current session ──
        setMessage("Completing sign-in...")
        const fallbackSession = await supabase.auth.getSession()
        if (fallbackSession.data?.session?.access_token) {
          const s = fallbackSession.data.session
          saveAuth({
            user_id: 0,
            full_name: "",
            email: s.user?.email || "",
            access_token: s.access_token,
            email_verified: !!s.user?.email_confirmed_at,
          })

          const userData = await authApi.me()
          saveAuth({
            user_id: userData.id,
            full_name: userData.full_name,
            email: userData.email,
            access_token: s.access_token,
            email_verified: !!s.user?.email_confirmed_at,
            created_at: userData.created_at,
            updated_at: userData.updated_at,
            avatar_url: userData.avatar_url,
          })

          router.push('/dashboard')
          return
        }

        // ── No session found ──
        throw new Error("No authentication session found")
      } catch (err: any) {
        console.error('Auth callback error:', err)
        toast.error(err?.response?.data?.detail || 'Authentication failed. Please try again.')
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    // Small delay to let Supabase client recover session from URL hash
    const timer = setTimeout(() => handleCallback(), 300)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border bg-card/95">
        <div className="max-w-6xl mx-auto px-6 flex items-center h-16">
          <div className="flex items-center gap-2.5">
            <SmartSQLLogo size={32} className="text-sm" />
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="mint-card w-full max-w-sm p-8 text-center animate-fade-in-up">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 bg-secondary">
            <SmartSQLLogo variant="icon" size={28} className="animate-pulse" />
          </div>
          <p className="mint-kicker">Authentication</p>
          <h1 className="text-lg font-semibold mt-2 mb-2 text-foreground">{message}</h1>
          <p className="text-sm text-muted-foreground">This should only take a moment.</p>
        </div>
      </main>
    </div>
  )
}
