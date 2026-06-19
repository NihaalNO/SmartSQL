"use client"
import Link from "next/link"
import { ArrowLeft, Database, Shield, Key, PlugZap, HelpCircle, Wifi, Lock, BookOpen } from "lucide-react"

const STEPS = [
  {
    icon: <BookOpen size={18} />,
    title: "Step 1: Create a Supabase Project",
    body: [
      'Go to <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" class="underline">supabase.com</a> and sign in or create an account.',
      "Click <strong>New project</strong> and enter a name for your project.",
      "Set a secure <strong>database password</strong> — you'll need this later.",
      "Choose a region close to you and click <strong>Create new project</strong>.",
      "Wait a minute for the project to provision.",
      'Once ready, you\'ll land on the project <strong>Dashboard</strong> — you\'re all set.',
    ],
  },
  {
    icon: <Key size={18} />,
    title: "Step 2: Locate Your Connection String",
    body: [
      'In the Supabase Dashboard, look for the <strong>Connect</strong> button (top-right of the page or in the sidebar — it looks like a plug icon).',
      'Click <strong>Connect</strong> to open the connection panel.',
      'You\'ll see multiple tabs: <strong>Direct</strong>, <strong>Session pooler</strong>, and <strong>Transaction pooler</strong>.',
      'For Live DB Mode, choose either <strong>Direct</strong> or <strong>Session pooler</strong>.',
      'Below "Connection string", copy the full <code>postgresql://...</code> string to use directly, OR note down the individual fields (host, port, database, user).',
    ],
  },
  {
    icon: <Database size={18} />,
    title: "Step 3: Enter Credentials in SmartSQL",
    body: [
      'Go to <strong>Live DB Mode</strong> in the SmartSQL sidebar.',
      "Fill in the connection fields:",
    ],
    fields: [
      { label: "Host", value: "db.<project-ref>.supabase.co", note: "Found in the Connect panel next to 'Host'" },
      { label: "Port", value: "5432 (Direct) / 6543 (Session pooler)", note: "Use 5432 for direct connections, 6543 for pooled" },
      { label: "Database", value: "postgres", note: "Usually 'postgres' unless you created a custom database" },
      { label: "User", value: "postgres", note: "The default user — matches the project name in some setups" },
      { label: "Password", value: "The password you set in Step 1", note: "Never shared — sent directly to your database over HTTPS" },
    ],
  },
  {
    icon: <PlugZap size={18} />,
    title: "Step 4: Test the Connection",
    body: [
      "Click <strong>Connect</strong> after entering your credentials.",
      "On success: you'll see a green <strong>Connected</strong> badge showing your host and database name — you're ready to query.",
      'On failure: an error panel appears explaining what went wrong. Common errors are listed below in Troubleshooting.',
      "If the connection fails, your credentials are cleared for safety — just re-enter them after fixing the issue.",
    ],
  },
  {
    icon: <Wifi size={18} />,
    title: "Step 5: Live Monitoring & Querying",
    body: [
      "Once connected, you'll see a text area labelled <strong>Ask a question about your database in plain English</strong>.",
      "Type your question (e.g., 'Show me the 10 most recent orders') and click <strong>Run Live Query</strong>.",
      "The AI generates SQL from your question, executes it against your database, and returns results as a table + chart.",
      "Your database schema is automatically introspected so the AI knows your tables and columns.",
      "You can switch AI providers (Groq / Gemini / Ollama) using the dropdown.",
      "All queries are read-only — only SELECT and WITH statements are allowed.",
    ],
  },
]

const TROUBLESHOOTING = [
  {
    icon: <Shield size={16} />,
    title: "Invalid password",
    detail: "The database password you set during project creation. Reset it in Supabase Dashboard → Project Settings → Database → Reset password.",
  },
  {
    icon: <HelpCircle size={16} />,
    title: "Wrong host",
    detail: 'The host should look like db.<project-ref>.supabase.co. Find it in Supabase Dashboard → your project → Connect → Host.',
  },
  {
    icon: <Lock size={16} />,
    title: "SSL issues",
    detail: "Supabase requires SSL on all connections. Ensure the <strong>Require SSL</strong> checkbox is checked in the connection form.",
  },
  {
    icon: <Wifi size={16} />,
    title: "Connection timeout",
    detail: "If using Direct connection (port 5432), you may need to enable IPv4 in Supabase Dashboard → Project Settings → Database → IPv4. The Session pooler (port 6543) typically works without this setting.",
  },
  {
    icon: <Database size={16} />,
    title: "Pooler configuration",
    detail: "Use Session pooler (port 6543) for most use cases. Direct (port 5432) is fine for one-off queries. Transaction pooler (port 6579) is only needed if you use prepared statements.",
  },
  {
    icon: <HelpCircle size={16} />,
    title: "Network connectivity",
    detail: "If running SmartSQL locally, ensure your local network can reach Supabase. Corporate firewalls or VPNs may block outbound connections to port 5432/6543.",
  },
]

