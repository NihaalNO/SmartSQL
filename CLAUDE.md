# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SmartSQL is a text-to-SQL analytics portal. Users ask questions in natural English, the backend uses an LLM (Groq / Gemini / Ollama) to generate SQL, the SQL is validated and executed against PostgreSQL (via Supabase), and the result is returned to a Next.js UI as a table + chart. The project is a monorepo with two independently-run workspaces:

- `backend/` — Express.js + TypeScript API (port 8000)
- `frontend/` — Next.js 14 (App Router) client (port 3000)

Database access is exclusively through Supabase (the `execute_safe_select` RPC for the internal DB, a fresh `pg.Client` for ad-hoc "live" connections). There is no MySQL — README mentions it historically, but the active code path is Postgres/Supabase.

## Common Commands

### Backend (run from `backend/`)

```bash
npm install
cp .env.example .env          # fill in SUPABASE_*, AI keys, SENDGRID_*, secrets
npm run prisma:generate        # generate Prisma client from prisma/schema.prisma
npm run prisma:migrate         # apply migrations (Prisma is a devDependency only)
npm run dev                    # ts-node-dev with auto-reload, port 8000
npm run build && npm start     # compile to dist/ and run
npm run type-check             # tsc --noEmit
npm run lint                   # eslint over src/**/*.ts
```

The Prisma schema in `prisma/schema.prisma` targets Postgres and includes lookup tables (`roles`, `users`, `admin_users`, `analyst_users`, `viewer_users`) and activity tables (`datasets`, `saved_queries`, `query_logs`, `feedback`, `chart_preferences`, `live_db_sessions`). Note: most runtime code uses the Supabase JS client (`getSupabase()`), not the Prisma client — `prisma.service.ts` is a thin singleton wrapper kept for tooling/migrations.

### Frontend (run from `frontend/`)

```bash
npm install
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL if backend is not on :8000
npm run dev                        # next dev, port 3000
npm run build
npm run start
npm run lint                       # next lint
```

There is no test suite in either workspace — `package.json` scripts are limited to dev/build/start/lint.

## High-level Architecture

### Backend layering

`backend/src/server.ts` boots `createApp()` from `app.ts`, then registers SIGTERM/SIGINT handlers that call `disconnectPrisma()`. `createApp()` wires (in order): helmet → CORS (allowlist of `env.FRONTEND_URL` + localhost:3000/3001) → JSON/urlencoded parsers → cookie-parser → compression → request logger (skipped in test env) → `generalLimiter` (100 req / 15 min) → routers → `errorHandler` (must be last).

Routers are mounted at:
- `/api/auth` — registration, login (Supabase password), Google OAuth code exchange, admin login (verifies `admin_credentials.code_hash`), email verification + password reset (JWT-signed tokens via `EMAIL_VERIFICATION_SECRET` / `PASSWORD_RESET_SECRET`), `/me`.
- `/api/queries` — `run` (internal DB), `run-live` (external Postgres connection string built from request body, never persisted), `save`, `saved`, `deleteSaved`, `history`, `feedback`. All require `authenticate`; mutating routes additionally call `requireRole("admin", "analyst")`.
- `/api/schema` — introspection of the internal database (consumed by the AI prompt).
- `/api/admin` — gated by `requireRole("admin")`; user CRUD, platform stats, all query logs. The moderator panel uses this.

`auth.middleware.ts` is the auth core: it verifies the Supabase access token via `sb.auth.getUser`, looks up the matching row in our `users` table by `supabase_uid`, and attaches `{ id, supabaseUid, fullName, email, status, roleName, createdAt }` as `req.user`. If a Supabase-authenticated user has no row yet (e.g. first Google sign-in), it auto-provisions one with the `viewer` role. `requireRole(...roles)` is a factory used per-route.

### SQL safety pipeline

`query.service.ts` is the heart of the read-only guarantee:
1. `validateSQL(sql)` rejects anything that isn't a single `SELECT`/`WITH`, blocks dangerous prefixes (INSERT/UPDATE/DELETE/DROP/ALTER/CREATE/TRUNCATE/REPLACE/GRANT/REVOKE/RENAME/LOCK/UNLOCK/CALL/EXEC/LOAD/IMPORT/EXPORT/ATTACH/DETACH/PRAGMA/VACUUM/ANALYZE/EXPLAIN ANALYZE), and blocks dangerous functions (SLEEP, BENCHMARK, LOAD_FILE, INTO OUTFILE, INTO DUMPFILE, USER(), etc.).
2. `executeSQL(sb, sql)` calls the Supabase RPC `execute_safe_select` (limit-applied to 500).
3. `executeSQLOnExternal(connStr, sql, ...)` opens a fresh `pg.Client` for the live mode and tears it down in `finally`.
4. PG error codes are mapped to human-readable messages in `PG_CODE_HINTS`. The 42P01 ("table does not exist") case is intentionally returned as `status: "template"` rather than an error so the UI can render a placeholder.

### AI provider abstraction

`ai.service.ts` exposes `extractIntent`, `generateSQL`, `generateInsight`. The provider is selected per request via `model_provider` (`groq` | `gemini` | `ollama`) with `env.DEFAULT_MODEL_PROVIDER` as fallback. All calls are wrapped in `withTimeout(30s)` and `withRetry(3 attempts, exponential backoff)`. The text-to-SQL prompt is hard-coded to emit only `SELECT`, to add `LIMIT 100` if absent, and to fall back to the user-supplied table/column names when not in the schema — only requests for data modification or completely off-topic requests return `CANNOT_ANSWER` (raised as `CannotAnswerError`).

