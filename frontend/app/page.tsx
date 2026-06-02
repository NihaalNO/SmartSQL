"use client"
import Link from "next/link"
import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  CheckCircle, ArrowRight,
  Languages, Zap, BarChart3,
} from "lucide-react"
import { isLoggedIn, isAdmin } from "@/lib/auth"

// ---------------------------------------------------------------------------
// Auth redirect
// ---------------------------------------------------------------------------

function useAuthRedirect() {
  const router = useRouter()
  useEffect(() => {
    if (isLoggedIn()) router.replace(isAdmin() ? "/moderator/dashboard" : "/query")
  }, [router])
}

// ---------------------------------------------------------------------------
// Particle canvas
// ---------------------------------------------------------------------------

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let animId: number

    interface Particle {
      x: number; y: number; size: number
      speedX: number; speedY: number
      opacity: number; fadeSpeed: number; growing: boolean
    }
    let particles: Particle[] = []

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }

    const makeParticle = (): Particle => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size:      Math.random() * 2 + 1,
      speedX:    (Math.random() - 0.5) * 0.3,
      speedY:    (Math.random() - 0.5) * 0.3,
      opacity:   Math.random() * 0.5,
      fadeSpeed: Math.random() * 0.005 + 0.002,
      growing:   Math.random() > 0.5,
    })

    const init = () => {
      particles = Array.from(
        { length: Math.floor((canvas.width * canvas.height) / 15000) },
        makeParticle,
      )
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x += p.speedX; p.y += p.speedY
        if (p.growing) { p.opacity += p.fadeSpeed; if (p.opacity >= 0.6) p.growing = false }
        else           { p.opacity -= p.fadeSpeed; if (p.opacity <= 0) Object.assign(p, makeParticle()) }
        if (p.x < 0) p.x = canvas.width;  if (p.x > canvas.width)  p.x = 0
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(100,149,237,${p.opacity})`
        ctx.fill()
      })
      animId = requestAnimationFrame(animate)
    }

    resize()
    init()
    if (prefersReducedMotion) {
      particles.forEach(p => { p.opacity = 0.15; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fillStyle = `rgba(100,149,237,0.15)`; ctx.fill() })
    } else {
      animate()
    }

    const onResize = () => { resize(); init() }
    window.addEventListener("resize", onResize)
    return () => { window.removeEventListener("resize", onResize); cancelAnimationFrame(animId) }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const FEATURES = [
  {
    icon: Languages,
    title: "Natural Language Queries",
    desc: "Stop memorising table names and joins. Write questions in plain English and watch SmartSQL generate production-ready SQL instantly.",
  },
  {
    icon: Zap,
    title: "Intelligent Optimization",
    desc: "Our engine analyses your query patterns to suggest missing indexes and rewrite slow subqueries for maximum performance.",
  },
  {
    icon: BarChart3,
    title: "Live Visualizer",
    desc: "Instantly generate charts and data insights from your query results. No manual configuration — the best visual is chosen automatically.",
  },
]


// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HomePage() {
  useAuthRedirect()

  return (
    <div className="font-body-md text-on-surface overflow-x-hidden" style={{ backgroundColor: "#f9f9ff" }}>

      {/* ── Animated background (fixed, behind everything) ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <ParticleCanvas />
        {/* Blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px]"
          style={{ background: "rgba(0,53,148,0.05)" }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px]"
          style={{ background: "rgba(105,29,218,0.05)" }} />
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-40" style={{
          backgroundImage: "radial-gradient(circle at 2px 2px, rgba(0,53,148,0.05) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }} />
      </div>

      {/* ── Navbar ── */}
      <header className="fixed top-0 w-full z-50 border-b"
        style={{ background: "rgba(249,249,255,0.80)", backdropFilter: "blur(12px)", borderColor: "rgba(195,198,214,0.30)" }}>
        <nav className="flex justify-between items-center max-w-6xl mx-auto px-6 h-16">
          <div className="flex items-center gap-2">
            {/* Terminal icon */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#004ac6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
            </svg>
            <span className="text-headline-sm font-bold text-primary">SmartSQL</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#features"     className="text-primary font-semibold border-b-2 border-primary text-label-lg">Features</a>
            <a href="#how-it-works" className="text-on-surface-variant hover:text-primary transition-colors text-label-lg">How it Works</a>
            <a href="#demo"         className="text-on-surface-variant hover:text-primary transition-colors text-label-lg">Try It</a>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login"
              className="hidden sm:block text-primary font-title-sm px-4 py-1.5 rounded-lg hover:bg-surface-container transition-colors">
              Sign In
            </Link>
            <Link href="/register"
              className="bg-primary text-on-primary px-4 py-2 rounded-lg font-title-sm shadow-sm transition-all hover:-translate-y-px active:translate-y-0">
              Get Started Free
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative z-10 pt-32">

        {/* ── Hero ── */}
        <section className="max-w-6xl mx-auto px-6 flex flex-col items-center text-center mb-32">

          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border text-label-md text-primary mb-6"
            style={{ background: "#e2e8f8", borderColor: "rgba(195,198,214,0.50)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#004ac6" stroke="none">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span>v2.0 Now with Predictive Indexing</span>
          </div>

          <h1 className="font-bold mb-4 tracking-tight"
            style={{ fontFamily: "Inter,sans-serif", fontSize: "clamp(40px,7vw,60px)", lineHeight: 1.1 }}>
            Query <span className="text-primary">Smarter</span>,{" "}<br />Not Harder
          </h1>

          <p className="text-body-lg text-on-surface-variant max-w-2xl mb-8">
            Harness the power of AI to write, optimise, and visualise SQL in seconds.
            Connect your data and let our LLMs handle the complexity of schemas and optimisations.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <Link href="/register"
              className="flex items-center gap-2 bg-primary text-on-primary px-8 py-3.5 rounded-xl font-title-lg shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-primary/20">
              Get Started Free
              <ArrowRight size={18} />
            </Link>
            <Link href="/login"
              className="bg-white border text-on-surface px-8 py-3.5 rounded-xl font-title-lg transition-all hover:bg-surface-container-low"
              style={{ borderColor: "#c3c6d7" }}>
              Sign In
            </Link>
          </div>

          {/* Floating terminal mockup */}
          <div className="w-full max-w-5xl rounded-xl border overflow-hidden shadow-2xl"
            style={{
              background: "#1e2433",
              borderColor: "rgba(255,255,255,0.10)",
              boxShadow: "0 0 40px -10px rgba(105,29,218,0.30)",
              animation: "float 6s ease-in-out infinite",
            }}>
            {/* Title bar */}
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b"
              style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.10)" }}>
              <div className="w-3 h-3 rounded-full" style={{ background: "rgba(239,68,68,0.5)" }} />
              <div className="w-3 h-3 rounded-full" style={{ background: "rgba(234,179,8,0.5)" }} />
              <div className="w-3 h-3 rounded-full" style={{ background: "rgba(34,197,94,0.5)" }} />
              <span className="ml-2 font-mono text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                workspace_prod_v2.sql
              </span>
            </div>

            <div className="flex h-80 md:h-96">
              {/* Schema sidebar */}
              <div className="hidden md:flex flex-col w-48 border-r p-4 gap-3"
                style={{ background: "rgba(0,0,0,0.20)", borderColor: "rgba(255,255,255,0.08)" }}>
                <span className="text-label-sm uppercase tracking-widest" style={{ color: "#737685" }}>Schemas</span>
                {[
                  { name: "users_table",    active: true  },
                  { name: "transaction_log", active: false },
                  { name: "metadata_v3",     active: false },
                ].map(({ name, active }) => (
                  <div key={name} className="flex items-center gap-1.5 text-sm"
                    style={{ color: active ? "#b4c5ff" : "rgba(195,198,214,0.50)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>
                    </svg>
                    {name}
                  </div>
                ))}
              </div>

              {/* Code panel */}
              <div className="flex-1 p-6 font-mono text-sm text-left overflow-auto space-y-4"
                style={{ color: "rgba(255,255,255,0.90)", fontFamily: "'JetBrains Mono','Fira Code',monospace" }}>
                {/* AI prompt */}
                <div className="flex items-start gap-3">
                  <span style={{ color: "#d2bbff" }}>AI &gt;</span>
                  <span className="italic" style={{ color: "#b4c5ff" }}>
                    &quot;Show me the top 5 users by spend in the last 30 days, grouped by region.&quot;
                  </span>
                </div>
                {/* SQL lines */}
                <div className="space-y-1">
                  {[
                    [<><span style={{color:"#818cf8"}}>SELECT</span> u.name, <span style={{color:"#60a5fa"}}>SUM</span>(t.amount) <span style={{color:"#818cf8"}}>AS</span> total_spend</>],
                    [<><span style={{color:"#f472b6"}}>FROM</span> users u</>],
                    [<><span style={{color:"#818cf8"}}>JOIN</span> transactions t <span style={{color:"#818cf8"}}>ON</span> u.id = t.user_id</>],
                    [<><span style={{color:"#f472b6"}}>WHERE</span> t.created_at &gt;= <span style={{color:"#60a5fa"}}>NOW</span>() - <span style={{color:"#60a5fa"}}>INTERVAL</span> <span style={{color:"#34d399"}}>&apos;30 days&apos;</span></>],
                    [<><span style={{color:"#818cf8"}}>GROUP BY</span> u.region, u.name</>],
                    [<><span style={{color:"#818cf8"}}>ORDER BY</span> total_spend <span style={{color:"#818cf8"}}>DESC</span></>],
                    [<><span style={{color:"#818cf8"}}>LIMIT</span> 5;</>],
                  ].map((line, i) => (
                    <div key={i} className="flex gap-4">
                      <span style={{ color: "rgba(255,255,255,0.2)", minWidth: "20px" }}>{i + 1}</span>
                      <code>{line[0]}</code>
                    </div>
                  ))}
                </div>
                {/* Optimization chip */}
                <div className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: "rgba(105,29,218,0.20)", border: "1px solid rgba(105,29,218,0.30)" }}>
                  <div className="flex items-center gap-2 text-sm" style={{ color: "#d2bbff" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#d2bbff" stroke="none">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                    </svg>
                    Query Optimised: 420ms execution time.
                  </div>
                  <button className="text-xs px-3 py-1 rounded text-white"
                    style={{ background: "rgba(105,29,218,0.60)" }}>
                    Apply Index
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Social proof ── */}
        <section className="py-8 mb-32 border-y" style={{ background: "rgba(240,243,255,0.50)", borderColor: "rgba(195,198,214,0.20)" }}>
          <div className="max-w-6xl mx-auto px-6">
            <p className="text-center text-label-md text-on-surface-variant uppercase tracking-widest mb-6">
              Trusted by engineering teams at
            </p>
            <div className="flex flex-wrap justify-center items-center gap-10 md:gap-16 grayscale opacity-50">
              {[
                { icon: "🚀", name: "VELOCITY" },
                { icon: "☁️", name: "NEBULA"   },
                { icon: "🛡️", name: "GUARDIAN" },
                { icon: "🔗", name: "CORE"      },
              ].map(({ icon, name }) => (
                <div key={name} className="flex items-center gap-2 font-headline-sm font-bold text-on-surface">
                  <span>{icon}</span>{name}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="max-w-6xl mx-auto px-6 mb-32">
          <div className="text-center mb-12">
            <h2 className="text-headline-lg font-bold text-on-surface mb-4">Built for Modern Data Stacks</h2>
            <p className="text-body-lg text-on-surface-variant max-w-2xl mx-auto">
              Everything you need to manage your database workflow without the manual grind.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title}
                className="group bg-white p-6 rounded-xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                style={{ borderColor: "rgba(195,198,214,0.50)" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "#004ac6")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(195,198,214,0.50)")}>
                <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-5 transition-all duration-300 group-hover:bg-primary"
                  style={{ background: "rgba(0,74,198,0.10)" }}>
                  <Icon size={22} className="text-primary transition-colors duration-300 group-hover:text-white" />
                </div>
                <h3 className="text-title-lg font-semibold text-on-surface mb-2">{title}</h3>
                <p className="text-body-md text-on-surface-variant">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Asymmetric: From Idea to Query ── */}
        <section id="how-it-works" className="max-w-6xl mx-auto px-6 mb-32 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Left — dark code card */}
          <div className="relative rounded-2xl overflow-hidden border shadow-2xl"
            style={{ background: "#1e2433", borderColor: "rgba(195,198,214,0.20)" }}>
            <div className="flex items-center gap-1.5 px-4 py-3 border-b"
              style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ff5f56" }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ffbd2e" }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#27c93f" }} />
              <span className="ml-2 font-mono text-xs" style={{ color: "rgba(255,255,255,0.30)" }}>analytics.sql</span>
            </div>
            <div className="p-6 font-mono text-sm space-y-1"
              style={{ fontFamily: "'JetBrains Mono','Fira Code',monospace", color: "rgba(255,255,255,0.85)" }}>
              {[
                [<><span style={{color:"#818cf8"}}>SELECT</span></>],
                [<>&nbsp;&nbsp;region_id,</>],
                [<>&nbsp;&nbsp;<span style={{color:"#60a5fa"}}>SUM</span>(revenue) <span style={{color:"#818cf8"}}>AS</span> total_sales,</>],
                [<>&nbsp;&nbsp;<span style={{color:"#60a5fa"}}>AVG</span>(attendance) <span style={{color:"#818cf8"}}>AS</span> avg_att</>],
                [<><span style={{color:"#f472b6"}}>FROM</span> sales_data.fact_sales</>],
                [<><span style={{color:"#f472b6"}}>WHERE</span> date &gt; <span style={{color:"#34d399"}}>&apos;2024-01-01&apos;</span></>],
                [<><span style={{color:"#818cf8"}}>GROUP BY</span> region_id</>],
                [<><span style={{color:"#818cf8"}}>ORDER BY</span> total_sales <span style={{color:"#818cf8"}}>DESC</span></>],
                [<><span style={{color:"#818cf8"}}>LIMIT</span> 10;</>],
              ].map((line, i) => (
                <div key={i} className="flex gap-4">
                  <span style={{ color: "rgba(255,255,255,0.20)", minWidth: "20px" }}>{i + 1}</span>
                  <code>{line[0]}</code>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-4 text-xs" style={{ color: "#34d399" }}>
                <CheckCircle size={13} />
                <span>10 rows · 87ms · success</span>
              </div>
            </div>
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: "linear-gradient(to top, rgba(0,74,198,0.15), transparent)" }} />
          </div>

          {/* Right — checklist */}
          <div className="space-y-6">
            <span className="text-primary font-label-md tracking-widest uppercase">The SmartSQL Difference</span>
            <h2 className="text-headline-lg font-bold text-on-surface leading-tight">
              From Idea to Query<br />in Milliseconds
            </h2>
            <div className="space-y-5">
              {[
                { title: "Universal Connectivity",  desc: "One-click connect for PostgreSQL, Supabase, MySQL, Snowflake, and BigQuery." },
                { title: "Team Collaboration",      desc: "Share optimised query snippets and database documentation across your team." },
                { title: "Enterprise Security",     desc: "Role-based access control with read-only enforcement — writes are blocked at the API layer." },
              ].map(({ title, desc }) => (
                <div key={title} className="flex gap-4">
                  <CheckCircle size={22} className="text-primary shrink-0 mt-0.5" fill="#004ac6" stroke="white" strokeWidth={2} />
                  <div>
                    <p className="text-title-md font-semibold text-on-surface">{title}</p>
                    <p className="text-body-md text-on-surface-variant mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section id="demo" className="max-w-6xl mx-auto px-6 mb-32">
          <div className="rounded-3xl p-10 md:p-16 text-center relative overflow-hidden"
            style={{ background: "#1e2433" }}>
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: "linear-gradient(135deg, rgba(0,74,198,0.20), rgba(105,29,218,0.20))" }} />
            <div className="relative z-10">
              <h2 className="font-bold text-white mb-4"
                style={{ fontSize: "42px", lineHeight: 1.2, fontFamily: "Inter,sans-serif" }}>
                Ready to Supercharge<br />Your Workflow?
              </h2>
              <p className="text-body-lg mb-8 max-w-xl mx-auto" style={{ color: "rgba(195,198,214,0.80)" }}>
                Join 50,000+ developers who write faster, better SQL with SmartSQL.
              </p>
              <Link href="/register"
                className="inline-flex items-center gap-2 bg-primary text-on-primary px-8 py-3.5 rounded-xl font-title-lg shadow-lg transition-all hover:-translate-y-0.5">
                Get Started for Free
                <ArrowRight size={18} />
              </Link>
              <p className="mt-4 text-label-md" style={{ color: "rgba(195,198,214,0.50)" }}>
                No credit card required · 14-day free pro trial
              </p>
            </div>
          </div>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer className="w-full py-10" style={{ background: "#1e2433", color: "rgba(195,198,214,0.70)" }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto px-6 pb-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#004ac6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
              </svg>
              <span className="text-headline-sm font-extrabold text-white">SmartSQL</span>
            </div>
            <p className="text-body-md" style={{ color: "rgba(195,198,214,0.60)" }}>
              Precision in every query. The definitive AI workspace for data professionals.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-white font-title-md mb-4">Product</h4>
            <ul className="space-y-3">
              {["Features", "Security", "Integrations", "Pricing"].map(l => (
                <li key={l}><a href="#" className="hover:text-white transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-white font-title-md mb-4">Resources</h4>
            <ul className="space-y-3">
              {["Documentation", "API Reference", "Changelog", "Community"].map(l => (
                <li key={l}><a href="#" className="hover:text-white transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-title-md mb-4">Company</h4>
            <ul className="space-y-3">
              {["About Us", "Careers", "Privacy Policy", "Terms of Service"].map(l => (
                <li key={l}><a href="#" className="hover:text-white transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4"
          style={{ borderColor: "rgba(255,255,255,0.10)" }}>
          <p className="text-body-md" style={{ color: "rgba(195,198,214,0.50)" }}>
            © 2025 SmartSQL AI. Precision in every query.
          </p>
          <div className="flex gap-6">
            {["Privacy Policy", "Terms", "Contact"].map(l => (
              <a key={l} href="#" className="text-label-md hover:text-white transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </footer>

      {/* Float keyframe */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-12px); }
        }
      `}</style>
    </div>
  )
}
