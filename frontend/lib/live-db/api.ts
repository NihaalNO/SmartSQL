import { api } from "@/lib/api"
import type { DbType } from "./databases"
import type { LiveDbConfig } from "./formSchemas"

export interface LiveDbPayload {
  dbType: DbType
  config: LiveDbConfig
}

export const liveDbApi = {
  test: (payload: LiveDbPayload) =>
    api.post("/api/live-db/test", payload).then((r) => r.data),
  schema: (payload: LiveDbPayload) =>
    api.post("/api/live-db/schema", payload).then((r) => r.data),
  stats: (payload: LiveDbPayload) =>
    api.post("/api/live-db/stats", payload).then((r) => r.data),
  query: (payload: LiveDbPayload & {
    question?: string
    query?: string
    model_provider?: string
    model_name?: string
    include_insight?: boolean
  }) => api.post("/api/live-db/query", payload).then((r) => r.data),
  sampleRows: (payload: LiveDbPayload & { tableName: string }) =>
    api.post("/api/live-db/sample-rows", payload).then((r) => r.data),
}
