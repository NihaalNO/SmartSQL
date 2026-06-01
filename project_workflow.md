# SmartSQL — Project Workflow

## Overview

SmartSQL is a natural-language-to-SQL web app. Users type questions in plain English; the backend translates them to SQL using an LLM, executes the query against a PostgreSQL database, and returns results with optional AI-generated insights. The app supports two database modes: an **internal Supabase database** and any **external PostgreSQL database** via live ephemeral credentials.

---

## Architecture at a Glance

```
Browser (Next.js 14)
      │
      │  REST (JSON + JWT Bearer)
      ▼
FastAPI backend  ──►  LangChain (Groq / Gemini / Ollama)
      │
      ├──►  Supabase (auth, DB, RPC)
      └──►  External PostgreSQL (optional, via live-db credentials)
```

---

## Flowcharts

### System Architecture

```mermaid
flowchart TD
    User(["👤 User (Browser)"])

    subgraph Frontend["Frontend — Next.js 14"]
        UI["Pages & Components"]
        APILib["lib/api.ts\nAxios + Auth Interceptor"]
    end

    subgraph Backend["Backend — FastAPI"]
        Auth["auth/\nrouter + utils"]
        Queries["queries/\nrouter"]
        Schema["schema_service/\nrouter + service"]
        Validator["sql_validator.py"]
        Executor["sql_executor.py"]
        AI["ai/langchain_agent.py"]
    end

    subgraph LLM["LLM Providers"]
        Groq["Groq"]
        Gemini["Gemini"]
        Ollama["Ollama"]
    end

    subgraph DB["Data Layer"]
        Supabase[("Supabase\nPostgreSQL + Auth + RPC")]
        ExtDB[("External\nPostgreSQL")]
    end

    User --> UI
    UI --> APILib
    APILib -->|"REST + Bearer JWT"| Auth
    APILib -->|"REST + Bearer JWT"| Queries
    APILib -->|"REST + Bearer JWT"| Schema

    Auth -->|"sign_in / create_user"| Supabase
    Schema -->|"get_public_schema() RPC"| Supabase
    Queries --> Validator
    Validator -->|"safe"| Executor
    Executor -->|"execute_safe_select() RPC"| Supabase
    Executor -->|"live-db direct TCP"| ExtDB
    Queries --> AI
    AI --> Groq & Gemini & Ollama
```

---

### Authentication Flow

```mermaid
flowchart TD
    Start(["Request"]) --> HasToken{Has Bearer\ntoken?}

    HasToken -->|No — public route| Public(["Proceed\n/register or /login"])
    HasToken -->|Yes| Verify["verify_supabase_token()\nValidate JWT signature"]

    Verify -->|Invalid| E401(["401 Unauthorized"])
    Verify -->|Valid| FetchUser["Query users table\nfor app metadata"]
    FetchUser --> Active{status\n== active?}
    Active -->|No| E403A(["403 Forbidden"])
    Active -->|Yes| RoleCheck{requires\nspecific role?}
    RoleCheck -->|No| Allow(["Proceed to handler"])
    RoleCheck -->|Yes — matches| Allow
    RoleCheck -->|No — mismatch| E403B(["403 Forbidden"])

    subgraph Register["POST /register"]
        R1["Check email uniqueness"] --> R2["auth.admin.create_user()"]
        R2 --> R3["INSERT users row\n→ trigger: role ext + chart_prefs"]
        R3 --> R4["sign_in_with_password()\nfresh anon client"]
        R4 --> R5(["Return JWT + user metadata"])
    end

    subgraph Login["POST /login"]
        L1["sign_in_with_password()\nfresh anon client"] --> L2["Query users table"]
        L2 --> L3{status\nactive?}
        L3 -->|No| LE(["403 Forbidden"])
        L3 -->|Yes| L4(["Return JWT + user metadata"])
    end
```

---

### Core Query Flow (Internal DB)

