import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  Check,
  Database,
  FileCode2,
  Lock,
  Network,
  Search,
  Sparkles,
  Zap,
} from "lucide-react"
import { SmartSQLLogo } from "@/components/brand/SmartSQLLogo"

const NAV_ITEMS = [
  { label: "Features", href: "#features" },
  { label: "Docs", href: "#docs" },
  { label: "Security", href: "#security" },
  { label: "Access", href: "#access" },
]

const FEATURES = [
  {
    icon: Sparkles,
    title: "Natural-language generation",
    desc: "Ask in plain English and SmartSQL turns intent, filters, joins, and aggregates into a safe SELECT query.",
  },
  {
    icon: Network,
    title: "Schema-aware context",
    desc: "Internal and live database schemas are introspected so generated SQL respects available tables, columns, and relationships.",
  },
  {
    icon: BarChart3,
    title: "Results that explain themselves",
    desc: "Every successful run returns a table, chart, execution metadata, and optional AI-generated insight.",
  },
]

const DOC_ROWS = [
  { name: "model_provider", type: "groq | gemini | ollama", required: true, desc: "Selects the LLM provider for SQL generation." },
  { name: "include_insight", type: "boolean", required: false, desc: "Adds a concise explanation based on the first 20 result rows." },
  { name: "status", type: "success | blocked | failed | template", required: false, desc: "Describes the terminal query state returned by the API." },
]

const SECURITY = [
  "Single SELECT/WITH statement validation",
  "Dangerous SQL prefixes and functions blocked",
  "Supabase execute_safe_select RPC for internal data",
  "Fresh pg.Client per live connection, closed in finally",
]

const ACCESS_ROWS = [
  { feature: "Natural language SQL", availability: "Included" },
  { feature: "Save queries", availability: "Included" },
  { feature: "Live DB mode", availability: "Included" },
  { feature: "Query history", availability: "Included" },
]

function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <SmartSQLLogo size={32} className="text-sm" />
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <a key={item.href} href={item.href} className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
              {item.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary sm:inline-flex">
            Sign in
          </Link>
          <Link href="/register" className="inline-flex rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-[var(--mint-charcoal)]">
            Get started
          </Link>
        </div>
      </nav>
    </header>
  )
}

