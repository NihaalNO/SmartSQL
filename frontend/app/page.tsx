"use client"
import Link from "next/link"
import { useEffect, useRef } from "react"
import {
  Database, Search, ShieldCheck, BarChart3, Zap, History,
  BookmarkCheck, ArrowRight, ChevronRight, Terminal, Sparkles,
  Brain, Lock,
} from "lucide-react"
import { isLoggedIn, isAdmin } from "@/lib/auth"
import { useRouter } from "next/navigation"

// ── Auto-redirect authenticated users ────────────────────────────────────────
function useAuthRedirect() {
  const router = useRouter()
  useEffect(() => {
    if (isLoggedIn()) router.replace(isAdmin() ? "/dashboard" : "/query")
  }, [router])
}

// ── Animated SQL typewriter ───────────────────────────────────────────────────
const DEMO_QUERIES = [
  "How many users registered this month?",
  "Show top 5 analysts by saved queries",
  "What is the query success rate today?",
  "Which roles have the most active users?",
]

function TypewriterSQL() {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    let qi = 0, ci = 0, deleting = false, timer: ReturnType<typeof setTimeout>

    function tick() {
      const q = DEMO_QUERIES[qi]
      if (!ref.current) return
      if (!deleting) {
        ref.current.textContent = q.slice(0, ci + 1)
        ci++
        if (ci === q.length) { deleting = true; timer = setTimeout(tick, 1800); return }
      } else {
        ref.current.textContent = q.slice(0, ci - 1)
        ci--
        if (ci === 0) { deleting = false; qi = (qi + 1) % DEMO_QUERIES.length }
      }
      timer = setTimeout(tick, deleting ? 28 : 55)
    }
    timer = setTimeout(tick, 400)
    return () => clearTimeout(timer)
  }, [])
  return <span ref={ref} />
}

// ── Data ─────────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: <Brain size={22} />,
    title: "Natural Language Queries",
    desc: "Type questions in plain English. Our LangChain AI layer converts them to accurate SQL instantly — no syntax knowledge required.",
    color: "from-violet-500 to-purple-600",
    bg: "bg-violet-50",
    text: "text-violet-600",
  },
  {
    icon: <ShieldCheck size={22} />,
    title: "Read-Only Safety Guard",
    desc: "Every generated query is validated before execution. Only SELECT statements run — INSERT, DROP, and ALTER are blocked at the API layer.",
    color: "from-emerald-500 to-green-600",
    bg: "bg-emerald-50",
    text: "text-emerald-600",
  },
  {
    icon: <BarChart3 size={22} />,
    title: "Instant Visualisations",
    desc: "Results render as bar, line, area, or pie charts automatically. Export any result set to CSV in one click.",
    color: "from-blue-500 to-cyan-600",
    bg: "bg-blue-50",
    text: "text-blue-600",
  },
  {
    icon: <Zap size={22} />,
    title: "Live DB Mode",
    desc: "Connect your Supabase database for an ephemeral session. Credentials are held only in memory — never stored, vanish on reload.",
    color: "from-amber-500 to-orange-500",
    bg: "bg-amber-50",
    text: "text-amber-600",
  },
  {
    icon: <BookmarkCheck size={22} />,
    title: "Save & Reuse Reports",
    desc: "Bookmark any query as a saved report. Favourite the ones you run daily and replay them in one click.",
    color: "from-pink-500 to-rose-500",
    bg: "bg-pink-50",
    text: "text-pink-600",
  },
  {
    icon: <Lock size={22} />,
    title: "Role-Based Access",
    desc: "Admin, Analyst, and Viewer roles each see only what they need. Access is enforced at both the API and UI layers.",
    color: "from-slate-500 to-gray-600",
    bg: "bg-slate-50",
    text: "text-slate-600",
  },
]