```mermaid
flowchart TD
    Q(["POST /api/queries/run\n{ question, model_provider, include_insight }"])

    Q --> Auth["Authenticate + authorise\nget_current_user()"]
    Auth --> Schema["get_internal_schema()\nget_public_schema() RPC → markdown text"]
    Schema --> GenSQL["generate_sql(schema, question)\nlangchain_agent.py → LLM"]

    GenSQL --> CanAnswer{LLM returns\nCANNOT_ANSWER?}
    CanAnswer -->|Yes| LogBlocked1["_log_query(status=blocked)"]
    LogBlocked1 --> ErrCA(["Return error:\nquestion out of scope"])

    CanAnswer -->|No — got SQL| Validate["validate_sql(generated_sql)\nRegex safety check"]
    Validate --> Safe{is_safe?}
    Safe -->|No| LogBlocked2["_log_query(status=blocked)"]
    LogBlocked2 --> ErrUnsafe(["Return error:\nunsafe SQL"])

    Safe -->|Yes| Execute["execute_sql(sb, sql)\nexecute_safe_select() RPC\nApply LIMIT 500 if missing"]
    Execute --> ExecOK{Execution\nsucceeded?}
    ExecOK -->|No| LogFail["_log_query(status=error)"]
    LogFail --> ErrExec(["Return error:\nDB execution failed"])

    ExecOK -->|Yes| LogOK["_log_query(status=success)\nINSERT into query_logs"]
    LogOK --> Insight{include_insight\n&& rows > 0?}

    Insight -->|No| Result
    Insight -->|Yes| GenInsight["generate_insight(question, rows[:20])\nLLM → 2-4 sentence summary"]
    GenInsight --> Result(["Return QueryResult\n{ sql, columns, rows, row_count,\n  execution_time_ms, log_id, insight }"])
```

---

### Live Database Flow (External PostgreSQL)

```mermaid
flowchart TD
    LQ(["POST /api/queries/run-live\n{ question, db_host, db_port,\n  db_name, db_user, db_password }"])

    LQ --> Auth2["Authenticate\nrequire_role(admin, analyst)"]
    Auth2 --> ConnStr["Build connection string\npostgresql://user:pass@host:port/db"]
    ConnStr --> ExtSchema["get_external_schema(conn_str)\nSQLAlchemy inspector → markdown text"]

    ExtSchema --> SchemaOK{Schema\nfetched OK?}
    SchemaOK -->|No| ErrConn(["Return error:\nCannot connect / SSL / auth failed"])

    SchemaOK -->|Yes| GenSQL2["generate_sql(schema, question)\nLangChain → LLM"]
    GenSQL2 --> Validate2["validate_sql(generated_sql)"]
    Validate2 --> Safe2{is_safe?}
    Safe2 -->|No| ErrV(["Return error: unsafe SQL"])

    Safe2 -->|Yes| ExecExt["execute_sql_on_external(conn_str, sql)\nSQLAlchemy direct TCP connection"]
    ExecExt --> Result2(["Return QueryResult\n(no query_logs insert)"])
```

---

### Save / History / Feedback Flow

```mermaid
flowchart LR
    Run(["Query executed\nlog_id returned"]) --> SaveQ

    subgraph SaveQ["Save a Query"]
        S1["POST /api/queries/save\n{ log_id, title, chart_type }"] --> S2["INSERT saved_queries\nreferencing query_logs row"]
    end

    subgraph HistoryQ["View History"]
        H1["GET /api/queries/history"] --> H2["SELECT last 50 query_logs\nfor current user"]
    end

    subgraph FeedbackQ["Submit Feedback"]
        F1["POST /api/queries/feedback\n{ log_id, rating 1-5, comments }"] --> F2["UPSERT feedback\non log_id"]
    end

    subgraph ManageSaved["Manage Saved"]
        MS1["GET /api/queries/saved"] --> MS2["List saved_queries\n(newest first)"]
        MS3["DELETE /api/queries/saved/{id}"] --> MS4["Remove saved query"]
    end
```

---

## Directory Structure

