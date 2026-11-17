from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Query
from sqlalchemy import delete, select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.ai_chat import ai_router
from app.auth import require_admin, require_approved_student, require_same_origin
from app.auth import router as auth_router
from app.db import get_db
from app.models import Application, Document, Lesson
from app.schemas import ApplicationOut, DocumentOut, LessonOut, ScheduleInput

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


@router.put(
    "/schedule",
    response_model=list[LessonOut],
    dependencies=[Depends(require_admin), Depends(require_same_origin)],
)
def save_schedule(
    payload: ScheduleInput,
    db: DB,
    group: Annotated[str, Query(min_length=1, max_length=50)],
    day: date,
):
    group = group.strip()
    if not group:
        raise HTTPException(422, "Укажите группу")
    db.execute(delete(Lesson).where(Lesson.group_name == group, Lesson.date == day))
    lessons = [
        Lesson(group_name=group, date=day, **item.model_dump())
        for item in sorted(payload.lessons, key=lambda lesson: lesson.starts_at)
    ]
    db.add_all(lessons)
    db.commit()
    for lesson in lessons:
        db.refresh(lesson)
    return lessons


@protected.get("/applications", response_model=list[ApplicationOut])
def applications(db: DB):
    return db.scalars(select(Application).order_by(Application.name).limit(200)).all()


app.include_router(router)
app.include_router(auth_router)
app.include_router(protected)
app.include_router(ai_router)