### Request lifecycle for a "run query" call

`runQuery` in `query.controller.ts` does: extract intent (best-effort) → generate SQL → validate SQL → execute via Supabase RPC → log row in `query_logs` (returning the log id) → optionally call `generateInsight` on the first 20 rows. The same shape is mirrored in `runLiveQuery` but with a per-request connection string and no `dataset_id`. A `42P01` execution result short-circuits to `status: "template"`. All terminal states are logged via `logQuery` regardless of success/blocked/failed.

### Validation, errors, and rate limiting

- `validators/*.validator.ts` are Zod schemas; routes compose `validateBody(schema)` / `validateQuery(schema)` middleware.
- `utils/ApiError.ts` is the only error class. Throw it (or its static factories) — the global `errorHandler` turns it into a JSON response.
- `utils/asyncHandler.ts` wraps every async controller so a rejected promise is forwarded to `errorHandler`. Without it, an unhandled rejection would crash the process.
- `middlewares/rateLimit.middleware.ts` exposes `generalLimiter`, `authLimiter` (5/15min), and `queryLimiter` (30/min). Auth and query routes compose these explicitly; the rest inherit the general limiter.

### Frontend architecture

The frontend is a Next.js 14 App Router project with three route groups:
- `app/auth/` — public flows: `login`, `register`, `forgot-password`, `reset-password`, `verify-email`, `verify-email-warning`, `auth/callback` (Google OAuth).
- `app/(app)/` — authenticated user app (wrapped by `app/(app)/layout.tsx` with the Sidebar). Pages: `dashboard`, `query`, `history`, `saved`, `live-db`.
- `app/(moderator)/` — moderator/admin panel; uses a separate `mod_token` cookie + `sessionStorage`.

`app/middleware.ts` runs on every request and is the only place that enforces "unauthenticated users are redirected to `/login`" and "moderator routes require `mod_token`". It also calls `/api/auth/me` server-side on protected paths to check `email_verified`; if missing, it redirects to `/verify-email-warning`. The `isSafeRedirect` helper inside the middleware blocks protocol-relative (`//evil.com`) and non-same-origin redirects — preserve this when adding new redirect params.

Auth state lives in two parallel stores (intentional split between the user app and moderator panel):
- Main app: cookie `token` (js-cookie) + `sessionStorage.user` JSON. Helpers in `lib/auth.ts` (legacy) and `lib/auth/session.ts` (current).
- Moderator app: cookie `mod_token` + `sessionStorage.mod_user` / `sessionStorage.mod_token`. Helpers in `lib/auth/session.ts` (`saveModAuth`, `getModToken`, etc.).

`lib/api.ts` is the only HTTP client. It exposes two Axios instances:
- `api` — reads cookie `token`, redirects to `/login` on 401.
- `modApi` — reads `sessionStorage.mod_token`, used by the moderator panel against `/api/admin`.

`api.ts` also exports the typed `authApi`, `queryApi`, `schemaApi`, and `adminApi` namespaces. Add new endpoints there; do not call `axios` directly from components.

`app/auth/callback/page.tsx` handles three Google OAuth return paths: implicit-flow tokens in the URL hash/query, code-for-token exchange via `authApi.loginWithGoogle`, and a fallback that calls `authApi.me()`. After a successful callback, `saveAuth()` from `lib/auth/session.ts` is called to persist the token + user JSON, then the user is routed to `redirect_to` or `/dashboard`.

## Environment

`backend/src/config/env.ts` validates `process.env` with Zod at module load — the process exits with a clear error if anything is missing. Required: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `EMAIL_VERIFICATION_SECRET`, `PASSWORD_RESET_SECRET`. Optional (with defaults): `PORT` (8000), `NODE_ENV` (development), `GROQ_API_KEY`/`GEMINI_API_KEY`/`OLLAMA_URL`, `DEFAULT_MODEL_PROVIDER` (`groq`), `DEFAULT_MODEL_NAME` (`llama-3.3-70b-versatile`), `FRONTEND_URL` (http://localhost:3000), `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_APP_URL`.

The service-role Supabase client in `config/supabase.ts` is the one used for all backend DB reads/writes (it bypasses RLS). `getAuthClient()` returns a fresh anon-key client for sign-in flows so the service-role client's auth context is never disturbed.

## Conventions Worth Knowing

- Tables map 1:1 to snake_case Postgres tables; Prisma models use `@map` to point camelCase fields to snake_case columns (e.g. `createdAt → created_at`).
- Email verification currently signs a JWT (`type: 'email_verification'`) but does not update Supabase's `email_confirmed_at` — the login path checks `authUser.user.email_confirmed_at` separately, so unverified users are blocked at login.
- Admin login is separate (`/api/auth/admin-login`) and gated by an `admin_credentials` table with a `code_hash`; it cannot be reached via Supabase auth.
- `register` is public but rejects `role === "admin"`. Roles are otherwise limited to `analyst` and `viewer`; admin promotion happens only via the admin panel.
- The `mod_token` cookie is set in `app/(moderator)/login/page.tsx` and consumed by the middleware and `modApi`. Do not reuse the main `token` cookie for the moderator panel.
- The `directory-structure-guard` skill (`.agents/skills/`) is the project's defense against accidental nested duplicates (`backend/backend`, `frontend/frontend`); the harness has at times had to `rm -rf frontend/frontend` after mistakes.