```
SmartSQL/
├── backend/                    Python / FastAPI
│   ├── main.py                 App bootstrap, CORS, global exception handlers
│   ├── requirements.txt        Python dependencies
│   ├── .env.example            Template for all required env vars
│   ├── seed_demo.py            Demo data seeder
│   └── app/
│       ├── config.py           Pydantic Settings — loads .env, exposes get_settings()
│       ├── db.py               SQLAlchemy engine (legacy, kept for reference)
│       ├── models.py           ORM model definitions (11 tables)
│       ├── supabase_client.py  Supabase SDK — service-role + anon client factories
│       ├── auth/               Authentication & authorization module
│       │   ├── router.py       POST /register /login /token; GET /me
│       │   ├── schemas.py      Pydantic request/response models
│       │   └── utils.py        JWT validation, get_current_user dep, require_role()
│       ├── queries/            Query execution engine
│       │   ├── router.py       POST /run /run-live /save /feedback; GET /saved /history
│       │   ├── schemas.py      QueryRequest, QueryResult, SaveQueryRequest, etc.
│       │   ├── sql_executor.py execute_sql() (RPC) and execute_sql_on_external() (direct)
│       │   └── sql_validator.py Regex safety checks — blocks mutating / dangerous SQL
│       ├── schema_service/     Schema introspection
│       │   ├── router.py       GET /internal /internal/tables
│       │   └── service.py      Fetch schema as text (for AI) or JSON (for frontend)
│       └── ai/
│           └── langchain_agent.py  generate_sql(), generate_insight(), _get_llm()
│
├── frontend/                   Next.js 14 / TypeScript / Tailwind
│   ├── app/
│   │   ├── page.tsx            Public landing page
│   │   ├── login/page.tsx      Login form
│   │   ├── register/page.tsx   Registration form
│   │   └── (app)/              Protected route group (requires JWT cookie)
│   │       ├── layout.tsx      Authenticated shell with Sidebar
│   │       ├── dashboard/      Admin/analyst summary view
│   │       ├── query/          Main NLQ query interface
│   │       ├── history/        Query execution log
│   │       ├── saved/          Saved queries manager
│   │       └── live-db/        Ephemeral external-DB connection form
│   ├── components/
│   │   ├── Sidebar.tsx         Navigation + auth state
│   │   ├── QueryInput.tsx      Natural language textarea + provider picker
│   │   ├── SQLPreview.tsx      Read-only code block for generated SQL
│   │   ├── ResultsTable.tsx    Paginated table + CSV export
│   │   └── ChartView.tsx       Recharts bar/line/pie/area visualisation
│   └── lib/
│       ├── api.ts              Axios instance, auth interceptor, all API functions
│       └── auth.ts             Cookie/sessionStorage helpers, role check utilities
│
├── supabase_schema.sql         Full PostgreSQL schema (roles, users, queries, logs…)
└── supabase_functions.sql      RPC helpers: get_public_schema, execute_safe_select
```

---

## Database Schema (Supabase / PostgreSQL)

| Table | Purpose |
|---|---|
| `roles` | Lookup: admin, analyst, viewer |
| `users` | Core user record (linked to Supabase Auth via `supabase_uid`) |
| `admin_users` | 1:1 extension — admin-specific fields |
| `analyst_users` | 1:1 extension — analyst-specific fields |
| `viewer_users` | 1:1 extension — viewer-specific fields |
| `datasets` | Named dataset entries (internal or external) |
| `saved_queries` | Queries a user has explicitly saved |
| `query_logs` | Every execution attempt (success and failure) |
| `feedback` | 1–5 star rating on a query_log entry |
| `chart_preferences` | Per-user default chart settings |
| `live_db_sessions` | Ephemeral credentials for external DB connections |

A DB trigger auto-provisions the matching role extension row and `chart_preferences` row on user insert.

---

## Environment Variables

Defined in `backend/.env` (template: `.env.example`):

```
SUPABASE_URL            # Supabase project URL
SUPABASE_ANON_KEY       # Public anon key
SUPABASE_SERVICE_ROLE_KEY # Service-role key (bypasses RLS)
SUPABASE_JWT_SECRET     # For JWT validation

DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD  # Direct Neon PG (fallback)

GROQ_API_KEY            # Groq LLM provider
GEMINI_API_KEY          # Google Gemini LLM provider
OLLAMA_URL              # Self-hosted Ollama endpoint

DEFAULT_MODEL_PROVIDER  # groq | gemini | ollama
DEFAULT_MODEL_NAME      # e.g. llama3-8b-8192

FRONTEND_URL            # CORS allowed origin
```

