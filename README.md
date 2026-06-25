# SmartSQL: A Safe Text-to-SQL Analytics Workbench

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-111111?logo=express)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178c6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3fcf8e?logo=supabase&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

SmartSQL is a full-stack research and analytics portal for converting natural-language questions into validated PostgreSQL queries. The system combines a Next.js workspace, an Express.js API, Supabase-backed identity and storage, LLM-based SQL generation, and a read-only SQL safety pipeline.

The project is intentionally designed as a controlled analytics environment: every generated query is treated as untrusted, validated before execution, logged for traceability, and returned to the user as a table, chart, and optional AI insight.

---

## Abstract

Text-to-SQL systems reduce the technical barrier between domain users and structured data, but they also introduce reliability and safety risks. SmartSQL addresses this problem through a layered architecture:

1. A natural-language interface for query intent capture.
2. A provider-agnostic LLM service for SQL generation.
3. A deterministic SQL validation layer that permits only safe `SELECT` and `WITH` statements.
4. A Supabase/PostgreSQL execution layer using controlled RPC or temporary live connections.
5. A modern analytics UI for inspection, visualization, query history, and saved query retrieval.

The current authorization model is profile-based: every authenticated user is treated as a normal user. Legacy Viewer, Analyst, and Admin roles have been removed.

---

## Table of Contents

