import axios from "axios"
import Cookies from "js-cookie"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export const api = axios.create({ baseURL: API_URL })

api.interceptors.request.use((config) => {
  const token = Cookies.get("token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Moderator panel client — uses sessionStorage mod_token, never cookies
export const modApi = axios.create({ baseURL: API_URL })

modApi.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = sessionStorage.getItem("mod_token")
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
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

  loginWithGoogle: (data: { code: string }) =>
    api.post("/api/auth/login/google", data).then((r) => r.data),

  adminLogin: (admin_name: string, admin_code: string) =>
    api.post("/api/auth/admin-login", { admin_name, admin_code }).then((r) => r.data),

  verifyEmail: (token: string) =>
    api.get(`/api/auth/verify-email?token=${token}`).then((r) => r.data),

  forgotPassword: (email: string) =>
    api.post("/api/auth/forgot-password", { email }).then((r) => r.data),

  resetPassword: (data: { token: string; password: string }) =>
    api.post("/api/auth/reset-password", data).then((r) => r.data),

  resendVerificationEmail: () =>
    api.post("/api/auth/resend-verification-email").then((r) => r.data),

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

// ── Admin (moderator panel) ────────────────────────────────────────────────────

export const adminApi = {
  stats:            ()                                       => modApi.get("/api/admin/stats").then((r) => r.data),
  users:            ()                                       => modApi.get("/api/admin/users").then((r) => r.data),
  logs:             (limit = 100)                            => modApi.get(`/api/admin/logs?limit=${limit}`).then((r) => r.data),
  updateUserStatus: (id: number, status: string)             => modApi.patch(`/api/admin/users/${id}/status`, { status }).then((r) => r.data),
  updateUserRole:   (id: number, role_name: string)          => modApi.patch(`/api/admin/users/${id}/role`, { role_name }).then((r) => r.data),
  deleteUser:       (id: number)                             => modApi.delete(`/api/admin/users/${id}`).then((r) => r.data),
}