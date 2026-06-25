"use client"

import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { AlertTriangle, Database } from "lucide-react"
import { DatabaseCatalogue } from "@/components/live-db/DatabaseCatalogue"
import { ConnectionForm } from "@/components/live-db/ConnectionForm"
import { LiveDbDashboard } from "@/components/live-db/LiveDbDashboard"
import { getDatabase, type DbType } from "@/lib/live-db/databases"
import type { LiveDbConfig } from "@/lib/live-db/formSchemas"
import { liveDbApi } from "@/lib/live-db/api"

export default function LiveDbPage() {
  const [selectedDb, setSelectedDb] = useState<DbType | null>(null)
  const [connectedDb, setConnectedDb] = useState<DbType | null>(null)
  const [config, setConfig] = useState<LiveDbConfig | null>(null)
  const [testResult, setTestResult] = useState<{ message?: string; table_count?: number; tables?: string[] } | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function testAndConnect(nextConfig: LiveDbConfig) {
    if (!selectedDb) return
    setConnecting(true)
    setError(null)
    setTestResult(null)
    try {
      const res = await liveDbApi.test({ dbType: selectedDb, config: nextConfig })
      if (res.status !== "ok") {
        setError(res.message || "Connection failed")
        return
      }
      setConfig(nextConfig)
      setConnectedDb(selectedDb)
      setTestResult(res)
      toast.success(res.message || `Connected to ${getDatabase(selectedDb).name}`)
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string; message?: string } } })?.response?.data?.detail || (err as Error)?.message || "Connection failed")
    } finally {
      setConnecting(false)
    }
  }

  function disconnect() {
    setConnectedDb(null)
    setConfig(null)
    setTestResult(null)
    setSelectedDb(null)
    setError(null)
  }

  const connectedDatabase = connectedDb ? getDatabase(connectedDb) : null

  return (
    <div className="mint-page">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mint-kicker">Live database</p>
          <h1 className="mint-title mt-2">Live DB Mode</h1>
          <p className="mint-subtitle mt-2 max-w-3xl">
            Choose a database from the catalogue, connect for this session only, then query and visualize live data.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
          Credentials stay in memory and are never saved.
        </div>
      </div>

      {error && !selectedDb && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <div className="flex gap-2"><AlertTriangle size={16} /> {error}</div>
        </div>
      )}

      {!selectedDb && !connectedDb && (
        <>
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Database size={16} />
              Database catalogue
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Select one of 11 supported V1 database types. PostgreSQL and Redshift use the current PostgreSQL driver path; other drivers are allowlisted for installation.
            </p>
          </div>
          <DatabaseCatalogue selectedId={selectedDb} onSelect={setSelectedDb} />
        </>
      )}

      {selectedDb && !connectedDb && (
        <ConnectionForm
          dbType={selectedDb}
          loading={connecting}
          error={error}
          onBack={() => {
            setSelectedDb(null)
            setError(null)
          }}
          onSubmit={testAndConnect}
        />
      )}

      {connectedDatabase && config && connectedDb && (
        <LiveDbDashboard
          database={connectedDatabase}
          dbType={connectedDb}
          config={config}
          testResult={testResult}
          onDisconnect={disconnect}
        />
      )}
    </div>
  )
}
