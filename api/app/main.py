from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Query
from sqlalchemy import select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.auth import require_approved_student
from app.auth import router as auth_router
from app.db import get_db
from app.models import Application, Document, Lesson
from app.schemas import ApplicationOut, ChatRequest, DocumentOut, LessonOut

app = FastAPI(title="INTC - Supporter API", version="0.1.0")
router = APIRouter(prefix="/api/v1")
protected = APIRouter(prefix="/api/v1", dependencies=[Depends(require_approved_student)])
DB = Annotated[Session, Depends(get_db)]


@router.get("/health")
def health(db: DB):
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError:
        raise HTTPException(503, "База данных недоступна") from None
    return {"status": "ok", "database": "ok"}


@protected.get("/documents", response_model=list[DocumentOut])
def documents(db: DB):
    return db.scalars(select(Document).order_by(Document.title).limit(200)).all()


@protected.get("/schedule", response_model=list[LessonOut])
def schedule(
    db: DB, group: Annotated[str, Query(min_length=1, max_length=50)], day: date
):
    return db.scalars(
        select(Lesson)
        .where(Lesson.group_name == group, Lesson.date == day)
        .order_by(Lesson.starts_at)
        .limit(100)
    ).all()


@protected.get("/applications", response_model=list[ApplicationOut])
def applications(db: DB):
    return db.scalars(select(Application).order_by(Application.name).limit(200)).all()


@protected.post("/chat", responses={503: {"description": "ИИ ещё не подключён"}})
def chat(payload: ChatRequest):
    raise HTTPException(503, "ИИ ещё не подключён. База документов готовится.")


app.include_router(router)
app.include_router(auth_router)
app.include_router(protected)
