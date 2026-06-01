# Live DB Mode — How It Works

## Overview

Live DB Mode lets `admin` and `analyst` users connect any external **Neon PostgreSQL** (or standard PostgreSQL) database and query it in plain English, without storing credentials. It mirrors the standard query flow but targets an external DB instead of the app's internal Supabase instance.

---

## Access Control

- **Frontend guard** ([frontend/lib/auth.ts:46](frontend/lib/auth.ts#L46)): `canUseLiveDb()` checks the in-session user role. `viewer` roles are redirected to `/query` before the page renders.
- **Backend guard** ([backend/app/queries/router.py:114](backend/app/queries/router.py#L114)): The `/api/queries/run-live` endpoint is protected by `require_role("admin", "analyst")`, enforcing access at the API layer as well.

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
2. Fetch external schema via SQLAlchemy Inspector (schema_service/service.py)
        │  ── if schema fetch fails → 502 with actionable guidance ──
        ▼
3. Generate SQL: LangChain → LLM (Groq / Gemini / Ollama) using TEXT_TO_SQL_PROMPT
        │  ── if CANNOT_ANSWER → log + return status="blocked" ──
        ▼
4. Validate SQL (sql_validator.py) — blocks anything except SELECT / CTE
        │  ── if unsafe → log + return status="blocked" ──
        ▼
5. Execute on external DB via SQLAlchemy (execute_sql_on_external)
        │  ── 500-row LIMIT auto-appended if none present ──
        ▼
6. Log query to internal Supabase (query_logs table, mode="live_supabase")
        ▼
7. Optionally generate AI insight (first 20 rows sent back to LLM)
        ▼
Return QueryResult { columns, rows, row_count, generated_sql, status, insight }
```

---

## Key Components

| File | Role |
|---|---|
| [frontend/app/(app)/live-db/page.tsx](frontend/app/(app)/live-db/page.tsx) | UI — connection form, query form, result display |
| [frontend/lib/api.ts:48](frontend/lib/api.ts#L48) | `queryApi.runLive()` — sends credentials per-request, never cached |
| [backend/app/queries/router.py:111](backend/app/queries/router.py#L111) | `POST /api/queries/run-live` — orchestrates the full flow |
| [backend/app/schema_service/service.py:36](backend/app/schema_service/service.py#L36) | `get_external_schema()` — introspects public tables via SQLAlchemy Inspector |
| [backend/app/queries/sql_executor.py:40](backend/app/queries/sql_executor.py#L40) | `execute_sql_on_external()` — runs the validated SELECT, disposes the engine after |
| [backend/app/queries/sql_validator.py](backend/app/queries/sql_validator.py) | Blocks all write ops, multi-statement injection, and dangerous functions |
| [backend/app/ai/langchain_agent.py](backend/app/ai/langchain_agent.py) | `generate_sql()` / `generate_insight()` — LangChain prompt chains |

---

## Neon PostgreSQL — Connection Details

The feature is now optimised for **Neon PostgreSQL**. Find your connection details in:

**Neon Console → your project → Connection Details**

| Field | Value |
|---|---|
| Host | `ep-<name>-<id>.<region>.aws.neon.tech` |
| Port | `5432` |
| Database | `neondb` (default) |
| User | `neondb_owner` (default role; check Neon Console → Roles) |
| SSL | Always required (`sslmode=require`) |

> **Neon compute suspend behaviour:** Free-tier computes suspend automatically after 5 minutes of inactivity. They wake on the next incoming connection (typically < 1 second). The 10-second `connect_timeout` in the backend absorbs the cold-start latency.

---

## Security Design

- **Credentials are never persisted.** They live in React state for the browser session only and are sent per-request in the POST body over HTTPS. The backend builds an ephemeral SQLAlchemy engine and calls `engine.dispose()` after each query.
- **Read-only enforcement is layered:** the LLM prompt instructs SELECT-only → the validator regex blocks any non-SELECT/CTE statement → the external DB connection runs under whatever privileges the supplied user has (users should supply a read-only role where possible).
- **SQL injection via multi-statement** is blocked by the validator's semicolon check.
- **Connection errors** are caught and translated into Neon-specific actionable messages (suspended compute, wrong endpoint host, role not found, SSL required, etc.).

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

Connection-level failures (wrong host, bad credentials, suspended compute, SSL mismatch) are returned as HTTP 502 and displayed as a dismissible error panel that also clears the credentials so the user can re-enter them.

---

## Why Neon over Supabase for external connections

| Issue (Supabase) | Resolution (Neon) |
|---|---|
| Direct host is IPv6-only — unreachable on most networks | Neon endpoints are dual-stack and reliably reachable via IPv4 |
| Projects pause after 7 days of inactivity; slow to restore | Neon computes suspend after 5 min but wake in < 1 second automatically |
| Pooler requires special username format (`postgres.<ref>`) | Standard role name — no special format required |
| Connection pooling config spread across multiple dashboard screens | Single "Connection Details" panel with the full connection string |
| Free-tier instability causing schema introspection failures | Neon's serverless architecture provides reliable cold-start behaviour |