function ProductMockup() {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--mint-hairline-soft)] bg-card shadow-[0_24px_48px_-8px_rgba(0,0,0,0.12)]">
      <div className="grid min-h-[420px] lg:grid-cols-[220px_1fr]">
        <aside className="hidden border-r border-border bg-secondary p-4 lg:block">
          <p className="mint-kicker mb-3">Schema</p>
          {["users", "query_logs", "saved_queries", "feedback", "live_db_sessions"].map((table, index) => (
            <div key={table} className={`mb-1 rounded-md px-3 py-2 text-sm ${index === 2 ? "bg-card font-medium text-foreground" : "text-muted-foreground"}`}>
              <Database className="mr-2 inline h-3.5 w-3.5" />
              {table}
            </div>
          ))}
        </aside>

        <div className="flex flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Search size={15} className="text-muted-foreground" />
              <span className="text-sm font-medium">Ask your data</span>
            </div>
            <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">Connected</span>
          </div>

          <div className="space-y-4 p-5">
            <div className="rounded-lg border border-border bg-secondary p-4">
              <p className="mint-kicker">Prompt</p>
              <p className="mt-2 text-sm leading-relaxed text-foreground">
                Show successful queries this month, grouped by status and ordered by execution speed.
              </p>
            </div>

            <div className="overflow-hidden rounded-md border border-[var(--mint-hairline-dark)] bg-[var(--mint-surface-code)]">
              <div className="mint-code-header flex items-center justify-between px-4 py-2.5">
                <span className="font-mono text-xs">Generated SQL</span>
                <span className="rounded border border-[var(--mint-hairline-dark)] px-2 py-0.5 text-xs">Copy</span>
              </div>
              <pre className="mint-code border-0">
{`SELECT
  q.execution_status,
  COUNT(*) AS total_queries,
  AVG(q.execution_time_ms) AS avg_runtime
FROM query_logs q
JOIN users u ON q.user_id = u.id
WHERE q.created_at >= DATE_TRUNC('month', NOW())
GROUP BY q.execution_status
ORDER BY avg_runtime ASC
LIMIT 100;`}
              </pre>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Rows", "24"],
                ["Runtime", "87ms"],
                ["Status", "success"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-border bg-card p-3">
                  <p className="mint-kicker">{label}</p>
                  <p className="mt-2 font-mono text-lg font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main>
        <section className="relative overflow-hidden px-6 py-20 md:py-28">
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,var(--mint-hero-sky-from)_0%,var(--mint-hero-sky-to)_100%)] opacity-80" />
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="mx-auto mb-5 inline-flex rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
                Text-to-SQL analytics portal
              </p>
              <h1 className="text-5xl font-semibold leading-[1.05] tracking-[-1.5px] text-foreground md:text-7xl">
                Generate safe SQL from plain English.
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[var(--mint-slate)]">
                SmartSQL turns natural-language questions into validated PostgreSQL queries, executes them through Supabase, and returns tables, charts, and insights in one focused workspace.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/register" className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-[var(--mint-green-deep)]">
                  Get started
                  <ArrowRight size={15} />
                </Link>
                <Link href="/login" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
                  Sign in
                </Link>
              </div>
            </div>

            <div className="mx-auto mt-14 max-w-5xl">
              <ProductMockup />
            </div>
          </div>
        </section>

        <section id="features" className="border-y border-border bg-card px-6 py-16">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 max-w-xl">
              <p className="mint-kicker">Features</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.5px]">Built like documentation for your data.</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, desc }) => (
                <article key={title} className="mint-card p-6">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-[var(--mint-green-deep)]">
                    <Icon size={17} />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="docs" className="px-6 py-20">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[240px_1fr_220px]">
            <aside className="hidden lg:block">
              <p className="mint-kicker mb-3">Guides</p>
              {["Run Query", "Live DB", "Schema", "History", "Saved"].map((item, index) => (
                <div key={item} className={`rounded-md px-3 py-2 text-sm ${index === 0 ? "bg-secondary font-medium text-foreground" : "text-muted-foreground"}`}>
                  {item}
                </div>
              ))}
            </aside>

            <div>
              <p className="mint-kicker">API Shape</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.5px]">Predictable request and response surfaces.</h2>
              <p className="mt-3 text-base leading-7 text-muted-foreground">
                The query lifecycle is explicit: intent extraction, SQL generation, validation, execution, logging, and optional insight generation.
              </p>

              <div className="mt-8 mint-card p-6">
                {DOC_ROWS.map((row) => (
                  <div key={row.name} className="mint-property-row">
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[13px]">{row.name}</code>
                      <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs text-muted-foreground">{row.type}</span>
                      {row.required && <span className="rounded bg-destructive px-1.5 py-0.5 text-[10px] font-semibold uppercase text-destructive-foreground">Required</span>}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{row.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <aside className="hidden lg:block">
              <p className="mint-kicker mb-3">On this page</p>
              {["Features", "API Shape", "Security", "Access"].map((item, index) => (
                <a key={item} href={`#${index === 0 ? "features" : index === 1 ? "docs" : index === 2 ? "security" : "access"}`} className={`block py-1 text-sm ${index === 1 ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                  {item}
                </a>
              ))}
            </aside>
          </div>
        </section>

        <section id="security" className="border-y border-border bg-secondary px-6 py-20">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2">
            <div>
              <p className="mint-kicker">Safety</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.5px]">Read-only by design.</h2>
              <p className="mt-3 text-base leading-7 text-muted-foreground">
                SmartSQL treats generated SQL as untrusted until it passes validation. The backend rejects mutations, dangerous functions, multi-statement payloads, and unsupported operations.
              </p>
            </div>
            <div className="grid gap-3">
              {SECURITY.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
                  <Check size={16} className="mt-0.5 text-[var(--mint-green-deep)]" />
                  <span className="text-sm text-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="access" className="px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <p className="mint-kicker">Access</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.5px]">One workspace for every signed-in user.</h2>
              <p className="mt-3 text-base leading-7 text-muted-foreground">
                Every authenticated profile can generate SQL, save useful queries, review history, and connect live databases.
              </p>
            </div>

            <div className="mint-table overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary">
                  <tr>
                    {["Capability", "Availability"].map((head) => (
                      <th key={head} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ACCESS_ROWS.map((row) => (
                    <tr key={row.feature} className="border-t border-border">
                      <td className="px-5 py-4 font-medium">{row.feature}</td>
                      <td className="px-5 py-4 text-muted-foreground">{row.availability}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="bg-[linear-gradient(135deg,var(--mint-hero-dark-from)_0%,var(--mint-hero-dark-to)_100%)] px-6 py-20 text-white">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.04em] text-white/75">Start querying</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.5px]">Replace schema spelunking with one focused prompt.</h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/75">
              Connect your Supabase-backed SmartSQL workspace and start turning questions into validated SQL.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/register" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-white/90">
                Create account
                <ArrowRight size={15} />
              </Link>
              <Link href="/login" className="inline-flex rounded-full border border-white/25 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10">
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card px-6 py-12">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <SmartSQLLogo size={32} className="text-sm" />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-muted-foreground">
              Text-to-SQL analytics for teams that need correctness, safety, and readable results.
            </p>
          </div>
          {[
            ["Product", "Features", "Live DB", "Schema", "Saved Queries"],
            ["Resources", "Documentation", "API Reference", "Security", "Status"],
            ["Company", "About", "Contact", "Privacy", "Terms"],
          ].map(([heading, ...links]) => (
            <div key={heading}>
              <h3 className="text-sm font-medium">{heading}</h3>
              <ul className="mt-3 space-y-2">
                {links.map((item) => (
                  <li key={item}><a href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">{item}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </footer>
    </div>
  )
}
