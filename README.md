# SmartSQL – Text-to-SQL Analytics Portal

A full-stack web app that lets users ask database questions in plain English, generates safe SQL via LangChain, executes it on MySQL, and displays results as tables and charts.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14, Tailwind CSS, Recharts, Shadcn/UI |
| Backend | Node.js (Express.js), TypeScript, Prisma ORM |
| Database | MySQL (primary), Supabase (PostgreSQL) – ephemeral live DB mode |
| AI / Orchestration | LangChain (Groq / Gemini / Ollama) |
| ML Insights | scikit-learn (via Python service) |
| Email | SendGrid (transactional emails) |
| Auth | JWT, bcrypt, role‑based access (admin/analyst/viewer) |

---

## Setup

### 1. Database (MySQL)

```bash
# Apply the schema (located in documents/schema.sql)
mysql -u root -p < documents/schema.sql
```

### 2. Backend (Express.js + TypeScript + Prisma)

```bash
cd backend

# Install dependencies
npm install

# Copy example environment file and configure
cp .env.example .env
# Edit .env – set at least:
#   DATABASE_URL (MySQL connection string)
#   SENDGRID_API_KEY, SENDGRID_FROM_EMAIL
#   SUPABASE_URL, SUPABASE_ANON_KEY
#   GROQ_API_KEY (or GEMINI_API_KEY / OLLAMA_URL)
#   JWT_SECRET, JWT_EXPIRES_IN
#   NODE_ENV=development

# Generate Prisma client
npm run prisma:generate

# Run migrations (creates tables if needed)
npm run prisma:migrate

# Start development server
npm run dev
```

API docs: http://localhost:8000/docs (if enabled) or check the routes.

### 3. Frontend (Next.js 14)

```bash
cd frontend

npm install

# Copy example environment file and configure if backend runs on a different port
cp .env.local.example .env.local
# Edit .env.local – adjust NEXT_PUBLIC_API_URL if needed

npm run dev
```

App: http://localhost:3000

---

## AI Provider Configuration

Set **at least one** provider in `backend/.env`:

| Provider | Key | Model (default) |
|---|---|---|
| Groq (fast, free tier) | `GROQ_API_KEY` | `llama3-70b-8192` |
| Google Gemini | `GEMINI_API_KEY` | `gemini-1.5-flash` |
| Ollama (local) | `OLLAMA_URL=http://localhost:11434` | `llama3` |

Set `DEFAULT_MODEL_PROVIDER=groq` (or `gemini` / `ollama`).

---

## Features

- **Natural‑language query** → SQL generation via LangChain (Groq/Gemini/Ollama)
- **SQL preview** before execution
- **Read‑only guard**: only `SELECT` / `SHOW` / `DESCRIBE` are executed
- **Results** as paginated table + bar/line/pie/area charts (Recharts)
- **AI insight** summary per result set
- **Query history** with SQL expansion
- **Saved queries** with favorite marking
- **Role‑based access**: admin / analyst / viewer (JWT‑based)
- **Email notifications**: verification, password reset, etc. (SendGrid)
- **Live DB Mode**: ephemeral Supabase connection – credentials never persisted
- **scikit‑learn** utilities for anomaly detection, clustering, and stats (available via backend AI service)
- **Admin / moderator panel** (hidden routes) for platform oversight
- **Authentication flows**: login, register, forgot password, reset password, email verification
- **Prisma ORm** for type‑safe database access
- **Type‑safe backend** (TypeScript) and frontend (Next.js with Tailwind & Shadcn/UI)

---

## Project Structure

```
SmartSQL/
├── documents/schema.sql                # MySQL schema bootstrap
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── prisma/                         # Prisma schema & migrations
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   │   ├── app.ts                      # Express app setup
│   │   ├── server.ts                   # Entry point
│   │   ├── config/
│   │   │   └── env.ts                  # Environment validation
│   │   ├── constants/                  # Application constants
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts      # Auth endpoints (login, register, etc.)
│   │   │   ├── query.controller.ts     # Query execution & history
│   │   │   ├── schema.controller.ts    # Database introspection
│   │   │   └── admin.controller.ts     # Admin‑only moderator routes
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.ts      # JWT verification & RBAC
│   │   │   └── ...                     # error handling, logging, etc.
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── query.routes.ts
│   │   │   ├── schema.routes.ts
│   │   │   └── admin.routes.ts
│   │   ├── services/
│   │   │   ├── auth.service.ts         # Auth logic (JWT, bcrypt)
│   │   │   ├── email.service.ts        # SendGrid email sending
│   │   │   ├── ai.service.ts           # LangChain agent + SQL generation
│   │   │   ├── query.service.ts        # Query execution & history
│   │   │   ├── schema.service.ts       # Schema introspection
│   │   │   ├── admin.service.ts        # Admin business logic
│   │   │   └── prisma.service.ts       # Prisma client wrapper
│   │   ├── validators/
│   │   │   ├── auth.validator.ts       # Joi/Zod validation for auth
│   │   │   ├── query.validator.ts
│   │   │   └── schema.validator.ts
│   │   ├── types/                      # TypeScript interfaces & enums
│   │   └── utils/                      # Helper functions (password, tokens, etc.)
└── frontend/
    ├── package.json
    ├── tsconfig.json
    ├── .env.local.example
    ├── globals.css
    ├── layout.tsx                      # Root layout (authentication check)
    ├── middleware.ts                   # Next.js middleware (protected routes)
    ├── page.tsx                        # Landing page
    ├── app/                            # Protected dashboard routes (sidebar layout)
    │   ├── (app)/
    │   │   ├── dashboard/
    │   │   ├── query/
    │   │   ├── history/
    │   │   ├── saved/
    │   │   └── live-db/
    │   ├── (moderator)/                # Moderator‑only routes
    │   ├── (protected)/                # Analyst/viewer routes
    │   ├── auth/
    │   │   ├── login/
    │   │   ├── register/
    │   │   ├── forgot-password/
    │   │   ├── reset-password/
    │   │   ├── verify-email/
    │   │   └── verify-email-warning/
    │   └── ...                         # other route groups
    ├── components/                     # Reusable UI (Shadcn/UI based)
    │   ├── Sidebar.tsx
    │   ├── QueryInput.tsx
    │   ├── SQLPreview.tsx
    │   ├── ResultsTable.tsx
    │   └── ChartView.tsx
    └── lib/                            # Utilities
        ├── api.ts                      # Axios client + all API calls
        └── auth.ts                     # Cookie + sessionStorage auth helpers
```

---

## Development Notes

- **Backend** uses Prisma ORM; run `npm run prisma:generate` after changing `prisma/schema.prisma`.
- **Email** service requires a verified SendGrid sender; set `SENDGRID_FROM_EMAIL` accordingly.
- **Supabase** live DB mode is configured via `SUPABASE_URL` and `SUPABASE_ANON_KEY`; connections are temporary and not stored.
- **Admin/moderator** routes are guarded by role checks (`admin` or `moderator` roles) and are not linked from the UI by default.
- To seed demo data, run `npm run prisma:seed` (ensure a seed script exists in `prisma/seed.ts`).

---

## License

MIT