- [System Overview](#system-overview)
- [Research Motivation](#research-motivation)
- [Core Capabilities](#core-capabilities)
- [Technology Matrix](#technology-matrix)
- [Architecture](#architecture)
- [Repository Structure](#repository-structure)
- [Data Model](#data-model)
- [Security Model](#security-model)
- [Runtime Setup](#runtime-setup)
- [Verification](#verification)
- [Development Notes](#development-notes)
- [License](#license)

---

## System Overview

| Icon | Layer | Responsibility |
|---|---|---|
| &#128421; | Frontend workspace | Auth flows, dashboard, query runner, history, saved queries, live DB catalogue |
| &#9881; | Backend service | Request validation, authentication, LLM orchestration, SQL execution, logging |
| &#128452; | Supabase/PostgreSQL | Application tables, auth integration, safe internal query execution |
| &#129504; | LLM providers | SQL generation, intent extraction, result insight generation |
| &#128737; | SQL guardrail | Blocks mutations, multi-statement payloads, dangerous functions, unsafe prefixes |
| &#9993; | SendGrid | Email verification and password reset delivery |

---

## Research Motivation

SmartSQL is organized around three research-grade design questions:

| Question | SmartSQL Approach |
|---|---|
| How can non-technical users query structured data safely? | Natural-language prompts are converted to SQL, but only validated read-only SQL reaches the database. |
| How can generated SQL remain observable? | Every query lifecycle records prompt, generated SQL, status, timing, row count, provider, and feedback. |
| How can live data access avoid long-lived credential exposure? | Live DB credentials are supplied per session, used in memory, and never persisted. |

---

## Core Capabilities

- Natural-language to SQL generation.
- SQL preview and execution metadata.
- Read-only validation for `SELECT` and `WITH` statements.
- Internal Supabase/PostgreSQL query execution.
- Live database mode for temporary external database sessions.
- Saved queries and query history.
- Result tables, charts, and AI-generated insights.
- Email verification and password reset.
- Profile-based authentication with no role badges or role-gated features.
- Responsive app shell with sticky sidebar and independently scrolling content.

---

## Technology Matrix

| Domain | Technology |
|---|---|
| Frontend | Next.js App Router, React, TypeScript, Tailwind CSS, Radix UI, Recharts |
| Backend | Express.js, TypeScript, Zod, Prisma tooling |
| Auth | Supabase Auth, application-level user profiles |
| Database | Supabase/PostgreSQL |
| AI Providers | Groq, Gemini, Ollama |
| Email | SendGrid |
| Live Connectors | PostgreSQL, Redshift, Snowflake, MySQL, MariaDB, SQL Server, SQLite, DuckDB, ClickHouse, BigQuery, Oracle |
| Validation | Zod request schemas, SQL allowlist/blocklist guardrails |

---

## Architecture

### Request Lifecycle

```text
User Prompt
    |
    v
Next.js Query UI
    |
    v
Express /api/queries/run
    |
    +--> authenticate Supabase token
    |
    +--> extract intent
    |
    +--> generate SQL with selected AI provider
    |
    +--> validate SQL safety
    |
    +--> execute via Supabase safe-select RPC
    |
    +--> log query lifecycle
    |
    +--> optionally generate insight
    |
    v
Table + Chart + SQL Preview + Metadata
```

### Backend Layering

```text
backend/src/
|-- app.ts                     # Express application factory
|-- server.ts                  # Runtime entry point
|-- config/                    # Environment and Supabase clients
|-- connectors/                # Live database connector registry
|-- controllers/               # Route handlers
|-- middlewares/               # Auth, validation, rate limits, errors
|-- routes/                    # API route composition
|-- services/                  # AI, email, schema, query, Prisma services
|-- types/                     # Shared backend TypeScript contracts
|-- utils/                     # API errors, async wrappers, logging
`-- validators/                # Zod request schemas
```

### Frontend Layering

```text
frontend/
|-- app/
|   |-- (app)/                 # Authenticated workspace shell
|   |   |-- dashboard/
|   |   |-- history/
|   |   |-- live-db/
|   |   |-- query/
|   |   |-- saved/
|   |   |-- settings/
|   |   `-- layout.tsx
|   |-- auth/callback/         # OAuth callback handling
|   |-- login/
|   |-- register/
|   |-- forgot-password/
|   |-- reset-password/
|   |-- verify-email/
|   |-- globals.css
|   |-- layout.tsx
|   `-- page.tsx               # Public landing page
|-- components/
|   |-- brand/                 # SmartSQL logo system
|   |-- live-db/               # Live database catalogue and forms
|   |-- ui/                    # Shared UI primitives
|   |-- Sidebar.tsx
|   |-- QueryInput.tsx
|   |-- SQLPreview.tsx
|   |-- ResultsTable.tsx
|   `-- ChartView.tsx
`-- lib/
    |-- api.ts                 # Typed API client namespaces
    |-- auth/                  # Session helpers and auth utilities
    `-- live-db/               # Live DB metadata, schemas, API helpers
```

---

## Repository Structure

```text
SmartSQL/
|-- backend/
|   |-- prisma/
|   |   `-- schema.prisma
|   |-- src/
|   |   |-- config/
|   |   |-- connectors/
|   |   |-- controllers/
|   |   |-- middlewares/
|   |   |-- routes/
|   |   |-- services/
|   |   |-- types/
|   |   |-- utils/
|   |   `-- validators/
|   |-- package.json
|   `-- tsconfig.json
|-- frontend/
|   |-- app/
|   |-- components/
|   |-- lib/
|   |-- public/
|   |-- package.json
|   `-- tsconfig.json
|-- new_schema.sql             # Role-system removal and RLS migration
|-- package.json
|-- README.md
`-- LICENSE
```

---

## Data Model

The current application schema is centered on a normal authenticated user profile and user-owned query activity.

```text
users
|-- id
|-- supabase_uid
|-- full_name
|-- email
|-- avatar_url
|-- status
|-- created_at
`-- updated_at

query_logs
|-- id
|-- user_id
|-- natural_language_query
|-- generated_sql
|-- execution_status
|-- execution_time_ms
|-- row_count
|-- model_provider
`-- created_at

saved_queries
|-- id
|-- user_id
|-- title
|-- natural_language_query
|-- generated_sql
|-- chart_type
|-- is_favorite
|-- created_at
`-- updated_at

feedback
|-- id
|-- query_log_id
|-- user_id
|-- rating
|-- comments
`-- created_at
```

### Schema Migration

`new_schema.sql` removes the legacy role system from the public application schema:

- Drops `admin_credentials`.
- Drops `roles`.
- Removes `users.role_id`.
- Preserves `users`, `saved_queries`, `query_logs`, and `feedback`.
- Adds profile-friendly fields such as `avatar_url`.
- Enables ownership-based RLS policies.

Supabase `auth.users` is not modified.

---

## Security Model

### Authentication

SmartSQL uses Supabase Auth for identity verification. The backend verifies bearer tokens through Supabase and resolves the corresponding row in the public `users` table.

### Authorization

SmartSQL does not use Viewer, Analyst, or Admin roles. Every authenticated user can access:

- Dashboard
- Query generation
- Saved queries
- Query history
- Live DB mode
- Schema visualization

Private data is still protected through ownership checks: users can only access their own profile, saved queries, query logs, and feedback.

### SQL Safety

The backend SQL safety pipeline rejects:

- Non-`SELECT` and non-`WITH` statements.
- Multiple SQL statements.
- Mutation commands such as `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `CREATE`, and `TRUNCATE`.
- Dangerous functions and file/export operations.
- Unsupported or suspicious execution patterns.

---

## Runtime Setup

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Backend default: `http://localhost:8000`

Required environment values include:

```text
DATABASE_URL
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_JWT_SECRET
SENDGRID_API_KEY
SENDGRID_FROM_EMAIL
EMAIL_VERIFICATION_SECRET
PASSWORD_RESET_SECRET
```

Optional AI provider values:

```text
GROQ_API_KEY
GEMINI_API_KEY
OLLAMA_URL
DEFAULT_MODEL_PROVIDER
DEFAULT_MODEL_NAME
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Frontend default: `http://localhost:3000`

Use `NEXT_PUBLIC_API_URL` if the backend runs somewhere other than `http://localhost:8000`.

---

## Verification

### Backend

```bash
cd backend
npm run type-check
npm run build
```

### Frontend

```bash
cd frontend
npm run lint
npm run build
```

### Manual Smoke Test

```text
1. Register a user.
2. Verify email.
3. Log in.
4. Open Dashboard.
5. Run a natural-language query.
6. Save a query.
7. Review History.
8. Open Live DB Mode.
9. Confirm the sidebar remains sticky while content scrolls.
```

---

## Development Notes

- Runtime database access is primarily through Supabase clients, not direct Prisma queries.
- Prisma remains useful for schema typing, migrations, and local development workflows.
- Live DB connections are temporary and should not be persisted.
- Add new frontend API calls through `frontend/lib/api.ts`.
- Add new backend request validation through Zod validators in `backend/src/validators`.
- Keep SQL execution paths read-only unless the safety model is explicitly redesigned.

---

## License

SmartSQL is released under the [MIT License](LICENSE).
