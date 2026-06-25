"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Database, Eye, EyeOff, Loader2, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getDatabase, type DbType } from "@/lib/live-db/databases"
import { formSchemas, normalizeConfig, type LiveDbConfig } from "@/lib/live-db/formSchemas"

interface ConnectionFormProps {
  dbType: DbType
  loading?: boolean
  error?: string | null
  onBack: () => void
  onSubmit: (config: LiveDbConfig) => void
}

export function ConnectionForm({ dbType, loading, error, onBack, onSubmit }: ConnectionFormProps) {
  const database = getDatabase(dbType)
  const schema = formSchemas[dbType]
  const [values, setValues] = useState<LiveDbConfig>(schema.defaults)
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setValues(schema.defaults)
    setVisiblePasswords({})
  }, [schema.defaults, dbType])

  const gridClass = useMemo(
    () => schema.fields.length <= 3 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2",
    [schema.fields.length]
  )

  function update(name: string, value: unknown) {
    setValues((current) => ({ ...current, [name]: value }))
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <button type="button" onClick={onBack} className="mb-5 flex cursor-pointer items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft size={16} />
        Back to catalogue
      </button>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Selected: {database.name}</p>
          <h2 className="mt-1 flex items-center gap-2 text-lg font-semibold text-foreground">
            <Database size={18} className="text-primary" />
            Connection details
          </h2>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
          <Shield size={14} />
          Ephemeral session - credentials are never saved
        </div>
      </div>

      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit(normalizeConfig(values))
        }}
      >
        <div className={`grid gap-4 ${gridClass}`}>
          {schema.fields.map((field) => {
            if (field.type === "checkbox") {
              return (
                <label key={field.name} className="flex min-h-10 items-center gap-2 rounded-md border border-border px-3 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={Boolean(values[field.name])}
                    onChange={(event) => update(field.name, event.target.checked)}
                    className="accent-primary"
                  />
                  {field.label}
                </label>
              )
            }

            if (field.type === "select") {
              return (
                <label key={field.name} className="space-y-1.5 text-sm text-foreground">
                  <span>{field.label}</span>
                  <select
                    required={field.required}
                    value={String(values[field.name] ?? "")}
                    onChange={(event) => update(field.name, event.target.value)}
                    className="mint-input h-10 w-full px-3 text-sm"
                  >
                    {(field.options ?? []).map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
              )
            }

            if (field.type === "textarea") {
              return (
                <label key={field.name} className="space-y-1.5 text-sm text-foreground md:col-span-2">
                  <span>{field.label}</span>
                  <textarea
                    required={field.required}
                    placeholder={field.placeholder}
                    value={String(values[field.name] ?? "")}
                    onChange={(event) => update(field.name, event.target.value)}
                    rows={5}
                    className="mint-input w-full px-3 py-2 text-sm"
                  />
                </label>
              )
            }

            if (field.type === "file") {
              return (
                <label key={field.name} className="space-y-1.5 text-sm text-foreground">
                  <span>{field.label}</span>
                  <input
                    type="file"
                    accept={field.accept}
                    onChange={(event) => update(field.name, event.target.files?.[0]?.name ?? "")}
                    className="block h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                  />
                </label>
              )
            }

            const isPassword = field.type === "password"
            const visible = visiblePasswords[field.name]
            return (
              <label key={field.name} className="space-y-1.5 text-sm text-foreground">
                <span>{field.label}{field.devOnly ? " (development only)" : ""}</span>
                <span className="relative block">
                  <input
                    type={isPassword && !visible ? "password" : field.type}
                    required={field.required}
                    placeholder={field.placeholder}
                    value={String(values[field.name] ?? "")}
                    onChange={(event) => update(field.name, field.type === "number" ? Number(event.target.value) : event.target.value)}
                    className="mint-input h-10 w-full px-3 pr-10 text-sm"
                  />
                  {isPassword && (
                    <button
                      type="button"
                      onClick={() => setVisiblePasswords((current) => ({ ...current, [field.name]: !visible }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
                      aria-label={visible ? "Hide password" : "Show password"}
                    >
                      {visible ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  )}
                </span>
              </label>
            )
          })}
        </div>

        {error && (
          <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button type="submit" disabled={loading} variant="primary" size="sm">
          {loading ? <><Loader2 size={14} className="animate-spin" /> Connecting...</> : <><Database size={14} /> Test & Connect</>}
        </Button>
      </form>
    </div>
  )
}
