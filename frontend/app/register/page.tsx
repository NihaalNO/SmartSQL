"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import toast from "react-hot-toast"
import { Database, User, Mail, Lock } from "lucide-react"
import { authApi } from "@/lib/api"
import { saveAuth } from "@/lib/auth"
import Link from "next/link"

interface RegisterForm {
  full_name: string
  email: string
  password: string
}

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>()

  const onSubmit = async (data: RegisterForm) => {
    if (!agreed) { toast.error("Please agree to the Terms of Service"); return }
    setLoading(true)
    try {
      const res = await authApi.register({ ...data, role: "analyst" })
      saveAuth(res)
      router.push("/query")
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Registration failed"
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col font-body-md text-on-surface" style={{ backgroundColor: "#f9fafb" }}>

      {/* Background decorative blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[5%] w-[400px] h-[400px] rounded-full"
          style={{ backgroundColor: "rgba(0,74,198,0.05)", filter: "blur(100px)" }} />
        <div className="absolute bottom-[10%] right-[5%] w-[300px] h-[300px] rounded-full"
          style={{ backgroundColor: "rgba(106,30,219,0.05)", filter: "blur(80px)" }} />
      </div>

      {/* Navbar */}
      <header className="sticky top-0 w-full z-50 backdrop-blur-md border-b shadow-sm"
        style={{ backgroundColor: "rgba(255,255,255,0.80)", borderColor: "rgba(229,231,235,0.10)" }}>
        <div className="max-w-container-max-xl mx-auto px-page-p flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-xs">
            <Database size={24} className="text-primary" />
            <span className="text-title-lg font-bold text-on-surface" style={{ fontFamily: "Inter,sans-serif" }}>SmartSQL</span>
          </Link>
          <div className="hidden md:flex gap-md">
            <Link href="/#features" className="text-label-lg text-on-surface-variant hover:text-primary transition-colors">Features</Link>
            <Link href="/#how-it-works" className="text-label-lg text-on-surface-variant hover:text-primary transition-colors">How it Works</Link>
          </div>
        </div>
      </header>

      {/* Main card */}
      <main className="flex-grow flex items-center justify-center p-page-p">
        <div className="w-full bg-surface border border-outline rounded-xl shadow-sm overflow-hidden flex flex-col"
          style={{ maxWidth: "440px" }}>

          {/* Gradient header banner */}
          <div className="relative h-24 overflow-hidden"
            style={{ background: "linear-gradient(135deg, #004ac6 0%, #6a1edb 100%)" }}>
            <div className="absolute inset-0" style={{ backgroundColor: "rgba(255,255,255,0.10)", backdropFilter: "blur(4px)" }} />
            <div className="absolute inset-0 flex items-center px-card-padding-lg">
              <h1 className="text-headline-sm font-bold text-on-primary" style={{ fontFamily: "Inter,sans-serif" }}>
                Join the Future of Data
              </h1>
            </div>
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full"
              style={{ backgroundColor: "rgba(180,197,255,0.20)", filter: "blur(40px)" }} />
          </div>

          <div className="p-card-padding-lg space-y-lg">

            {/* Google SSO (visual only) */}
            <button
              type="button"
              onClick={() => toast("Google sign-up coming soon")}
              className="w-full flex items-center justify-center gap-sm h-12 bg-surface border border-outline rounded-lg text-label-lg text-on-surface transition-all duration-200 hover:bg-surface-container-low">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 6.34l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign up with Google
            </button>

            {/* Divider */}
            <div className="relative flex items-center py-xs">
              <div className="flex-grow border-t border-outline" />
              <span className="flex-shrink mx-md text-label-sm text-on-surface-variant">OR CONTINUE WITH EMAIL</span>
              <div className="flex-grow border-t border-outline" />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-md">

              {/* Full Name */}
              <div className="space-y-xs">
                <label className="text-label-md text-on-surface-variant px-xs">Full Name</label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input
                    {...register("full_name", { required: "Name is required" })}
                    placeholder="John Doe"
                    className="w-full pl-10 h-12 bg-white border border-outline rounded-lg text-body-md outline-none transition-all"
                    style={{ borderColor: "#e5e7eb" }}
                    onFocus={e => { e.currentTarget.style.borderColor = "#004ac6"; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(0,74,198,0.20)"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.boxShadow = ""; }}
                  />
                </div>
                {errors.full_name && <p className="text-error text-label-sm px-xs">{errors.full_name.message}</p>}
              </div>

              {/* Business Email */}
              <div className="space-y-xs">
                <label className="text-label-md text-on-surface-variant px-xs">Business Email</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input
                    {...register("email", { required: "Email is required" })}
                    type="email"
                    placeholder="john@company.com"
                    className="w-full pl-10 h-12 bg-white border border-outline rounded-lg text-body-md outline-none transition-all"
                    style={{ borderColor: "#e5e7eb" }}
                    onFocus={e => { e.currentTarget.style.borderColor = "#004ac6"; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(0,74,198,0.20)"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.boxShadow = ""; }}
                  />
                </div>
                {errors.email && <p className="text-error text-label-sm px-xs">{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div className="space-y-xs">
                <label className="text-label-md text-on-surface-variant px-xs">Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input
                    {...register("password", { required: "Password is required", minLength: { value: 8, message: "Minimum 8 characters" } })}
                    type="password"
                    placeholder="••••••••"
                    className="w-full pl-10 h-12 bg-white border border-outline rounded-lg text-body-md outline-none transition-all"
                    style={{ borderColor: "#e5e7eb" }}
                    onFocus={e => { e.currentTarget.style.borderColor = "#004ac6"; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(0,74,198,0.20)"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.boxShadow = ""; }}
                  />
                </div>
                {errors.password && <p className="text-error text-label-sm px-xs">{errors.password.message}</p>}
              </div>

              {/* Terms checkbox */}
              <div className="flex items-start gap-sm pt-xs">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={e => setAgreed(e.target.checked)}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: "#004ac6" }}
                  />
                </div>
                <p className="text-label-md text-on-surface-variant">
                  I agree to the{" "}
                  <Link href="#" className="text-primary hover:underline">Terms of Service</Link>
                  {" "}and{" "}
                  <Link href="#" className="text-primary hover:underline">Privacy Policy</Link>.
                </p>
              </div>

              {/* CTA */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-primary text-on-primary rounded-xl text-label-lg font-semibold shadow-md transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ transition: "all 200ms" }}
                onMouseEnter={e => { if (!loading) { e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(0,74,198,0.30)"; e.currentTarget.style.transform = "translateY(-2px)"; } }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = ""; e.currentTarget.style.transform = ""; }}>
                {loading ? "Creating account…" : "Create Account"}
              </button>
            </form>

            {/* Redirect */}
            <div className="text-center pt-md border-t" style={{ borderColor: "rgba(229,231,235,0.50)" }}>
              <p className="text-body-md text-on-surface-variant">
                Already have an account?{" "}
                <Link href="/login" className="text-primary font-semibold hover:underline">Log in</Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-xl bg-surface border-t border-outline">
        <div className="max-w-container-max-xl mx-auto px-page-p flex flex-col md:flex-row justify-between items-center gap-md">
          <div className="flex items-center gap-xs opacity-60 grayscale">
            <Database size={18} />
            <span className="text-title-md font-bold" style={{ fontFamily: "Inter,sans-serif" }}>SmartSQL</span>
          </div>
          <div className="flex gap-lg">
            {["Privacy Policy", "Terms of Service", "Contact Sales"].map(l => (
              <Link key={l} href="#" className="text-label-md text-on-secondary-container hover:text-on-surface transition-colors">{l}</Link>
            ))}
          </div>
          <p className="text-body-md text-on-secondary-fixed-variant opacity-60">© 2025 SmartSQL Analytics. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