---

## Authentication Flow

### Register

```
POST /api/auth/register  { full_name, email, password, role }

1. Check email uniqueness in users table
2. Create Supabase Auth user via auth.admin.create_user()
3. Insert users row  →  DB trigger creates role extension + chart_preferences
4. Sign in via fresh anon client → get JWT
5. Return { access_token, user_id, full_name, email, role }
```

### Login

```
POST /api/auth/login  { email, password }

1. sign_in_with_password() via fresh anon client (avoids polluting service-role auth state)
2. Query users table for app metadata (role, status)
3. Validate status == "active"
4. Return { access_token, user_id, full_name, email, role }
```

### Protected Routes

Every protected API endpoint uses `get_current_user` as a FastAPI dependency:

```
Request  →  OAuth2 extracts Bearer token
         →  verify_supabase_token() validates JWT signature
         →  Query users table → returns CurrentUser dataclass
         →  (optional) require_role("admin", "analyst") → 403 if insufficient
```

---

## Core Query Flow (Internal Database)

This is the primary feature: natural language → SQL → results.

```
POST /api/queries/run  { question, dataset_id?, model_provider?, include_insight? }
```

```
User types question
      │
      ▼
[1] get_internal_schema(sb)
      │  Calls get_public_schema() RPC on Supabase
      │  Returns markdown schema: "Table: users\n  Columns:\n    id integer…"
      │
      ▼
[2] generate_sql(schema, question, provider)          ← langchain_agent.py
      │  Builds ChatPromptTemplate with schema + rules
      │  Calls LLM (Groq / Gemini / Ollama)
      │  Returns raw SQL string  OR  "CANNOT_ANSWER"
      │
      ▼  (if CANNOT_ANSWER → log as blocked, return error)
      │
[3] validate_sql(generated_sql)                       ← sql_validator.py
      │  Regex checks — blocks INSERT/UPDATE/DELETE/DROP/ALTER/TRUNCATE etc.
      │  Returns (is_safe: bool, reason: str)
      │
      ▼  (if not safe → log as blocked, return error)
      │
[4] execute_sql(sb, sql)                              ← sql_executor.py
      │  Calls execute_safe_select() RPC on Supabase
      │  Applies LIMIT 500 if missing
      │  Measures execution_time_ms
      │  Returns { columns, rows, row_count, execution_time_ms }
      │
      ▼
[5] _log_query() → INSERT into query_logs
      │  Stores: question, SQL, status, time, row_count, provider, user_id
      │
      ▼  (if include_insight and rows exist)
      │
[6] generate_insight(question, rows_preview)          ← langchain_agent.py
      │  Sends first 20 rows as JSON to LLM
      │  Returns 2–4 sentence plain-English summary
      │
      ▼
Return QueryResult { generated_sql, columns, rows, row_count,
                     execution_time_ms, log_id, insight }
```

---

## Live Database Flow (External PostgreSQL)

```
POST /api/queries/run-live  { question, db_host, db_port, db_name, db_user, db_password, ssl_required }
```

```
[1] Build connection string  →  postgresql://user:pass@host:port/db
[2] get_external_schema(conn_str)  →  SQLAlchemy inspector → markdown schema text
[3] generate_sql(schema, question, provider)   (same LangChain step as internal)
[4] validate_sql(generated_sql)               (same regex check)
[5] execute_sql_on_external(conn_str, sql)    →  SQLAlchemy direct TCP connection
[6] Return QueryResult  (no query_logs insert for live queries)
```

The frontend's **Live DB** page (`/live-db`) stores credentials in component state only — they are never persisted to the database.

---

## Schema Service Flow

```
GET /api/schema/internal         → plain text (used internally by AI)
GET /api/schema/internal/tables  → structured JSON (used by frontend schema explorer)

Both call get_public_schema() RPC → group columns by table → format
```

---

## Save / History / Feedback Flow

```
POST /api/queries/save   { log_id, title, chart_type?, is_favorite? }
   → Creates saved_queries row referencing the query_log entry

GET  /api/queries/saved  → List user's saved_queries (newest first)
DELETE /api/queries/saved/{id}  → Remove a saved query

GET  /api/queries/history  → Last 50 query_logs for current user

POST /api/queries/feedback  { log_id, rating (1-5), comments? }
   → INSERT into feedback table (upserts on log_id)
```

