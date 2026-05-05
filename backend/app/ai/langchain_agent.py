from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from app.config import get_settings
import re

settings = get_settings()


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


TEXT_TO_SQL_PROMPT = ChatPromptTemplate.from_messages([
    ("system", (
        "You are an expert SQL assistant. Given a database schema and a user question, "
        "generate a single read-only SQL SELECT statement that answers the question. "
        "Rules:\n"
        "- Output ONLY the SQL query, no explanation, no markdown code fences.\n"
        "- Use only SELECT statements. Never use INSERT, UPDATE, DELETE, DROP, ALTER.\n"
        "- Use exact table and column names from the schema.\n"
        "- Add a LIMIT 100 clause unless the user asks for all rows.\n"
        "- If the question cannot be answered with the schema, output: SELECT 'Unable to generate query for this question' AS message;\n\n"
        "Database Schema:\n{schema}"
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


def generate_sql(schema: str, question: str, provider: str | None = None, model: str | None = None) -> str:
    llm = _get_llm(provider, model)
    chain = TEXT_TO_SQL_PROMPT | llm | StrOutputParser()
    raw = chain.invoke({"schema": schema, "question": question})
    # Strip markdown fences if the model adds them despite instructions
    raw = re.sub(r"```(?:sql)?", "", raw, flags=re.IGNORECASE).strip().strip("`").strip()
    return raw


def generate_insight(question: str, results_preview: str, provider: str | None = None, model: str | None = None) -> str:
    try:
        llm = _get_llm(provider, model)
        chain = INSIGHT_PROMPT | llm | StrOutputParser()
        return chain.invoke({"query": question, "results": results_preview})
    except Exception:
        return ""
