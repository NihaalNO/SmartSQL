# SmartSQL – Text-to-SQL Analytics Portal

A full-stack web app that lets users ask database questions in plain English, generates safe SQL via LangChain, executes it on MySQL, and displays results as tables and charts.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14, Tailwind CSS, Recharts |
| Backend | FastAPI (Python) |
| Database | MySQL |
| AI / Orchestration | LangChain (Groq / Gemini / Ollama) |
| ML Insights | scikit-learn |
| Live DB Mode | Supabase (PostgreSQL) — ephemeral |

---

## Setup

### 1. Database

```bash
mysql -u root -p < schema.sql
```

### 2. Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env — set MYSQL_PASSWORD, GROQ_API_KEY (or GEMINI_API_KEY), SECRET_KEY

# Run
uvicorn main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### 3. Frontend

```bash
cd frontend

npm install

# Configure environment
copy .env.local.example .env.local
# Edit .env.local if backend is not on port 8000

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

- **Natural-language query** → SQL generation via LangChain
- **SQL preview** before execution
- **Read-only guard**: only SELECT / SHOW / DESCRIBE are executed
- **Results** as paginated table + bar/line/pie/area charts
- **AI insight** summary per result set
- **Query history** with SQL expansion
- **Saved queries** with favorite marking
- **Live DB Mode**: ephemeral Supabase connection — credentials never persisted
- **scikit-learn** utilities for anomaly detection, clustering, and stats (available via `app/ai/ml_insights.py`)
- **Role-based access**: admin / analyst / viewer

---

## Project Structure

```
SmartSQL/
├── schema.sql                  # MySQL schema bootstrap
├── backend/
│   ├── main.py                 # FastAPI entry point
│   ├── requirements.txt
│   ├── .env.example
│   └── app/
│       ├── config.py           # Settings (pydantic-settings)
│       ├── db.py               # SQLAlchemy engine + session
│       ├── models.py           # ORM models (mirror of schema.sql)
│       ├── auth/               # Register, login, JWT, RBAC
│       ├── queries/            # run, run-live, save, history, feedback
│       ├── schema_service/     # Schema introspection endpoints
│       └── ai/
│           ├── langchain_agent.py   # Text-to-SQL + insight generation
│           └── ml_insights.py       # scikit-learn anomaly / cluster utils
└── frontend/
    ├── app/
    │   ├── (app)/              # Protected routes (sidebar layout)
    │   │   ├── dashboard/
    │   │   ├── query/
    │   │   ├── history/
    │   │   ├── saved/
    │   │   └── live-db/
    │   ├── login/
    │   └── register/
    ├── components/
    │   ├── Sidebar.tsx
    │   ├── QueryInput.tsx
    │   ├── SQLPreview.tsx
    │   ├── ResultsTable.tsx
    │   └── ChartView.tsx
    └── lib/
        ├── api.ts              # Axios client + all API calls
        └── auth.ts             # Cookie + sessionStorage auth helpers
```
