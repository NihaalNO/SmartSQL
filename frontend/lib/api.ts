import axios from "axios"
import Cookies from "js-cookie"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export const api = axios.create({ baseURL: API_URL })

api.interceptors.request.use((config) => {
  const token = Cookies.get("token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      Cookies.remove("token")
      if (typeof window !== "undefined") window.location.href = "/login"
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (data: { full_name: string; email: string; password: string; role?: string }) =>
    api.post("/api/auth/register", data).then((r) => r.data),

  login: (email: string, password: string) =>
    api.post("/api/auth/login", { email, password }).then((r) => r.data),

  me: () => api.get("/api/auth/me").then((r) => r.data),
}

// ── Queries ───────────────────────────────────────────────────────────────────

export const queryApi = {
  run: (payload: {
    question: string
    dataset_id?: number
    model_provider?: string
    model_name?: string
    include_insight?: boolean
  }) => api.post("/api/queries/run", payload).then((r) => r.data),

  runLive: (payload: {
    question: string
    db_host: string
    db_port?: number
    db_name: string
    db_user: string
    db_password: string
    model_provider?: string
    model_name?: string
    ssl_required?: boolean
    include_insight?: boolean
  }) => api.post("/api/queries/run-live", payload).then((r) => r.data),

  save: (payload: { log_id: number; title: string; chart_type?: string; is_favorite?: boolean }) =>
    api.post("/api/queries/save", payload).then((r) => r.data),

  savedList: () => api.get("/api/queries/saved").then((r) => r.data),

  deleteSaved: (id: number) => api.delete(`/api/queries/saved/${id}`).then((r) => r.data),

  history: (limit = 50) => api.get(`/api/queries/history?limit=${limit}`).then((r) => r.data),

  feedback: (payload: { log_id: number; rating: number; comments?: string }) =>
    api.post("/api/queries/feedback", payload).then((r) => r.data),
}

// ── Schema ────────────────────────────────────────────────────────────────────

export const schemaApi = {
  tables: () => api.get("/api/schema/internal/tables").then((r) => r.data),
}
