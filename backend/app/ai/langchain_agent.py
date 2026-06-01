import json
import re
from dataclasses import dataclass, field
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from app.config import get_settings

settings = get_settings()


# ---------------------------------------------------------------------------
# Data types
# ---------------------------------------------------------------------------

@dataclass
class QueryIntent:
    query_type: str = "SQL"
    table: str | None = None
    action: str = "select"
    attributes: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

class CannotAnswerError(ValueError):
    """Raised when the AI determines the question cannot be answered as a SELECT query."""


class NeedMoreContextError(ValueError):
    """Raised when the extracted intent cannot be validated against the known schema."""
    def __init__(self, message: str, intent: QueryIntent):
        super().__init__(message)
        self.intent = intent


# ---------------------------------------------------------------------------
# LLM factory
# ---------------------------------------------------------------------------

def _get_llm(provider: str | None = None, model_name: str | None = None):
    provider = provider or settings.DEFAULT_MODEL_PROVIDER
    model_name = model_name or settings.DEFAULT_MODEL_NAME

    if provider == "groq":
        from langchain_groq import ChatGroq
        return ChatGroq(api_key=settings.GROQ_API_KEY, model_name=model_name, temperature=0)

    if provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            google_api_key=settings.GEMINI_API_KEY,
            model=model_name or "gemini-1.5-flash",
            temperature=0,
        )

    if provider == "ollama":
        from langchain_community.chat_models import ChatOllama
        return ChatOllama(base_url=settings.OLLAMA_URL, model=model_name or "llama3")

    raise ValueError(f"Unknown provider: {provider}")


# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

INTENT_EXTRACTION_PROMPT = ChatPromptTemplate.from_messages([
    ("system", (
        "Extract the query intent from a natural language question about a database. "
        "Return ONLY a valid JSON object with exactly these four fields:\n"
        "  \"query_type\": always \"SQL\"\n"
        "  \"table\": the main table or entity name as a string, or null if not mentioned\n"
        "  \"action\": the primary SQL operation — one of: select, sort, filter, count, average, group, top\n"
        "  \"attributes\": JSON array of column/field names mentioned (empty array if none)\n\n"
        "Synonym rules (apply these when classifying action):\n"
        "  show / list / get / give / fetch / display / find  → select\n"
        "  sort / order / rank / arrange                       → sort\n"
        "  highest / top / best / most / maximum / max        → top\n"
        "  lowest / bottom / minimum / least / min            → sort\n"
        "  average / mean / avg                               → average\n"
        "  group / categorize / by category / breakdown       → group\n"
        "  count / how many / total number / number of        → count\n"
        "  filter / where / with / having / only / whose      → filter\n\n"
        "Return ONLY the JSON object. No explanation, no markdown fences."
    )),
    ("human", "{question}"),
])

TEXT_TO_SQL_PROMPT = ChatPromptTemplate.from_messages([
    ("system", (
        "You are an expert SQL assistant. Your job is to generate a SQL SELECT statement "
        "that answers the user's question.\n\n"
        "Rules:\n"
        "- Output ONLY the raw SQL query — no explanation, no markdown, no code fences.\n"
        "- Use ONLY SELECT statements. Never use INSERT, UPDATE, DELETE, DROP, ALTER, CREATE.\n"
        "- Add LIMIT 100 unless the user explicitly asks for all rows.\n"
        "- If the table or columns the user mentions exist in the schema below, use the exact "
        "names from the schema.\n"
        "- If the table or columns the user mentions do NOT appear in the schema, generate a "
        "general SQL query using the table and column names directly from the user's question "
        "as if they existed. Do NOT refuse or return CANNOT_ANSWER just because a table is "
        "missing from the schema — always produce a best-effort query.\n"
        "- Only output CANNOT_ANSWER if the user is asking to modify data "
        "(INSERT, UPDATE, DELETE, DROP) or the request is completely unrelated to databases.\n\n"
        "SQL synonym mappings to apply:\n"
        "- sort / order / rank / arrange          → ORDER BY\n"
        "- highest / top / best / most / max      → ORDER BY ... DESC LIMIT N\n"
        "- lowest / bottom / least / min          → ORDER BY ... ASC LIMIT N\n"
        "- show / list / get / give / fetch       → SELECT\n"
        "- average / mean / avg                   → AVG()\n"
        "- count / how many / total number        → COUNT()\n"
        "- group / categorize / breakdown / by    → GROUP BY\n"
        "- filter / where / with / only / whose   → WHERE\n\n"
        "Database Schema (for reference — use if the table exists here, otherwise use the "
        "user's own table/column names):\n{schema}"
    )),
    ("human", "{question}"),
])