const STEPS = [
  {
    num: "01",
    title: "Ask your question",
    desc: "Type any business question in plain English inside the Query interface. Choose your AI provider — Groq, Gemini, or a local Ollama model.",
    code: `"Which users have the most saved queries this week?"`,
  },
  {
    num: "02",
    title: "Review the generated SQL",
    desc: "SmartSQL shows the exact SQL it plans to run before executing. Inspect, copy, or reject it before a single row is touched.",
    code: `SELECT u.full_name, COUNT(sq.id) AS saved\nFROM users u\nJOIN saved_queries sq ON sq.user_id = u.id\nWHERE sq.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)\nGROUP BY u.id ORDER BY saved DESC LIMIT 10;`,
  },
  {
    num: "03",
    title: "Explore results & insights",
    desc: "Data lands as an interactive table with pagination and CSV export. An AI-generated insight summarises patterns for you automatically.",
    code: `✦ Insight: User "Nihaal" saved 12 queries — 3× the team average. Peak activity was on Tuesday.`,
  },
]

const PROVIDERS = [
  { name: "Groq", badge: "Fastest", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { name: "Gemini", badge: "Multimodal", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { name: "Ollama", badge: "Local / Private", color: "bg-green-100 text-green-700 border-green-200" },
]

const DEMO_CREDS = [
  { role: "Admin", email: "admin@smartsql.com", password: "admin123", color: "border-red-200 bg-red-50", badge: "bg-red-100 text-red-700" },
  { role: "Analyst", email: "analyst@smartsql.com", password: "analyst123", color: "border-blue-200 bg-blue-50", badge: "bg-blue-100 text-blue-700" },
  { role: "Viewer", email: "viewer@smartsql.com", password: "viewer123", color: "border-gray-200 bg-gray-50", badge: "bg-gray-100 text-gray-700" },
]

// ── Page ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  useAuthRedirect()

  return (
    <div className="min-h-screen bg-white text-gray-900 font-[Inter,sans-serif]">

      {/* ── Navbar ── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
              <Database size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">SmartSQL</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-gray-500">
            <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-gray-900 transition-colors">How it works</a>
            <a href="#demo" className="hover:text-gray-900 transition-colors">Try it</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Sign in
            </Link>
            <Link href="/register" className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              Get started <ChevronRight size={15} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        {/* background blobs */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-br from-blue-100 via-violet-50 to-transparent rounded-full blur-3xl opacity-60" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gradient-to-tl from-cyan-100 to-transparent rounded-full blur-3xl opacity-40" />
        </div>

        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-blue-700 text-xs font-semibold mb-6">
            <Sparkles size={12} />
            Powered by LangChain · Groq · Gemini · Ollama
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6">
            Query your database
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-cyan-500 bg-clip-text text-transparent">
              in plain English
            </span>
          </h1>

          <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            SmartSQL converts natural language into safe, validated SQL — then returns results as tables, charts, and AI-generated insights. No SQL knowledge required.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/register" className="flex items-center gap-2 px-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-200 transition-all hover:shadow-blue-300 hover:-translate-y-0.5">
              Start querying free
              <ArrowRight size={17} />
            </Link>
            <Link href="/login" className="flex items-center gap-2 px-7 py-3.5 border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all">
              Sign in
            </Link>
          </div>

          {/* Typewriter demo box */}
          <div className="relative max-w-2xl mx-auto">
            <div className="bg-gray-900 rounded-2xl shadow-2xl shadow-gray-300/50 overflow-hidden border border-gray-800">
              {/* window chrome */}
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-gray-800">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
                <span className="ml-3 text-xs text-gray-500 font-mono">SmartSQL Query Interface</span>
              </div>

              <div className="p-5 space-y-4">
                {/* NL input */}
                <div className="flex items-start gap-3">
                  <span className="text-blue-400 font-mono text-sm mt-0.5">›</span>
                  <p className="text-gray-100 font-mono text-sm leading-relaxed min-h-[1.5rem]">
                    <TypewriterSQL />
                    <span className="animate-pulse text-blue-400">|</span>
                  </p>
                </div>

                {/* Generated SQL */}
                <div className="bg-gray-800/60 rounded-lg p-4 border border-gray-700">
                  <p className="text-xs text-gray-500 mb-2 font-mono uppercase tracking-wider">Generated SQL</p>
                  <code className="text-green-400 font-mono text-xs leading-6">
                    <span className="text-blue-400">SELECT</span> u.full_name,{" "}
                    <span className="text-yellow-400">COUNT</span>(sq.id) <span className="text-blue-400">AS</span> total
                    <br />
                    <span className="text-blue-400">FROM</span> users u
                    <br />
                    <span className="text-blue-400">JOIN</span> saved_queries sq <span className="text-blue-400">ON</span> sq.user_id = u.id
                    <br />
                    <span className="text-blue-400">GROUP BY</span> u.id{" "}
                    <span className="text-blue-400">ORDER BY</span> total <span className="text-blue-400">DESC</span>{" "}
                    <span className="text-blue-400">LIMIT</span> <span className="text-orange-400">5</span>;
                  </code>
                </div>

                {/* Result row */}
                <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Executed in 42ms · 5 rows returned
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section className="border-y border-gray-100 bg-gray-50/60">
        <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "3", label: "AI Providers" },
            { value: "100%", label: "Read-only safe" },
            { value: "3", label: "Role levels" },
            { value: "0", label: "SQL knowledge needed" },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="text-3xl font-extrabold text-gray-900 tracking-tight">{value}</p>
              <p className="text-sm text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-3">Features</p>
          <h2 className="text-4xl font-bold tracking-tight">Everything you need for self-serve analytics</h2>
          <p className="text-gray-500 mt-4 max-w-xl mx-auto">From question to chart in seconds — no SQL, no waiting, no analysts as middlemen.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(({ icon, title, desc, bg, text }) => (
            <div key={title} className="group relative bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg hover:border-gray-300 transition-all duration-200">
              <div className={`w-10 h-10 ${bg} ${text} rounded-xl flex items-center justify-center mb-4`}>
                {icon}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-24 bg-gray-950 text-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-blue-400 font-semibold text-sm uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-4xl font-bold tracking-tight">Three steps from question to insight</h2>
          </div>

          <div className="space-y-8">
            {STEPS.map(({ num, title, desc, code }, i) => (
              <div key={num} className="grid md:grid-cols-2 gap-6 items-center">
                <div className={i % 2 === 1 ? "md:order-2" : ""}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-4xl font-black text-blue-500/30 leading-none">{num}</span>
                    <h3 className="text-xl font-bold">{title}</h3>
                  </div>
                  <p className="text-gray-400 leading-relaxed">{desc}</p>
                </div>
                <div className={`${i % 2 === 1 ? "md:order-1" : ""}`}>
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <div className="flex items-center gap-1.5 mb-3">
                      <Terminal size={13} className="text-gray-500" />
                      <span className="text-xs text-gray-500 font-mono">Step {num}</span>
                    </div>
                    <pre className="text-green-400 font-mono text-xs leading-6 whitespace-pre-wrap">{code}</pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Providers ── */}
      <section className="py-20 max-w-5xl mx-auto px-6 text-center">
        <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-3">Flexible AI backend</p>
        <h2 className="text-3xl font-bold tracking-tight mb-4">Choose your model provider</h2>
        <p className="text-gray-500 max-w-lg mx-auto mb-10">Switch between cloud-hosted and local models without changing a single line of code.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {PROVIDERS.map(({ name, badge, color }) => (
            <div key={name} className={`flex items-center gap-3 px-6 py-4 rounded-2xl border ${color} bg-white`}>
              <span className="font-bold text-lg">{name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${color}`}>{badge}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Demo credentials ── */}
      <section id="demo" className="py-20 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-3">Try it now</p>
          <h2 className="text-3xl font-bold tracking-tight mb-3">Demo credentials</h2>
          <p className="text-gray-500 mb-10">Use any of these accounts to explore SmartSQL right now — no sign-up required.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            {DEMO_CREDS.map(({ role, email, password, color, badge }) => (
              <div key={role} className={`rounded-2xl border ${color} p-5 text-left`}>
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${badge}`}>{role}</span>
                </div>
                <div className="space-y-2 font-mono text-sm">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Email</p>
                    <p className="text-gray-800 font-medium break-all">{email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Password</p>
                    <p className="text-gray-800 font-medium">{password}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Link href="/login" className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5">
            Sign in and start querying
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
              <Database size={14} className="text-white" />
            </div>
            <span className="font-bold text-gray-900">SmartSQL</span>
            <span className="text-gray-400 text-sm">· Text-to-SQL Analytics Portal</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <Link href="/login" className="hover:text-gray-600 transition-colors">Sign in</Link>
            <Link href="/register" className="hover:text-gray-600 transition-colors">Register</Link>
            <span>Built with FastAPI · Next.js · LangChain</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
