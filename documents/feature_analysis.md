# Live DB Mode — How It Works

## Overview

Live DB Mode lets `admin` and `analyst` users connect any external **PostgreSQL** database (including Supabase) and query it in plain English, without storing credentials. It mirrors the standard query flow but targets an external DB instead of the app's internal Supabase instance.

---

## Access Control

- **Frontend guard** ([frontend/lib/auth.ts](frontend/lib/auth.ts)): `canUseLiveDb()` checks the in-session user role. `viewer` roles are redirected to `/query` before the page renders.
- **Backend guard** ([backend/src/routes/query.routes.ts](backend/src/routes/query.routes.ts)): The `POST /api/queries/run-live` endpoint is protected by `requireRole("admin", "analyst")` + `queryLimiter` (30 req/min), enforcing access at the API layer.

---

## Request Flow

```
User enters credentials (browser only)
        │
        ▼
POST /api/queries/run-live  { question, db_host, db_port, db_name, db_user, db_password, ssl_required, model_provider }
        │
        ▼
1. Build connection string (URL-encoded to handle special chars in passwords)
2. Fetch external schema via pg.Client (information_schema.columns)
        │  ── if schema fetch fails → 502 with actionable guidance ──
        ▼
3. Generate SQL: AI service (Groq / Gemini / Ollama)
        │  ── if CANNOT_ANSWER → log + return status="blocked" ──
        ▼
4. Validate SQL — blocks anything except SELECT / CTE
        │  ── if unsafe → log + return status="blocked" ──
        ▼
5. Execute on external DB via pg.Client (ephemeral, torn down after)
        │  ── 500-row LIMIT auto-appended if none present ──
        ▼
6. Log query to internal Supabase (query_logs table, mode="live_supabase")
        ▼
7. Optionally generate AI insight (first 20 rows sent back to LLM)
        ▼
Return QueryResult { columns, rows, row_count, generated_sql, status, insight }
```

---

## Key Components (Current Express.js + TypeScript)

| File | Role |
|---|---|
| [frontend/app/(app)/live-db/page.tsx](frontend/app/(app)/live-db/page.tsx) | UI — connection form, query form, result display |
| [frontend/lib/api.ts](frontend/lib/api.ts) | `queryApi.runLive()` — sends credentials per-request, never cached |
| [backend/src/routes/query.routes.ts](backend/src/routes/query.routes.ts) | `POST /api/queries/run-live` route definition |
| [backend/src/controllers/query.controller.ts](backend/src/controllers/query.controller.ts) | `runLiveQuery()` — orchestrates the full flow |
| [backend/src/services/schema.service.ts](backend/src/services/schema.service.ts) | `getExternalSchema()` — introspects public tables via pg.Client |
| [backend/src/services/query.service.ts](backend/src/services/query.service.ts) | `executeSQLOnExternal()` — runs the validated SELECT, tears down client after |
| [backend/src/validators/query.validator.ts](backend/src/validators/query.validator.ts) | Zod schema for request body validation |
| [backend/src/middlewares/rateLimit.middleware.ts](backend/src/middlewares/rateLimit.middleware.ts) | `queryLimiter` (30 req/min) |

---

## PostgreSQL Connection Details (Generic / Supabase)

The feature supports any PostgreSQL-compatible database. For **Supabase PostgreSQL**, find your connection details in:

**Supabase Dashboard → your project → Connect**

| Field | Value |
|---|---|
| Host | `db.<project-ref>.supabase.co` |
| Port (Direct) | `5432` |
| Port (Session Pooler) | `6543` |
| Port (Transaction Pooler) | `6579` |
| Database | `postgres` (default) |
| User | `postgres` (default role) |
| SSL | Always required |

> **Connection modes:** Supabase offers three connection modes:
> - **Direct** (port 5432) — connects directly to the database. Best for schema introspection and one-off queries. May require enabling IPv4 in Project Settings → Database.
> - **Session Pooler** (port 6543) — uses PgBouncer for connection pooling. Recommended for repeated queries.
> - **Transaction Pooler** (port 6579) — for prepared statement-heavy workloads.

---

## Security Design

- **Credentials are never persisted.** They live in React state for the browser session only and are sent per-request in the POST body over HTTPS. The backend builds an ephemeral `pg.Client` and calls `client.end()` after each query.
- **Read-only enforcement is layered:** the LLM prompt instructs SELECT-only → the validator regex blocks any non-SELECT/CTE statement → the external DB connection runs under whatever privileges the supplied user has (users should supply a read-only role where possible).
- **SQL injection via multi-statement** is blocked by the validator's semicolon check.
- **Connection errors** are caught and translated into actionable messages (wrong host, auth failure, SSL required, etc.).
- **SSL certificate verification** is enabled by default (`rejectUnauthorized: true`).

---

## Supported AI Providers

| Provider | Model | How Selected |
|---|---|---|
| Groq | `llama-3.3-70b` | Default |
| Gemini | `gemini-1.5-flash` | Dropdown on query form |
| Ollama | `llama3` (local) | Requires `OLLAMA_URL` env var |

---

## Result States

| `status` | Meaning |
|---|---|
| `success` | SQL ran, rows returned, chart + table rendered |
| `blocked` | AI returned `CANNOT_ANSWER` or validator rejected the SQL |
| `failed` | SQL was valid but execution on the external DB errored |

Connection-level failures (wrong host, bad credentials, SSL mismatch) are returned as HTTP 502 and displayed as a dismissible error panel that also clears the credentials so the user can re-enter them.