INSIGHT_PROMPT = ChatPromptTemplate.from_messages([
    ("system", (
        "You are a data analyst assistant. Given a SQL query result, provide a concise "
        "natural-language insight (2-4 sentences). Focus on patterns, anomalies, and key takeaways. "
        "Do not repeat the raw numbers verbatim."
    )),
    ("human", "Query: {query}\n\nResults (first 20 rows):\n{results}"),
])


# ---------------------------------------------------------------------------
# Schema parsing helpers
# ---------------------------------------------------------------------------

def _parse_schema_tables(schema_text: str) -> dict[str, list[str]]:
    """Parse schema text into {table_name: [column_names]}, all lowercase."""
    tables: dict[str, list[str]] = {}
    current_table: str | None = None
    for line in schema_text.splitlines():
        if line.startswith("Table: "):
            current_table = line[7:].strip().lower()
            tables[current_table] = []
        elif (
            line.startswith("  ")
            and current_table is not None
            and line.strip()
            and not line.strip().lower().startswith("columns")
        ):
            col_name = line.strip().split()[0].lower()
            if col_name:
                tables[current_table].append(col_name)
    return tables


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def extract_intent(
    question: str,
    provider: str | None = None,
    model: str | None = None,
) -> QueryIntent:
    """Extract structured query intent from a natural language question via LLM."""
    llm = _get_llm(provider, model)
    chain = INTENT_EXTRACTION_PROMPT | llm | StrOutputParser()
    raw = chain.invoke({"question": question})
    raw = re.sub(r"```(?:json)?", "", raw, flags=re.IGNORECASE).strip().strip("`").strip()
    try:
        data = json.loads(raw)
        return QueryIntent(
            query_type=str(data.get("query_type", "SQL")),
            table=data.get("table") or None,
            action=str(data.get("action", "select")),
            attributes=[str(a) for a in data.get("attributes", [])],
        )
    except (json.JSONDecodeError, TypeError, AttributeError):
        return QueryIntent()  # safe fallback — don't block the query


def validate_intent_against_schema(
    intent: QueryIntent,
    schema_text: str,
) -> tuple[bool, str]:
    """
    Check that the intent's table and attributes actually exist in the schema.

    Returns (True, "") when valid or when there is nothing specific to validate.
    Returns (False, message) when the schema lacks required context.
    """
    if not intent.table:
        # No specific table mentioned — let SQL generation proceed
        return True, ""

    tables = _parse_schema_tables(schema_text)
    available_tables = sorted(tables.keys())
    table_key = intent.table.lower()

    if table_key not in tables:
        table_list = ", ".join(f"`{t}`" for t in available_tables) if available_tables else "none found"
        return False, (
            f"Need more reference. The table `{intent.table}` was not found in the schema. "
            f"Available tables: {table_list}. "
            f"Please confirm the table name or provide the schema."
        )

    if intent.attributes:
        known_cols = tables[table_key]
        missing = [a for a in intent.attributes if a.lower() not in known_cols]
        if missing:
            col_list = ", ".join(f"`{c}`" for c in known_cols) if known_cols else "none"
            missing_fmt = ", ".join(f"`{m}`" for m in missing)
            return False, (
                f"Need more reference. Column(s) {missing_fmt} were not found in `{intent.table}`. "
                f"Available columns: {col_list}. "
                f"Please confirm the column names or provide the full table schema."
            )

    return True, ""


def generate_sql(
    schema: str,
    question: str,
    provider: str | None = None,
    model: str | None = None,
) -> str:
    """Generate a SQL SELECT statement from a natural language question."""
    llm = _get_llm(provider, model)
    chain = TEXT_TO_SQL_PROMPT | llm | StrOutputParser()
    raw = chain.invoke({"schema": schema, "question": question})
    raw = re.sub(r"```(?:sql)?", "", raw, flags=re.IGNORECASE).strip().strip("`").strip()

    if raw.strip().upper() == "CANNOT_ANSWER" or "Unable to generate query for this question" in raw:
        raise CannotAnswerError(
            "This question cannot be answered as a read-only SQL query. "
            "Try asking about data you want to view — for example: "
            "'Show me all students', 'How many records are in the orders table?', "
            "or 'What are the top 5 products by sales?'"
        )
    return raw


def generate_insight(
    question: str,
    results_preview: str,
    provider: str | None = None,
    model: str | None = None,
) -> str:
    try:
        llm = _get_llm(provider, model)
        chain = INSIGHT_PROMPT | llm | StrOutputParser()
        return chain.invoke({"query": question, "results": results_preview})
    except Exception:
        return ""
