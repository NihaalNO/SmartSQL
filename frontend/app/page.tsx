"use client"
import Link from "next/link"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Database, MessageSquare, BarChart3, ShieldCheck,
  CheckCircle, ArrowRight, Star,
} from "lucide-react"
import { isLoggedIn, isAdmin } from "@/lib/auth"

function useAuthRedirect() {
  const router = useRouter()
  useEffect(() => {
    if (isLoggedIn()) router.replace(isAdmin() ? "/dashboard" : "/query")
  }, [router])
}

const FEATURES = [
  {
    icon: MessageSquare,
    title: "Natural Language Processing",
    desc: "Ask questions in plain English. Our AI understands complex business logic and joins tables automatically.",
    hoverBg: "#2563eb",
  },
  {
    icon: BarChart3,
    title: "Instant Visualisation",
    desc: "Automatic charts for every query. From bar graphs to heatmaps, we choose the best visual for your data.",
    hoverBg: "#6a1edb",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise Security",
    desc: "Role-based access control and read-only validation. Only SELECT queries execute — writes are blocked at the API layer.",
    hoverBg: "#1d4ed8",
  },
]

const STEPS = [
  {
    num: "01", title: "Connect Data",
    desc: "Securely connect your MySQL or Supabase database. We introspect your schema metadata instantly.",
    color: "#004ac6", hoverColor: "#22d3ee",
  },
  {
    num: "02", title: "Ask a Question",
    desc: "Type any business question in plain English. No more waiting for the data team to build a custom report.",
    color: "#6a1edb", hoverColor: "#a78bfa",
  },
  {
    num: "03", title: "Get Insights",
    desc: "Receive a validated SQL query, an interactive chart, and an AI-generated insight summary.",
    color: "#22c55e", hoverColor: "#34d399",
  },
]

const DEMO_CREDS = [
  { role: "Admin",   email: "admin@smartsql.com",   password: "admin123",   badge: "bg-red-100 text-red-700",   card: "border-red-200 bg-red-50" },
  { role: "Analyst", email: "analyst@smartsql.com", password: "analyst123", badge: "bg-blue-100 text-blue-700", card: "border-blue-200 bg-blue-50" },
  { role: "Viewer",  email: "viewer@smartsql.com",  password: "viewer123",  badge: "bg-gray-100 text-gray-700", card: "border-gray-200 bg-gray-50" },
]