---

## LangChain Agent Details

### LLM Providers (`_get_llm`)

| Provider | Class | Key env var |
|---|---|---|
| `groq` | `ChatGroq` | `GROQ_API_KEY` |
| `gemini` | `ChatGoogleGenerativeAI` | `GEMINI_API_KEY` |
| `ollama` | `ChatOllama` | `OLLAMA_URL` |

### Text-to-SQL Prompt Rules

The system prompt instructs the LLM to:
- Output **only** raw SQL — no markdown, no explanations
- Generate **SELECT** statements only
- Use **exact** table and column names from the provided schema
- Add `LIMIT 100` unless the user asks for all rows
- Output the literal string `CANNOT_ANSWER` if the question cannot be addressed with the available schema

### Insight Generation

After execution, if results exist and `include_insight=True`:
- First 20 rows are serialised to JSON and sent to the LLM
- The model returns a 2–4 sentence natural-language summary of what the data shows

---

## Frontend Data Flow

### API Layer (`lib/api.ts`)

- Axios instance with base URL pointing to FastAPI backend
- Request interceptor: attaches `Authorization: Bearer <token>` from sessionStorage/cookie
- Response interceptor: redirects to `/login` on 401

### Key Pages

| Route | Component | What it does |
|---|---|---|
| `/` | `page.tsx` | Public landing; links to login/register |
| `/login` | `login/page.tsx` | POSTs to `/api/auth/login`, stores token |
| `/register` | `register/page.tsx` | POSTs to `/api/auth/register`, auto-login |
| `/(app)/query` | `query/page.tsx` | Main interface: `QueryInput` → API → `SQLPreview` + `ResultsTable` + `ChartView` |
| `/(app)/dashboard` | `dashboard/page.tsx` | Summary stats, recent activity for admin/analyst |
| `/(app)/history` | `history/page.tsx` | Lists `query_logs`, click to replay |
| `/(app)/saved` | `saved/page.tsx` | Lists `saved_queries`, delete, mark favourite |
| `/(app)/live-db` | `live-db/page.tsx` | Credential form → `/api/queries/run-live` |

### Role-Based UI

The `Sidebar` component reads the user's role from auth state and conditionally renders navigation items. Role checks also guard page-level access — viewers cannot access admin-only sections.

---

## Role Permissions Summary

| Action | Viewer | Analyst | Admin |
|---|---|---|---|
| Run internal queries | Yes | Yes | Yes |
| Run live-db queries | No | Yes | Yes |
| Save queries | No | Yes | Yes |
| View history | Yes | Yes | Yes |
| Submit feedback | Yes | Yes | Yes |
| View dashboard | No | Yes | Yes |
| Manage users | No | No | Yes |

---

## SQL Safety Model

SmartSQL enforces read-only SQL at two layers:

1. **Application layer** (`sql_validator.py`): Regex blocks any statement containing `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `CREATE`, `TRUNCATE`, `GRANT`, `REVOKE`, `SLEEP`, `BENCHMARK`, `LOAD_FILE`, `INTO OUTFILE`. Returns an error before execution.

2. **Database layer** (`execute_safe_select` RPC): The Supabase RPC function is defined with `SECURITY DEFINER` and only allows `SELECT` statements at the PostgreSQL level.

External queries rely only on the application-layer validator.

---

## Supabase Client Design

Two clients are maintained to avoid auth state mutation:

```python
get_supabase()     → cached service-role client  (all table/RPC operations)
get_auth_client()  → fresh anon-key client        (sign_in_with_password only)
```

Calling `sign_in_with_password()` on the service-role client would mutate its auth context globally, breaking all subsequent table queries for all users. The fresh anon client is created per-request for auth operations only.

---

## Running the Project

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env          # fill in credentials
uvicorn main:app --reload
```

API available at `http://localhost:8000`. Swagger docs at `/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App available at `http://localhost:3000`.

### Seeding Demo Data

```bash
cd backend
python seed_demo.py
```