const CONNECTION_MODES = [
  { mode: "Direct", port: "5432", use: "Best for schema introspection, one-off queries, and when you need full SQL feature support. May require enabling IPv4 in Supabase settings." },
  { mode: "Session Pooler", port: "6543", use: "Recommended for repeated queries. Uses PgBouncer to pool connections. Works with IPv4 by default. Slightly reduced feature set (no PREPARE, no LISTEN/NOTIFY)." },
  { mode: "Transaction Pooler", port: "6579", use: "For prepared statement-heavy workloads. Most restrictive — only use if you specifically need transaction-level pooling." },
]

export default function HowToConnectPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      <Link href="/live-db" className="inline-flex items-center gap-1.5 text-xs" style={{ color: "#14B8A6" }}>
        <ArrowLeft size={13} />
        Back to Live DB Mode
      </Link>

      <div>
        <h1 className="text-lg font-bold text-[#F8FAFC] flex items-center gap-2">
          <Database size={18} style={{ color: "#14B8A6" }} />
          How to Connect Your Database
        </h1>
        <p className="text-xs mt-1" style={{ color: "#64748B" }}>
          A step-by-step guide to connecting any PostgreSQL database — including Supabase — to SmartSQL.
        </p>
      </div>

      {STEPS.map((step, i) => (
        <div key={i} className="rounded-lg border p-5 space-y-3" style={{ borderColor: "rgba(148,163,184,0.08)", background: "rgba(255,255,255,0.02)" }}>
          <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#14B8A6" }}>
            {step.icon}
            <span>{step.title}</span>
          </div>
          <ol className="space-y-1.5 text-sm" style={{ color: "#CBD5E1" }}>
            {step.body.map((line, j) => (
              <li key={j} className="leading-relaxed" dangerouslySetInnerHTML={{ __html: line }} />
            ))}
          </ol>
          {"fields" in step && (
            <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "rgba(148,163,184,0.08)" }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                    <th className="text-left px-3 py-2 font-medium" style={{ color: "#64748B" }}>Field</th>
                    <th className="text-left px-3 py-2 font-medium" style={{ color: "#64748B" }}>Value</th>
                    <th className="text-left px-3 py-2 font-medium" style={{ color: "#64748B" }}>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {(step as unknown as { fields: { label: string; value: string; note: string }[] }).fields.map((f, j) => (
                    <tr key={j} className="border-t" style={{ borderColor: "rgba(148,163,184,0.06)" }}>
                      <td className="px-3 py-2 font-medium" style={{ color: "#CBD5E1" }}>{f.label}</td>
                      <td className="px-3 py-2 font-mono" style={{ color: "#14B8A6" }}>{f.value}</td>
                      <td className="px-3 py-2" style={{ color: "#64748B" }}>{f.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}

      <div className="rounded-lg border p-5 space-y-3" style={{ borderColor: "rgba(148,163,184,0.08)", background: "rgba(255,255,255,0.02)" }}>
        <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#F59E0B" }}>
          <HelpCircle size={18} />
          <span>Troubleshooting</span>
        </div>
        <div className="grid gap-2">
          {TROUBLESHOOTING.map((item, i) => (
            <div key={i} className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(148,163,184,0.06)" }}>
              <div className="flex items-center gap-2 text-sm font-medium mb-1" style={{ color: "#CBD5E1" }}>
                {item.icon}
                {item.title}
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "#64748B" }} dangerouslySetInnerHTML={{ __html: item.detail }} />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border p-5 space-y-3" style={{ borderColor: "rgba(148,163,184,0.08)", background: "rgba(255,255,255,0.02)" }}>
        <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#60A5FA" }}>
          <PlugZap size={18} />
          <span>Connection Modes Reference</span>
        </div>
        <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "rgba(148,163,184,0.08)" }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                <th className="text-left px-3 py-2 font-medium" style={{ color: "#64748B" }}>Mode</th>
                <th className="text-left px-3 py-2 font-medium" style={{ color: "#64748B" }}>Port</th>
                <th className="text-left px-3 py-2 font-medium" style={{ color: "#64748B" }}>When to Use</th>
              </tr>
            </thead>
            <tbody>
              {CONNECTION_MODES.map((m, i) => (
                <tr key={i} className="border-t" style={{ borderColor: "rgba(148,163,184,0.06)" }}>
                  <td className="px-3 py-2 font-medium" style={{ color: "#CBD5E1" }}>{m.mode}</td>
                  <td className="px-3 py-2 font-mono" style={{ color: "#14B8A6" }}>{m.port}</td>
                  <td className="px-3 py-2" style={{ color: "#64748B" }}>{m.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-center pt-2" style={{ color: "#64748B" }}>
        Credentials are never stored by SmartSQL. They are sent directly to your database over HTTPS and discarded after each query.
      </p>
    </div>
  )
}
