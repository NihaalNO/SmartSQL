"use client"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"

// ---------------------------------------------------------------------------
// SQL code highlighting helper
// ---------------------------------------------------------------------------

function SqlLine({ tokens }: { tokens: { text: string; color: string }[] }) {
  return (
    <div className="flex items-center gap-4">
      {tokens.map((t, i) => (
        <span key={i} style={{ color: t.color }}>{t.text}</span>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Data constants
// ---------------------------------------------------------------------------

const NAV_ITEMS = ["Features", "Docs", "Pricing"]

const WORKFLOW_STEPS = [
  {
    number: "01",
    title: "Connect & Discover",
    desc: "Point SmartSQL at your database. Schema, relationships, and indexes are auto-discovered in seconds.",
    detail: "PostgreSQL, MySQL, Supabase, Snowflake, BigQuery",
  },
  {
    number: "02",
    title: "Describe in English",
    desc: "Type your question naturally. SmartSQL maps your intent to your schema and generates accurate SQL.",
    detail: "Handles complex joins, aggregations, subqueries, window functions",
  },
  {
    number: "03",
    title: "Review & Execute",
    desc: "Inspect the generated SQL, view optimization suggestions, and execute with one click. Results in milliseconds.",
    detail: "Auto-optimized, read-only enforced, results visualized automatically",
  },
]

const OPTIMIZATION_BENCHMARKS = [
  { label: "Query Generation", before: "15–30 min", after: "< 3 sec" },
  { label: "Execution Time",   before: "4.2 sec",   after: "340 ms" },
  { label: "Rows Scanned",     before: "2.4M",      after: "48K" },
  { label: "Optimization Effort", before: "Manual",  after: "Automated" },
]

const INTEGRATIONS = [
  { name: "PostgreSQL",    color: "#336791" },
  { name: "MySQL",         color: "#4479A1" },
  { name: "Supabase",      color: "#3ECF8E" },
  { name: "Snowflake",     color: "#56B9F2" },
  { name: "BigQuery",      color: "#4285F4" },
  { name: "SQL Server",    color: "#CC2927" },
  { name: "SQLite",        color: "#003B57" },
  { name: "Amazon RDS",    color: "#FF9900" },
]

const SECURITY_FEATURES = [
  { title: "Read-Only Enforcement", desc: "Write operations are blocked at the API layer. Your data cannot be modified." },
  { title: "Role-Based Access",     desc: "Admin, analyst, and viewer roles with granular permission controls." },
  { title: "Audit Trail",           desc: "Every query is logged with user identity, timestamp, and execution result." },
  { title: "Data Encryption",       desc: "All connections use TLS 1.3. Query results are never cached to disk." },
]

const TESTIMONIALS = [
  {
    quote: "We cut our data onboarding from two weeks to two days. New analysts write production queries on their first shift.",
    author: "Ravi Chandran",
    role: "VP of Data, Sift Healthcare",
  },
  {
    quote: "The schema-aware generation is what sets this apart. It actually understands our 200-table warehouse — joins, keys, everything.",
    author: "Megan Stahl",
    role: "Staff Engineer, Rutter",
  },
  {
    quote: "We evaluated six text-to-SQL tools. SmartSQL was the only one that passed our security review and generated correct joins.",
    author: "Tomislav Horvat",
    role: "CTO, Orbital Insights",
  },
]

const FOOTER_LINKS = [
  { heading: "Product",   links: ["Features", "Integrations", "Security", "Changelog"] },
  { heading: "Resources", links: ["Documentation", "API Reference", "Status", "Community"] },
  { heading: "Company",   links: ["About", "Blog", "Careers", "Contact"] },
]

// ---------------------------------------------------------------------------
// Navbar
// ---------------------------------------------------------------------------

function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{ background: scrolled ? "rgba(5,8,22,0.92)" : "transparent", backdropFilter: scrolled ? "blur(16px)" : "none" }}>
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
        <Link href="/" className="flex items-center gap-2.5 group cursor-pointer">
          <div className="w-7 h-7 rounded-md flex items-center justify-center bg-[#14B8A6] group-hover:shadow-[0_0_16px_rgba(20,184,166,0.35)] transition-shadow duration-300">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
            </svg>
          </div>
          <span className="text-sm font-semibold text-[#F8FAFC]">SmartSQL</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map(item => (
            <a key={item} href={`#${item.toLowerCase()}`}
              className="px-3 py-1.5 text-sm text-[#94A3B8] hover:text-[#F8FAFC] transition-colors rounded-md hover:bg-white/[0.04] cursor-pointer">
              {item}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login"
            className="text-sm text-[#94A3B8] hover:text-[#F8FAFC] transition-colors px-3 py-1.5 cursor-pointer">
            Sign In
          </Link>
          <Link href="/register"
            className="text-sm font-medium px-4 py-2 rounded-lg text-white transition-all duration-200 cursor-pointer"
            style={{ background: "#14B8A6" }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 20px rgba(20,184,166,0.35)" }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "none" }}>
            Get Started
          </Link>
        </div>
      </nav>
    </header>
  )
}

// ---------------------------------------------------------------------------
// Schema graph (inline SVG)
// ---------------------------------------------------------------------------

function SchemaGraph() {
  const tables = [
    { name: "users", x: 30, y: 20, cols: ["id (PK)", "name", "email", "region", "created_at"] },
    { name: "transactions", x: 220, y: 36, cols: ["id (PK)", "user_id (FK)", "amount", "type", "created_at"] },
    { name: "products", x: 120, y: 100, cols: ["id (PK)", "name", "category", "price"] },
  ]

  return (
    <svg viewBox="0 0 360 150" className="w-full h-auto" style={{ maxHeight: "160px" }}>
      <defs>
        <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
          <polygon points="0 0, 6 2, 0 4" fill="rgba(20,184,166,0.4)" />
        </marker>
      </defs>
      {tables.map((t, ti) => (
        <g key={t.name}>
          <rect x={t.x} y={t.y} width={100} height={20 + t.cols.length * 12} rx={4} fill="rgba(20,184,166,0.08)" stroke="rgba(20,184,166,0.2)" strokeWidth={0.5} />
          <text x={t.x + 50} y={t.y + 14} textAnchor="middle" fill="#14B8A6" fontSize={6} fontWeight={600} fontFamily="monospace">{t.name}</text>
          {t.cols.map((col, ci) => (
            <text key={ci} x={t.x + 6} y={t.y + 28 + ci * 12} fill={col.includes("PK") ? "#22D3EE" : col.includes("FK") ? "#F59E0B" : "rgba(148,163,184,0.7)"} fontSize={5} fontFamily="monospace">
              {col}
            </text>
          ))}
        </g>
      ))}
      <line x1={130} y1={30} x2={218} y2={46} stroke="rgba(20,184,166,0.25)" strokeWidth={0.5} markerEnd="url(#arrowhead)" strokeDasharray="2,2" />
      <line x1={82} y1={78} x2={140} y2={108} stroke="rgba(20,184,166,0.25)" strokeWidth={0.5} markerEnd="url(#arrowhead)" strokeDasharray="2,2" />
      <line x1={218} y1={85} x2={195} y2={108} stroke="rgba(20,184,166,0.25)" strokeWidth={0.5} markerEnd="url(#arrowhead)" strokeDasharray="2,2" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Product Mockup (hero centerpiece)
// ---------------------------------------------------------------------------

function ProductMockup() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setStep(s => (s + 1) % 3), 2500)
    return () => clearInterval(t)
  }, [])

  const naturalLanguage = [
    "Show me monthly revenue by region for 2024, including the top 3 product categories per region.",
    "Which customers in the EU had >$10K in transactions last quarter, and what was their preferred payment method?",
    "Compare week-over-week user growth across mobile and desktop platforms for the last 90 days.",
  ]

  const generatedSQL = [
    [
      { text: "SELECT",     color: "#818cf8" },
      { text: "  DATE_TRUNC('month', t.created_at) AS month,", color: "rgba(248,250,252,0.85)" },
    ],
    [
      { text: "", color: "rgba(248,250,252,0.85)" },
      { text: "  u.region,", color: "rgba(248,250,252,0.85)" },
    ],
    [
      { text: "", color: "rgba(248,250,252,0.85)" },
      { text: "  SUM(t.amount) AS revenue,", color: "rgba(248,250,252,0.85)" },
    ],
    [
      { text: "", color: "rgba(248,250,252,0.85)" },
      { text: "  p.category", color: "rgba(248,250,252,0.85)" },
    ],
    [
      { text: "FROM", color: "#f472b6" },
      { text: "  transactions t", color: "rgba(248,250,252,0.85)" },
    ],
    [
      { text: "JOIN", color: "#818cf8" },
      { text: "  users u ON t.user_id = u.id", color: "rgba(248,250,252,0.85)" },
    ],
    [
      { text: "JOIN", color: "#818cf8" },
      { text: "  products p ON t.product_id = p.id", color: "rgba(248,250,252,0.85)" },
    ],
    [
      { text: "WHERE", color: "#f472b6" },
      { text: "  t.created_at BETWEEN '2024-01-01' AND '2024-12-31'", color: "#34d399" },
    ],
    [
      { text: "GROUP BY", color: "#818cf8" },
      { text: "  month, u.region, p.category", color: "rgba(248,250,252,0.85)" },
    ],
    [
      { text: "ORDER BY", color: "#818cf8" },
      { text: "  revenue DESC", color: "rgba(248,250,252,0.85)" },
    ],
    [
      { text: "LIMIT", color: "#818cf8" },
      { text: "  25;", color: "rgba(248,250,252,0.85)" },
    ],
  ]

  return (
    <div className="rounded-xl overflow-hidden border" style={{ background: "#0A1020", borderColor: "rgba(148,163,184,0.08)" }}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(148,163,184,0.06)" }}>
        <div className="flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          <span className="text-xs font-medium text-[#64748B]">SmartSQL Query Editor</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px]" style={{ background: "rgba(20,184,166,0.12)" }}>
            <div className="w-1.5 h-1.5 rounded-full bg-[#14B8A6]" />
            <span className="text-[#14B8A6] font-medium">Connected</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row">
        <div className="hidden md:flex flex-col w-44 border-r p-3 gap-2" style={{ background: "rgba(0,0,0,0.25)", borderColor: "rgba(148,163,184,0.06)" }}>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">Schema</span>
          {["users (12 cols)", "transactions (8 cols)", "products (6 cols)", "regions (4 cols)", "categories (3 cols)"].map((t, i) => (
            <div key={t}
              className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-md cursor-pointer transition-all"
              style={{
                color: i === 0 ? "#F8FAFC" : "rgba(148,163,184,0.5)",
                background: i === 0 ? "rgba(20,184,166,0.1)" : "transparent",
              }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>
              <span className="truncate">{t}</span>
            </div>
          ))}
        </div>

        <div className="flex-1 p-4 space-y-3 min-h-[320px]">
          <div className="flex items-start gap-2.5">
            <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold text-[#14B8A6]" style={{ background: "rgba(20,184,166,0.12)" }}>NL</span>
            <div className="text-xs leading-relaxed text-[#94A3B8] italic transition-all duration-500">
              {naturalLanguage[step]}
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold text-[#818cf8]" style={{ background: "rgba(129,140,248,0.12)" }}>SQL</span>
            <div className="flex-1 font-mono text-[11px] leading-relaxed space-y-0.5 overflow-x-auto">
              {generatedSQL.map((line, i) => (
                <div key={i} className="flex whitespace-nowrap">
                  <span className="text-[#64748B] w-5 shrink-0 text-right">{i + 1}</span>
                  <div className="flex gap-0.5">{line.map((t, j) => <span key={j} style={{ color: t.color }}>{t.text}</span>)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 text-[10px]">
              <span className="px-2 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.12)", color: "#22C55E" }}>12 rows · 87ms</span>
              <span className="text-[#64748B]">·</span>
              <span className="text-[#64748B]">Index suggestion: composite idx_users_region_created</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-medium text-[#F8FAFC] cursor-pointer transition-all hover:opacity-80"
                style={{ background: "linear-gradient(135deg, #14B8A6, #0D9488)" }}>Run</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium text-[#64748B] border border-[rgba(148,163,184,0.15)] cursor-pointer hover:text-[#F8FAFC] transition-all">Optimize</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Metric badge
// ---------------------------------------------------------------------------

function MetricBadge({ value, label, accent = "#14B8A6" }: { value: string; label: string; accent?: string }) {
  return (
    <div className="text-center p-4 rounded-lg border" style={{ borderColor: "rgba(148,163,184,0.08)", background: "rgba(255,255,255,0.02)" }}>
      <div className="text-xl font-bold font-mono" style={{ color: accent }}>{value}</div>
      <div className="text-xs text-[#64748B] mt-1">{label}</div>
    </div>
  )
}
// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function HomePage() {
  return (
    <div style={{ background: "#050816", color: "#F8FAFC", fontFamily: "Fira Sans, system-ui, sans-serif" }}>
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap");
        h1, h2, h3, h4, h5, h6, .font-mono { font-family: "Fira Code", monospace; }
        body { font-family: "Fira Sans", system-ui, sans-serif; }
      `}</style>

      <Navbar />

      <main>

        {/* ── Hero ── */}
        <section className="relative pt-28 pb-20 md:pt-36 md:pb-28 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "radial-gradient(ellipse 70% 50% at 50% 20%, rgba(20,184,166,0.06), transparent 60%)",
          }} />
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(148,163,184,0.06) 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }} />

          <div className="relative max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium"
                  style={{ background: "rgba(20,184,166,0.08)", border: "1px solid rgba(20,184,166,0.15)", color: "#14B8A6" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                  Schema-aware AI · v2.4
                </div>

                <h1 className="text-[clamp(28px,4.5vw,52px)] font-bold leading-[1.08] tracking-tight" style={{ fontFamily: "'Fira Code', monospace" }}>
                  Generate production-ready<br />
                  <span style={{ color: "#14B8A6" }}>SQL from plain English</span>
                </h1>

                <p className="text-[15px] leading-relaxed max-w-lg" style={{ color: "#94A3B8" }}>
                  SmartSQL understands your database schema, generates optimized queries, and visualizes results — all from natural language. No more context-switching between docs, editors, and dashboards.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link href="/register"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white transition-all duration-200"
                    style={{ background: "linear-gradient(135deg, #14B8A6, #0D9488)" }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 30px rgba(20,184,166,0.35)" }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = "none" }}>
                    Start Shipping SQL
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </Link>
                  <Link href="/login"
                    className="px-6 py-3 rounded-lg text-sm font-medium border transition-all duration-200 cursor-pointer"
                    style={{ borderColor: "rgba(148,163,184,0.15)", color: "#94A3B8" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(148,163,184,0.3)"; e.currentTarget.style.color = "#F8FAFC" }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(148,163,184,0.15)"; e.currentTarget.style.color = "#94A3B8" }}>
                    Live Demo →
                  </Link>
                </div>

                <div className="flex items-center gap-4 pt-2 text-xs" style={{ color: "#64748B" }}>
                  <span className="flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#22C55E" stroke="none"><circle cx="12" cy="12" r="10"/></svg>
                    No credit card
                  </span>
                  <span className="flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#22C55E" stroke="none"><circle cx="12" cy="12" r="10"/></svg>
                    14-day free trial
                  </span>
                  <span className="flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#22C55E" stroke="none"><circle cx="12" cy="12" r="10"/></svg>
                    Cancel anytime
                  </span>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -inset-4 rounded-2xl pointer-events-none" style={{
                  background: "linear-gradient(135deg, rgba(20,184,166,0.08), transparent 50%, rgba(96,165,250,0.08))",
                }} />
                <ProductMockup />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-16 max-w-3xl mx-auto lg:mx-0">
              <MetricBadge value="50K+" label="Active developers" accent="#14B8A6" />
              <MetricBadge value="10M+" label="Queries generated" accent="#22D3EE" />
              <MetricBadge value="99.9%" label="Query accuracy" accent="#60A5FA" />
              <MetricBadge value="87ms" label="Avg. generation" accent="#22C55E" />
            </div>
          </div>
        </section>

        {/* ── Workflow ── */}
        <section id="features" className="py-20 md:py-28" style={{ background: "#0A1020" }}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="max-w-2xl mb-16">
              <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#14B8A6" }}>Workflow</span>
              <h2 className="text-[clamp(24px,3vw,36px)] font-bold mt-3 leading-tight" style={{ fontFamily: "'Fira Code', monospace" }}>
                From question to query<br />in three steps
              </h2>
              <p className="mt-3 text-sm leading-relaxed max-w-lg" style={{ color: "#94A3B8" }}>
                SmartSQL eliminates the gap between asking a question and getting results. No more writing joins, debugging syntax, or switching between tools.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {WORKFLOW_STEPS.map((step, i) => (
                <div key={step.number}
                  className="relative rounded-xl p-6 border transition-all duration-300 hover:-translate-y-0.5"
                  style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(148,163,184,0.08)" }}>
                  <div className="text-3xl font-bold font-mono mb-4" style={{ color: "rgba(20,184,166,0.2)" }}>{step.number}</div>
                  {i < 2 && (
                    <div className="hidden md:block absolute top-8 -right-4" style={{ color: "rgba(148,163,184,0.15)" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="9 18 15 12 9 6"/></svg>
                    </div>
                  )}
                  <h3 className="text-base font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm leading-relaxed mb-3" style={{ color: "#94A3B8" }}>{step.desc}</p>
                  <p className="text-xs font-mono" style={{ color: "#64748B" }}>{step.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Schema Intelligence ── */}
        <section className="py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <div className="space-y-5">
                <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#22D3EE" }}>Schema Intelligence</span>
                <h2 className="text-[clamp(24px,3vw,36px)] font-bold leading-tight" style={{ fontFamily: "'Fira Code', monospace" }}>
                  Your database,<br />understood instantly
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: "#94A3B8" }}>
                  Connect once. SmartSQL introspects your schema — tables, columns, types, relationships, indexes, and foreign keys — and builds a live map of your data. Every query is generated with full awareness of your schema.
                </p>
                <ul className="space-y-2.5">
                  {[
                    "Auto-discovers tables, views, and materialized views",
                    "Maps foreign key relationships for correct JOIN generation",
                    "Identifies indexed columns for query optimization",
                    "Detects enum types, composite types, and custom domains",
                    "Updates automatically when schema changes",
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2.5 text-sm" style={{ color: "#94A3B8" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="2" className="shrink-0 mt-0.5"><polyline points="20 6 9 17 4 12"/></svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative">
                <div className="absolute -inset-4 rounded-2xl pointer-events-none" style={{
                  background: "radial-gradient(ellipse at 50% 50%, rgba(20,184,166,0.06), transparent 70%)",
                }} />
                <div className="relative rounded-xl p-5 border" style={{ background: "#0A1020", borderColor: "rgba(148,163,184,0.08)" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                    <span className="text-xs font-semibold text-[#F8FAFC]">Schema Map — Detected Relationships</span>
                  </div>
                  <SchemaGraph />
                  <div className="flex items-center gap-4 mt-3 text-[10px] font-mono" style={{ color: "#64748B" }}>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#22D3EE]" /> Primary keys</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#F59E0B]" /> Foreign keys</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#14B8A6]" /> Relations</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Query Optimization Engine ── */}
        <section className="py-20 md:py-28" style={{ background: "#0A1020" }}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#60A5FA" }}>Query Optimization</span>
              <h2 className="text-[clamp(24px,3vw,36px)] font-bold mt-3 leading-tight" style={{ fontFamily: "'Fira Code', monospace" }}>
                Reduce query time by 90%
              </h2>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: "#94A3B8" }}>
                SmartSQL analyzes query patterns, suggests missing indexes, rewrites slow subqueries, and applies optimization rules automatically — before you hit execute.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
              <div className="rounded-xl p-5 border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(148,163,184,0.08)" }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold" style={{ color: "#EF4444" }}>Before Optimization</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444" }}>4.2s execution</span>
                </div>
                <div className="font-mono text-[11px] leading-relaxed space-y-0.5" style={{ color: "rgba(248,250,252,0.7)" }}>
                  <div><span style={{color:"#818cf8"}}>SELECT</span> *</div>
                  <div><span style={{color:"#f472b6"}}>FROM</span> orders o</div>
                  <div><span style={{color:"#f472b6"}}>WHERE</span> o.status = 'pending'</div>
                  <div><span style={{color:"#f472b6"}}>AND</span> o.created_at &gt; NOW() - <span style={{color:"#34d399"}}>'7 days'::interval</span></div>
                </div>
                <div className="flex items-center gap-2 mt-3 text-[10px]" style={{ color: "#64748B" }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  Sequential scan on orders (2.4M rows)
                </div>
              </div>

              <div className="rounded-xl p-5 border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(20,184,166,0.15)" }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold" style={{ color: "#22C55E" }}>After SmartSQL Optimization</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.1)", color: "#22C55E" }}>340ms execution</span>
                </div>
                <div className="font-mono text-[11px] leading-relaxed space-y-0.5" style={{ color: "rgba(248,250,252,0.7)" }}>
                  <div><span style={{color:"#818cf8"}}>SELECT</span> o.id, o.total, o.status</div>
                  <div><span style={{color:"#f472b6"}}>FROM</span> orders o <span style={{color:"#818cf8"}}>WITH</span> (INDEX(idx_orders_status_created))</div>
                  <div><span style={{color:"#f472b6"}}>WHERE</span> o.status = 'pending'</div>
                  <div><span style={{color:"#f472b6"}}>AND</span> o.created_at &gt; NOW() - <span style={{color:"#34d399"}}>'7 days'::interval</span></div>
                </div>
                <div className="flex items-center gap-2 mt-3 text-[10px]" style={{ color: "#22C55E" }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  Index scan using idx_orders_status_created (48K rows)
                </div>
              </div>
            </div>

            <div className="max-w-3xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-xl overflow-hidden border" style={{ borderColor: "rgba(148,163,184,0.08)" }}>
                {OPTIMIZATION_BENCHMARKS.map(b => (
                  <div key={b.label} className="p-4 text-center" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <div className="text-[10px] font-medium mb-2" style={{ color: "#64748B" }}>{b.label}</div>
                    <div className="flex items-center justify-center gap-2 text-xs">
                      <span className="font-mono" style={{ color: "#EF4444" }}>{b.before}</span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                      <span className="font-mono font-semibold" style={{ color: "#22C55E" }}>{b.after}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Integrations ── */}
        <section id="pricing" className="py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#14B8A6" }}>Integrations</span>
              <h2 className="text-[clamp(24px,3vw,36px)] font-bold mt-3 leading-tight" style={{ fontFamily: "'Fira Code', monospace" }}>
                Works with your existing stack
              </h2>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: "#94A3B8" }}>
                Connect to any PostgreSQL-compatible database or major SQL warehouse. No agents, no middleware, no data migration.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-4">
              {INTEGRATIONS.map(db => (
                <div key={db.name}
                  className="flex items-center gap-2.5 px-4 py-3 rounded-lg border text-sm font-medium transition-all duration-200 cursor-default"
                  style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(148,163,184,0.08)", color: "#94A3B8" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${db.color}40`; e.currentTarget.style.color = "#F8FAFC"; e.currentTarget.style.background = `${db.color}10` }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(148,163,184,0.08)"; e.currentTarget.style.color = "#94A3B8"; e.currentTarget.style.background = "rgba(255,255,255,0.02)" }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: db.color }} />
                  {db.name}
                </div>
              ))}
            </div>

            <div className="text-center mt-8">
              <p className="text-xs" style={{ color: "#64748B" }}>
                More connectors added monthly · Custom integrations available for enterprise
              </p>
            </div>
          </div>
        </section>

        {/* ── Enterprise Security ── */}
        <section className="py-20 md:py-28" style={{ background: "#0A1020" }}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
              <div className="space-y-5">
                <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#22C55E" }}>Security</span>
                <h2 className="text-[clamp(24px,3vw,36px)] font-bold leading-tight" style={{ fontFamily: "'Fira Code', monospace" }}>
                  Enterprise-grade,<br />zero-compromise
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: "#94A3B8" }}>
                  SmartSQL is built for regulated environments from day one. Read-only enforcement at the API layer, role-based access with granular permissions, and a complete audit trail for every query.
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  {["SOC 2 (in progress)", "GDPR compliant", "Data never cached", "TLS 1.3", "Row-level security"].map(tag => (
                    <span key={tag} className="text-[10px] font-medium px-2 py-1 rounded" style={{ background: "rgba(148,163,184,0.06)", color: "#64748B", border: "1px solid rgba(148,163,184,0.06)" }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {SECURITY_FEATURES.map(f => (
                  <div key={f.title} className="p-4 rounded-lg border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(148,163,184,0.08)" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      <h3 className="text-sm font-semibold">{f.title}</h3>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: "#94A3B8" }}>{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Testimonials ── */}
        <section className="py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#22D3EE" }}>Trusted by engineering teams</span>
              <h2 className="text-[clamp(24px,3vw,36px)] font-bold mt-3 leading-tight" style={{ fontFamily: "'Fira Code', monospace" }}>
                Used by data teams that<br />demand correctness
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {TESTIMONIALS.map(t => (
                <div key={t.author}
                  className="p-6 rounded-xl border transition-all duration-300"
                  style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(148,163,184,0.08)" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(20,184,166,0.2)"; e.currentTarget.style.background = "rgba(20,184,166,0.03)" }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(148,163,184,0.08)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="rgba(148,163,184,0.15)" stroke="none" className="mb-3"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151C7.546 6.068 5.983 8.789 5.983 11H10v10H0z"/></svg>
                  <blockquote className="text-sm leading-relaxed mb-5" style={{ color: "#CBD5E1" }}>
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                  <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: "rgba(148,163,184,0.06)" }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-[#14B8A6]">
                      {t.author.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <div className="text-xs font-semibold">{t.author}</div>
                      <div className="text-[10px]" style={{ color: "#64748B" }}>{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-20 md:py-28" style={{ background: "#0A1020" }}>
          <div className="max-w-3xl mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6"
              style={{ background: "rgba(20,184,166,0.08)", border: "1px solid rgba(20,184,166,0.15)", color: "#14B8A6" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Start shipping better SQL in under 60 seconds
            </div>

            <h2 className="text-[clamp(28px,4vw,44px)] font-bold leading-tight mb-4" style={{ fontFamily: "'Fira Code', monospace" }}>
              Write faster, better SQL<br />
              <span style={{ color: "#14B8A6" }}>starting today</span>
            </h2>

            <p className="text-sm mb-8 max-w-lg mx-auto" style={{ color: "#94A3B8" }}>
              Join 50,000 developers who have stopped context-switching between schema docs, query editors, and dashboards. SmartSQL is the only tool you need.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/register"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg text-sm font-semibold text-white transition-all duration-200"
                style={{ background: "linear-gradient(135deg, #14B8A6, #0D9488)" }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 30px rgba(20,184,166,0.35)" }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "none" }}>
                Get Started Free
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </Link>
              <Link href="/login"
                className="px-8 py-3.5 rounded-lg text-sm font-medium border transition-all duration-200"
                style={{ borderColor: "rgba(148,163,184,0.15)", color: "#94A3B8" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(148,163,184,0.3)"; e.currentTarget.style.color = "#F8FAFC" }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(148,163,184,0.15)"; e.currentTarget.style.color = "#94A3B8" }}>
                Sign In →
              </Link>
            </div>

            <div className="flex items-center justify-center gap-6 mt-6 text-xs" style={{ color: "#64748B" }}>
              <span>No credit card required</span>
              <span>·</span>
              <span>14-day free pro trial</span>
              <span>·</span>
              <span>Cancel anytime</span>
            </div>
          </div>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer className="py-16 border-t" style={{ borderColor: "rgba(148,163,184,0.06)", background: "#050816" }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-12">
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-2.5 mb-4 cursor-pointer">
                <div className="w-7 h-7 rounded-md flex items-center justify-center bg-[#14B8A6]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
                  </svg>
                </div>
                <span className="text-sm font-semibold">SmartSQL</span>
              </Link>
              <p className="text-xs leading-relaxed max-w-xs" style={{ color: "#64748B" }}>
                AI-powered SQL generation, optimization, and visualization for modern data teams.
              </p>
            </div>

            {FOOTER_LINKS.map(group => (
              <div key={group.heading}>
                <h4 className="text-xs font-semibold mb-3 text-[#F8FAFC]">{group.heading}</h4>
                <ul className="space-y-2">
                  {group.links.map(link => (
                    <li key={link}>
                      <a href="#" className="text-xs transition-colors" style={{ color: "#64748B" }}
                        onMouseEnter={e => e.currentTarget.style.color = "#F8FAFC"}
                        onMouseLeave={e => e.currentTarget.style.color = "#64748B"}
                      >{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4" style={{ borderColor: "rgba(148,163,184,0.06)" }}>
            <p className="text-xs" style={{ color: "#64748B" }}>
              © 2025 SmartSQL. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              {["Privacy", "Terms", "Security"].map(l => (
                <a key={l} href="#" className="text-xs transition-colors" style={{ color: "#64748B" }}
                  onMouseEnter={e => e.currentTarget.style.color = "#F8FAFC"}
                  onMouseLeave={e => e.currentTarget.style.color = "#64748B"}
                >{l}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
