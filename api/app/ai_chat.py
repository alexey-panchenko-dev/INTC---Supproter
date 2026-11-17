import io
import logging
import time
import urllib.request
from functools import lru_cache
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from openai import OpenAI
from pydantic_settings import BaseSettings, SettingsConfigDict
from pypdf import PdfReader
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import require_approved_student, require_same_origin
from app.db import get_db
from app.models import Document
from app.schemas import ChatRequest


class AISettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", env_prefix="AI_")
    api_key: str = ""
    base_url: str = "https://api.openai.com/v1"
    model: str = "gpt-6-astra"
    max_tokens: int = 400


ai_settings = AISettings()

PROMPT = """Ты консультант Инновационного технического колледжа г. Алматы.
Отвечай ТОЛЬКО на основе текста ниже.
Правила:
1. Если вопрос не про колледж, ответь: "Я отвечаю только на вопросы о колледже."
2. Если вопрос про колледж, но ответа нет в тексте, ответь: "Пока не имею данной информации."
3. Ничего не выдумывай и не добавляй от себя. Отвечай кратко.

ТЕКСТ:
{context}"""

NO_DATA = "Пока не имею данной информации."
CACHE_TTL = 3600
MAX_DOC_CHARS = 20000
MAX_TOTAL_CHARS = 60000
KNOWLEDGE_DIR = Path(__file__).resolve().parent.parent / "knowledge"

_cache: dict[str, tuple[float, str]] = {}

ai_router = APIRouter(prefix="/api/v1", dependencies=[Depends(require_approved_student)])


@lru_cache
def get_client() -> OpenAI:
    return OpenAI(api_key=ai_settings.api_key, base_url=ai_settings.base_url)


def pdf_to_text(data: bytes) -> str:
    reader = PdfReader(io.BytesIO(data))
    return "\n".join(page.extract_text() or "" for page in reader.pages)[:MAX_DOC_CHARS]


def fetch_pdf_text(url: str) -> str:
    cached = _cache.get(url)
    if cached and time.time() - cached[0] < CACHE_TTL:
        return cached[1]
    try:
        if url.startswith(("http://", "https://")):
            with urllib.request.urlopen(url, timeout=15) as response:
                data = response.read()
        else:
            path = (KNOWLEDGE_DIR / url).resolve()
            if KNOWLEDGE_DIR not in path.parents:
                return ""
            data = path.read_bytes()
        text = pdf_to_text(data)
    except Exception:
        logging.exception("PDF read failed: %s", url)
        return ""
    if text:
        _cache[url] = (time.time(), text)
    return text


def load_knowledge(db: Session) -> str:
    sources = [
        (document.title, document.category, document.url)
        for document in db.scalars(
            select(Document).order_by(Document.title).limit(50)
        ).all()
    ]
    if not sources and KNOWLEDGE_DIR.is_dir():
        sources = [
            (path.stem, "Колледж", path.name)
            for path in sorted(KNOWLEDGE_DIR.glob("*.pdf"))
        ]
    parts: list[str] = []
    total = 0
    for title, category, url in sources:
        text = fetch_pdf_text(url)
        if not text:
            continue
        block = f"### {title} ({category})\n{text}"
        if total + len(block) > MAX_TOTAL_CHARS:
            break
        parts.append(block)
        total += len(block)
    return "\n\n".join(parts)


def stream_answer(system_prompt: str, question: str, language: str = "ru"):
    try:
        stream = get_client().chat.completions.create(
            model=ai_settings.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": question},
            ],
            reasoning_effort="low",
            max_completion_tokens=ai_settings.max_tokens,
            stream=True,
        )
        for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
    except Exception:
        logging.exception("AI request failed")
        yield (
            "ЖИ қызметінде қате пайда болды. Кейінірек қайталап көріңіз."
            if language == "kk"
            else "Ошибка ИИ-сервиса. Попробуйте позже."
        )


@ai_router.post("/chat", dependencies=[Depends(require_same_origin)])
def chat(payload: ChatRequest, db: Session = Depends(get_db)):
    if not ai_settings.api_key:
        raise HTTPException(503, "ИИ не настроен")
    knowledge = load_knowledge(db)
    if not knowledge:
        no_data = (
            "Әзірге бұл туралы ақпаратым жоқ." if payload.language == "kk" else NO_DATA
        )
        return StreamingResponse(iter([no_data]), media_type="text/plain; charset=utf-8")
    prompt = PROMPT.format(context=knowledge)
    if payload.language == "kk":
        prompt += '\nЖауапты тек қазақ тілінде бер. Сұрақ колледж туралы болмаса: "Мен тек колледж туралы сұрақтарға жауап беремін." Ақпарат жоқ болса: "Әзірге бұл туралы ақпаратым жоқ."'
    return StreamingResponse(
        stream_answer(prompt, payload.message, payload.language),
        media_type="text/plain; charset=utf-8",
    )
