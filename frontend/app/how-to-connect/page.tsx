"use client"
import Link from "next/link"
import { ArrowLeft, Database, Shield, Key, PlugZap, HelpCircle, Wifi, Lock, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"

const STEPS = [
  {
    icon: <BookOpen size={16} />,
    title: "Step 1: Create a Supabase Project",
    body: [
      'Go to <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" class="text-primary underline">supabase.com</a> and sign in or create an account.',
      "Click <strong>New project</strong> and enter a name for your project.",
      "Set a secure <strong>database password</strong>.",
      "Choose a region and click <strong>Create new project</strong>.",
      "Wait for the project to provision.",
      "You're all set.",
    ],
  },
  {
    icon: <Key size={16} />,
    title: "Step 2: Locate Your Connection String",
    body: [
      'In the Supabase Dashboard, click <strong>Connect</strong>.',
      'Choose <strong>Direct</strong> or <strong>Session pooler</strong>.',
      'Copy the <code class="text-primary">postgresql://...</code> string.',
    ],
  },
  {
    icon: <Database size={16} />,
    title: "Step 3: Enter Credentials in SmartSQL",
    body: [
      'Go to <strong>Live DB Mode</strong> in the sidebar.',
      "Fill in the connection fields:",
    ],
    fields: [
      { label: "Host", value: "db.<ref>.supabase.co", note: "From Connect panel" },
      { label: "Port", value: "5432 / 6543", note: "5432 Direct, 6543 Session pooler" },
      { label: "Database", value: "postgres", note: "Default database name" },
      { label: "User", value: "postgres", note: "The default superuser" },
      { label: "Password", value: "Your DB password", note: "Set during project creation" },
    ],
  },
  {
    icon: <PlugZap size={16} />,
    title: "Step 4: Test the Connection",
    body: [
      "Click <strong>Connect</strong> after entering your credentials.",
      "A green <strong>Connected</strong> badge confirms you're ready.",
      "If it fails, see Troubleshooting below.",
    ],
  },
  {
    icon: <Wifi size={16} />,
    title: "Step 5: Live Querying",
    body: [
      "Once connected, type any question in plain English.",
      "The AI generates SQL, executes it, and returns results.",
      "All queries are read-only (SELECT / WITH only).",
    ],
  },
]

const TROUBLESHOOTING = [
  { icon: <Shield size={14} />, title: "Invalid password", detail: "Reset in Supabase Dashboard &rarr; Project Settings &rarr; Database &rarr; Reset password." },
  { icon: <HelpCircle size={14} />, title: "Wrong host", detail: "Format: db.&lt;project-ref&gt;.supabase.co. Find it in Connect panel." },
  { icon: <Lock size={14} />, title: "SSL issues", detail: "Ensure <strong>Require SSL</strong> is checked in the connection form." },
  { icon: <Wifi size={14} />, title: "Connection timeout", detail: "Enable IPv4 in Supabase Dashboard &rarr; Project Settings &rarr; Database." },
  { icon: <Database size={14} />, title: "Pooler config", detail: "Use Session pooler (port 6543) for most cases." },
]

const CONNECTION_MODES = [
  { mode: "Direct", port: "5432", use: "Schema introspection, one-off queries. May need IPv4 enabled." },
  { mode: "Session Pooler", port: "6543", use: "Recommended for repeated queries. Works with IPv4 by default." },
  { mode: "Transaction Pooler", port: "6579", use: "For prepared statement-heavy workloads." },
]

export default function HowToConnectPage() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6 animate-fade-in-up">
      <Link href="/live-db" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
        <ArrowLeft size={13} />
        Back to Live DB Mode
      </Link>

      <div>
        <h1 className="heading-sm text-foreground flex items-center gap-2">
          <Database size={16} className="text-primary" />
          How to Connect Your Database
        </h1>
        <p className="body-sm text-muted-foreground mt-1">
          A step-by-step guide to connecting PostgreSQL/Supabase databases to SmartSQL.
        </p>
      </div>

      {STEPS.map((step, i) => (
        <div key={i} className="rounded border border-white/[0.06] bg-card p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            {step.icon}
            <span>{step.title}</span>
          </div>
          <ol className="space-y-1.5 text-sm text-foreground/80">
            {step.body.map((line, j) => (
              <li key={j} className="leading-relaxed" dangerouslySetInnerHTML={{ __html: line }} />
            ))}
          </ol>
          {"fields" in step && (
            <div className="overflow-x-auto rounded border border-white/[0.06]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-white/[0.03]">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Field</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Value</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {(step as unknown as { fields: { label: string; value: string; note: string }[] }).fields.map((f, j) => (
                    <tr key={j} className="border-t border-white/[0.04]">
                      <td className="px-3 py-2 font-medium text-foreground/80">{f.label}</td>
                      <td className="px-3 py-2 font-mono text-primary">{f.value}</td>
                      <td className="px-3 py-2 text-muted-foreground">{f.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}

      <div className="rounded border border-white/[0.06] bg-card p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-amber-400">
          <HelpCircle size={16} />
          <span>Troubleshooting</span>
        </div>
        <div className="grid gap-2">
          {TROUBLESHOOTING.map((item, i) => (
            <div key={i} className="p-3 rounded border border-white/[0.04] bg-white/[0.02]">
              <div className="flex items-center gap-2 text-sm font-medium mb-1 text-foreground/80">
                {item.icon}
                {item.title}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: item.detail }} />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded border border-white/[0.06] bg-card p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-blue-400">
          <PlugZap size={16} />
          <span>Connection Modes Reference</span>
        </div>
        <div className="overflow-x-auto rounded border border-white/[0.06]">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-white/[0.03]">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Mode</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Port</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">When to Use</th>
              </tr>
            </thead>
            <tbody>
              {CONNECTION_MODES.map((m, i) => (
                <tr key={i} className="border-t border-white/[0.04]">
                  <td className="px-3 py-2 font-medium text-foreground/80">{m.mode}</td>
                  <td className="px-3 py-2 font-mono text-primary">{m.port}</td>
                  <td className="px-3 py-2 text-muted-foreground">{m.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-center text-muted-foreground pt-2">
        Credentials are never stored by SmartSQL. They are sent directly to your database over HTTPS and discarded.
      </p>
    </div>
  )
}