export default function HomePage() {
  useAuthRedirect()

  return (
    <div className="font-body-md text-on-surface overflow-x-hidden" style={{ backgroundColor: "#f9fafb" }}>

      {/* ── Navbar ── */}
      <header className="sticky top-0 w-full z-50 backdrop-blur-md border-b shadow-sm"
        style={{ backgroundColor: "rgba(255,255,255,0.80)", borderColor: "rgba(229,231,235,0.10)" }}>
        <div className="max-w-container-max-xl mx-auto px-page-p flex justify-between items-center h-16">
          <div className="flex items-center gap-base">
            <Database size={22} className="text-primary" />
            <span className="text-title-lg font-bold text-on-surface" style={{ fontFamily: "Inter,sans-serif" }}>SmartSQL</span>
          </div>
          <nav className="hidden md:flex items-center gap-xl">
            <a href="#features"     className="text-label-lg font-bold text-primary border-b-2 border-primary transition-colors">Features</a>
            <a href="#how-it-works" className="text-label-lg text-on-surface-variant hover:text-primary transition-colors">How it Works</a>
            <a href="#demo"         className="text-label-lg text-on-surface-variant hover:text-primary transition-colors">Try It</a>
          </nav>
          <div className="flex items-center gap-md">
            <Link href="/login" className="hidden sm:block text-on-surface-variant text-label-lg hover:text-on-surface transition-all">
              Sign In
            </Link>
            <Link href="/register"
              className="bg-primary text-on-primary px-lg py-sm rounded-lg text-label-lg font-semibold active:scale-95 transition-all shadow-sm"
              style={{ transition: "background 200ms, box-shadow 200ms" }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#8343f4"; e.currentTarget.style.boxShadow = "0 10px 25px -5px rgba(131,67,244,0.35)"; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#004ac6"; e.currentTarget.style.boxShadow = ""; }}>
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="hero-vibrant-bg pt-3xl pb-3xl px-page-p overflow-hidden relative">
        <div className="vibrant-blob" style={{ backgroundColor: "rgba(0,74,198,0.20)", top: "-80px", left: "-80px" }} />
        <div className="vibrant-blob" style={{ backgroundColor: "rgba(106,30,219,0.20)", bottom: "-80px", right: "-80px" }} />

        <div className="max-w-container-max-xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-3xl items-center relative z-10">
          {/* Left */}
          <div className="flex flex-col gap-lg max-w-container-max-sm">
            <h1 className="text-display font-bold text-on-surface" style={{ fontFamily: "Inter,sans-serif" }}>
              From natural language to{" "}
              <span className="gradient-text">SQL insights</span>
              {" "}in seconds.
            </h1>
            <p className="text-body-lg text-on-surface-variant">
              The professional data-intelligence tool for teams who want answers, not syntax errors.
              Connect your database and start chatting with your data.
            </p>
            <div className="flex flex-wrap gap-md mt-md">
              <Link href="/register"
                className="bg-primary text-on-primary px-xl py-md rounded-lg text-title-md font-semibold active:scale-95 transition-all shadow-lg"
                style={{ boxShadow: "0 10px 15px -3px rgba(0,74,198,0.20)", transition: "background 200ms, box-shadow 200ms" }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#8343f4"; e.currentTarget.style.boxShadow = "0 20px 25px -5px rgba(131,67,244,0.35)"; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#004ac6"; e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(0,74,198,0.20)"; }}>
                Get Started for Free
              </Link>
              <Link href="/login"
                className="border bg-surface text-on-surface-variant px-xl py-md rounded-lg text-title-md font-semibold transition-all"
                style={{ borderColor: "#e5e7eb" }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#f3f4f6"; e.currentTarget.style.borderColor = "rgba(0,74,198,0.50)"; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#ffffff"; e.currentTarget.style.borderColor = "#e5e7eb"; }}>
                Sign In
              </Link>
            </div>
          </div>

          {/* Right — terminal */}
          <div className="relative">
            <div className="absolute -inset-4 rounded-full blur-3xl" style={{ backgroundColor: "rgba(0,74,198,0.15)" }} />
            <div className="relative bg-code-surface rounded-xl shadow-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.10)" }}>
              <div className="px-md py-sm border-b flex items-center justify-between"
                style={{ backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.05)" }}>
                <div className="flex gap-xs">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "rgba(239,68,68,0.4)" }} />
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "rgba(234,179,8,0.4)" }} />
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "rgba(34,197,94,0.4)" }} />
                </div>
                <span className="font-code-sm text-code-sm" style={{ color: "rgba(255,255,255,0.40)" }}>smart_sql_agent.sh</span>
              </div>
              <div className="p-xl font-code-md text-code-md space-y-lg">
                <div className="flex gap-md flex-wrap">
                  <span className="text-primary-fixed-dim">query:</span>
                  <span className="text-on-primary-container">&quot;Show me monthly revenue by region for 2023&quot;</span>
                </div>
                <div className="h-px w-full" style={{ backgroundColor: "rgba(255,255,255,0.05)" }} />
                <div className="space-y-xs">
                  <div><span className="text-code-keyword">SELECT</span></div>
                  <div className="pl-md">
                    <span className="text-code-literal">DATE_TRUNC</span>(<span className="text-code-output">&apos;month&apos;</span>, order_date) <span className="text-code-keyword">AS</span> month,
                  </div>
                  <div className="pl-md">region,</div>
                  <div className="pl-md">
                    <span className="text-code-function">SUM</span>(revenue) <span className="text-code-keyword">AS</span> total_revenue
                  </div>
                  <div><span className="text-code-keyword">FROM</span> sales.orders</div>
                  <div>
                    <span className="text-code-keyword">WHERE</span> <span className="text-code-function">EXTRACT</span>(year <span className="text-code-keyword">FROM</span> order_date) = <span className="text-code-literal">2023</span>
                  </div>
                  <div><span className="text-code-keyword">GROUP BY</span> <span className="text-code-literal">1, 2</span></div>
                  <div><span className="text-code-keyword">ORDER BY</span> <span className="text-code-literal">1, 2</span>;</div>
                </div>
                <div className="flex items-center gap-sm pt-md text-success">
                  <CheckCircle size={16} />
                  <span>Query validated and executed in 1.2s · 48 rows</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-3xl px-page-p bg-surface relative overflow-hidden">
        <div className="vibrant-blob" style={{ backgroundColor: "rgba(217,223,245,0.30)", top: "50%", right: "-160px", transform: "translateY(-50%)" }} />
        <div className="max-w-container-max-xl mx-auto relative z-10">
          <div className="text-center mb-3xl">
            <h2 className="text-headline-lg font-bold text-on-surface mb-md" style={{ fontFamily: "Inter,sans-serif" }}>
              Analytics at the speed of thought
            </h2>
            <p className="text-body-lg text-on-surface-variant max-w-container-max-md mx-auto">
              Skip the SQL drafting and go straight to the business decisions that matter most for your team.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-xl">
            {FEATURES.map(({ icon: Icon, title, desc, hoverBg }) => (
              <div key={title}
                className="group p-xl rounded-xl border transition-all duration-300 hover:shadow-lg"
                style={{ borderColor: "#e5e7eb", backgroundColor: "rgba(255,255,255,0.80)", backdropFilter: "blur(4px)" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(0,74,198,0.30)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "#e5e7eb")}>
                <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-lg transition-all duration-300 group-hover:scale-110"
                  style={{ backgroundColor: "#dbe1ff" }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = hoverBg; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#dbe1ff"; }}>
                  <Icon size={22} className="text-primary transition-colors duration-300 group-hover:text-white" />
                </div>
                <h3 className="text-title-lg font-semibold text-on-surface mb-sm">{title}</h3>
                <p className="text-body-md text-on-surface-variant">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-3xl px-page-p overflow-hidden relative"
        style={{ backgroundColor: "#030712", color: "#ffffff" }}>
        <div className="absolute top-0 right-0 w-full h-full opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(circle at right, #004ac6, #6a1edb, transparent)" }} />

        <div className="max-w-container-max-xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-end gap-xl mb-3xl">
            <div className="max-w-container-max-sm">
              <h2 className="text-display font-bold text-white mb-md" style={{ fontFamily: "Inter,sans-serif" }}>How it works</h2>
              <p className="text-body-lg" style={{ color: "rgba(255,255,255,0.60)" }}>
                Three simple steps to transition from data overload to actionable insights.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-xl">
            {STEPS.map(({ num, title, desc, color, hoverColor }) => (
              <div key={num} className="relative group">
                <div className="text-headline-lg font-bold mb-md opacity-60 transition-colors duration-300"
                  style={{ color, fontFamily: "Inter,sans-serif" }}
                  onMouseEnter={e => (e.currentTarget.style.color = hoverColor)}
                  onMouseLeave={e => (e.currentTarget.style.color = color)}>
                  {num}
                </div>
                <h4 className="text-title-lg font-semibold mb-sm text-white">{title}</h4>
                <p className="text-body-md" style={{ color: "rgba(255,255,255,0.60)" }}>{desc}</p>
              </div>
            ))}
          </div>

          {/* Result preview */}
          <div className="mt-3xl p-xl rounded-xl backdrop-blur-sm"
            style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
              <div className="space-y-sm">
                <p className="text-label-md uppercase tracking-widest mb-md" style={{ color: "rgba(255,255,255,0.40)" }}>Query result</p>
                {[
                  ["Jan 2023", "$1,284,320"],
                  ["Feb 2023", "$1,391,805"],
                  ["Mar 2023", "$1,562,940"],
                ].map(([month, value]) => (
                  <div key={month} className="flex justify-between items-center py-sm border-b"
                    style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                    <span className="font-code-md text-code-md" style={{ color: "rgba(255,255,255,0.60)" }}>{month}</span>
                    <span className="font-code-md text-code-md text-code-output font-semibold">{value}</span>
                  </div>
                ))}
                <div className="flex items-center gap-xs text-success text-code-md pt-xs">
                  <CheckCircle size={13} />
                  <span>48 rows · 94ms · success</span>
                </div>
              </div>
              <div className="flex items-center rounded-lg p-md"
                style={{ backgroundColor: "rgba(0,74,198,0.10)", border: "1px solid rgba(0,74,198,0.20)" }}>
                <p className="text-body-md italic" style={{ color: "rgba(255,255,255,0.70)" }}>
                  ✦ Revenue grew consistently through Q1 2023, with March showing the strongest month
                  (+12% vs January). The North region contributed 38% of total revenue across all periods.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Demo / CTA ── */}
      <section id="demo" className="py-3xl px-page-p bg-surface-container-low relative overflow-hidden">
        <div className="vibrant-blob" style={{ backgroundColor: "rgba(0,74,198,0.10)", bottom: "-160px", left: "-80px" }} />
        <div className="max-w-container-max-md mx-auto text-center space-y-xl relative z-10">
          <h2 className="text-display font-bold text-on-surface" style={{ fontFamily: "Inter,sans-serif" }}>
            Ready to <span className="gradient-text">unlock</span> your data?
          </h2>
          <p className="text-body-lg text-on-surface-variant">
            Use any of these demo accounts to explore SmartSQL right now — no sign-up required.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-md pt-md">
            {DEMO_CREDS.map(({ role, email, password, badge, card }) => (
              <div key={role} className={`rounded-xl border p-lg text-left ${card}`}>
                <div className="mb-md">
                  <span className={`text-label-md font-semibold px-sm py-xs rounded-full ${badge}`}>{role}</span>
                </div>
                <div className="space-y-sm font-code-md text-code-md">
                  <div>
                    <p className="text-label-md uppercase tracking-widest text-on-surface-variant mb-xs">Email</p>
                    <p className="text-on-surface font-semibold break-all">{email}</p>
                  </div>
                  <div>
                    <p className="text-label-md uppercase tracking-widest text-on-surface-variant mb-xs">Password</p>
                    <p className="text-on-surface font-semibold">{password}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-md pt-lg">
            <Link href="/login"
              className="bg-primary text-on-primary px-3xl py-md rounded-lg text-title-md font-semibold transition-all shadow-lg w-full sm:w-auto flex items-center justify-center gap-sm"
              style={{ boxShadow: "0 10px 15px -3px rgba(0,74,198,0.25)", transition: "all 200ms" }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#8343f4"; e.currentTarget.style.boxShadow = "0 25px 50px -12px rgba(131,67,244,0.40)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#004ac6"; e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(0,74,198,0.25)"; e.currentTarget.style.transform = ""; }}>
              Start querying now
              <ArrowRight size={18} />
            </Link>
            <Link href="/register"
              className="bg-surface text-on-surface border px-3xl py-md rounded-lg text-title-md font-semibold transition-all w-full sm:w-auto"
              style={{ borderColor: "#e5e7eb" }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#f3f4f6"; e.currentTarget.style.borderColor = "rgba(0,74,198,0.40)"; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#ffffff"; e.currentTarget.style.borderColor = "#e5e7eb"; }}>
              Create account
            </Link>
          </div>

          <div className="flex items-center justify-center gap-xl opacity-40 hover:opacity-100 grayscale hover:grayscale-0 transition-all duration-500 pt-xl">
            {[1, 2, 3, 4, 5].map(i => <Star key={i} size={20} className="fill-current text-warning" />)}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="w-full py-xl bg-surface border-t" style={{ borderColor: "#e5e7eb" }}>
        <div className="max-w-container-max-xl mx-auto px-page-p flex flex-col md:flex-row justify-between items-center gap-md">
          <div className="flex items-center gap-base">
            <Database size={18} className="text-primary" />
            <span className="text-title-md font-bold text-on-surface" style={{ fontFamily: "Inter,sans-serif" }}>SmartSQL</span>
            <span className="text-body-md text-on-secondary-container">© 2025 SmartSQL Analytics. All rights reserved.</span>
          </div>
          <div className="flex flex-wrap justify-center gap-lg">
            {["Privacy Policy", "Terms of Service", "Security", "Contact Sales", "Status"].map(label => (
              <Link key={label} href="/login"
                className="text-label-md text-on-secondary-container hover:text-primary transition-colors">
                {label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
