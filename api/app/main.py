import secrets
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, date, datetime
from typing import Annotated
from urllib.parse import quote

from fastapi import (
    APIRouter,
    Depends,
    FastAPI,
    File,
    Form,
    HTTPException,
    Query,
    Response,
    UploadFile,
)
from pypdf.errors import PdfReadError
from sqlalchemy import delete, func, select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, defer

from app.ai_chat import ai_router
from app.applications import router as applications_router
from app.auth import require_admin, require_approved_student, require_same_origin
from app.auth import router as auth_router
from app.db import get_db
from app.document_parser import summarize_pdf_data
from app.groups import normalize_group
from app.ingest_documents import ingest_documents
from app.models import (
    CollegeContest,
    CollegeSection,
    CollegeSectionItem,
    ContestSignup,
    Document,
    Lesson,
    User,
)
from app.schedule_import import editable_group
from app.schedule_import import router as schedule_import_router
from app.schemas import (
    CollegeSectionCreate,
    CollegeSectionItemCreate,
    CollegeSectionItemOut,
    CollegeSectionOut,
    ContestCreate,
    ContestOut,
    ContestSignupCreate,
    ContestSignupOut,
    DocumentOut,
    LessonOut,
    ScheduleInput,
)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    ingest_documents()
    yield


app = FastAPI(title="INTC - Supporter API", version="0.1.0", lifespan=lifespan)
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
    return db.scalars(
        select(Document)
        .options(defer(Document.file_data))
        .order_by(Document.sort_order, Document.title)
        .limit(200)
    ).all()


@protected.get("/documents/{document_id}/file")
def document_file(document_id: int, db: DB):
    document = db.get(Document, document_id)
    if document is None or document.file_data is None:
        raise HTTPException(404, "Документ не найден")
    filename = document.file_name or f"document-{document.id}.pdf"
    return Response(
        content=document.file_data,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"inline; filename*=UTF-8''{quote(filename)}",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.post(
    "/documents",
    response_model=DocumentOut,
    status_code=201,
    dependencies=[Depends(require_same_origin)],
)
def upload_document(
    db: DB,
    _admin: Annotated[User, Depends(require_admin)],
    title: Annotated[str, Form(min_length=1, max_length=250)],
    file: Annotated[UploadFile, File()],
):
    filename = (file.filename or "").replace("\\", "/").rsplit("/", 1)[-1]
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(415, "Загрузите файл в формате PDF")

    file_data = file.file.read(20 * 1024 * 1024 + 1)
    if len(file_data) > 20 * 1024 * 1024:
        raise HTTPException(413, "Размер PDF не должен превышать 20 МБ")
    try:
        description = summarize_pdf_data(file_data)
    except (PdfReadError, ValueError):
        raise HTTPException(422, "Не удалось прочитать текст из этого PDF") from None

    title = title.strip()
    if not title:
        raise HTTPException(422, "Укажите название документа")
    sort_order = (db.scalar(select(func.max(Document.sort_order))) or 0) + 1
    document = Document(
        title=title,
        category="Документы и бланки",
        url="",
        description=description,
        file_name=filename[:250] or "document.pdf",
        file_data=file_data,
        sort_order=sort_order,
    )
    db.add(document)
    db.flush()
    document.url = f"/api/v1/documents/{document.id}/file"
    db.commit()
    db.refresh(document)
    return document


@router.put(
    "/documents/{document_id}",
    response_model=DocumentOut,
    dependencies=[Depends(require_same_origin), Depends(require_admin)],
)
def update_document(
    document_id: int,
    db: DB,
    title: Annotated[str, Form(min_length=1, max_length=250)],
    file: Annotated[UploadFile | None, File()] = None,
):
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(404, "Документ не найден")
    title = title.strip()
    if not title:
        raise HTTPException(422, "Укажите название документа")
    document.title = title
    if file is not None:
        filename = (file.filename or "").replace("\\", "/").rsplit("/", 1)[-1]
        if not filename.lower().endswith(".pdf"):
            raise HTTPException(415, "Загрузите файл в формате PDF")
        file_data = file.file.read(20 * 1024 * 1024 + 1)
        if len(file_data) > 20 * 1024 * 1024:
            raise HTTPException(413, "Размер PDF не должен превышать 20 МБ")
        try:
            document.description = summarize_pdf_data(file_data)
        except (PdfReadError, ValueError):
            raise HTTPException(422, "Не удалось прочитать текст из этого PDF") from None
        document.file_name = filename[:250] or "document.pdf"
        document.file_data = file_data
    db.commit()
    db.refresh(document)
    return document


@router.delete(
    "/documents/{document_id}",
    status_code=204,
    dependencies=[Depends(require_same_origin), Depends(require_admin)],
)
def delete_document(document_id: int, db: DB):
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(404, "Документ не найден")
    db.delete(document)
    db.commit()
    return Response(status_code=204)


@protected.post(
    "/contest-signups",
    response_model=ContestSignupOut,
    status_code=201,
    dependencies=[Depends(require_same_origin)],
)
def create_contest_signup(
    payload: ContestSignupCreate,
    db: DB,
    user: Annotated[User, Depends(require_approved_student)],
):
    signup = ContestSignup(
        **payload.model_dump(exclude={"consent"}),
        consent=True,
        consented_at=datetime.now(UTC),
        user_id=user.id,
    )
    db.add(signup)
    db.commit()
    db.refresh(signup)
    return signup


@protected.get("/contests", response_model=list[ContestOut])
def list_contests(db: DB):
    return db.scalars(
        select(CollegeContest)
        .where(CollegeContest.is_active.is_(True))
        .order_by(CollegeContest.sort_order, CollegeContest.title)
    ).all()


@router.post(
    "/contests",
    response_model=ContestOut,
    status_code=201,
    dependencies=[Depends(require_same_origin), Depends(require_admin)],
)
def create_contest(payload: ContestCreate, db: DB):
    sort_order = (db.scalar(select(func.max(CollegeContest.sort_order))) or 0) + 1
    contest = CollegeContest(
        slug=f"contest-{secrets.token_hex(6)}",
        **payload.model_dump(),
        sort_order=sort_order,
    )
    db.add(contest)
    db.commit()
    db.refresh(contest)
    return contest


@router.post(
    "/contests/seed/{slug}",
    response_model=ContestOut,
    dependencies=[Depends(require_same_origin), Depends(require_admin)],
)
def seed_contest(slug: str, payload: ContestCreate, db: DB):
    contest = db.scalar(select(CollegeContest).where(CollegeContest.slug == slug))
    if contest is None:
        sort_order = (db.scalar(select(func.max(CollegeContest.sort_order))) or 0) + 1
        contest = CollegeContest(slug=slug, **payload.model_dump(), sort_order=sort_order)
        db.add(contest)
        db.commit()
        db.refresh(contest)
    return contest


@router.put(
    "/contests/{slug}",
    response_model=ContestOut,
    dependencies=[Depends(require_same_origin), Depends(require_admin)],
)
def update_contest(slug: str, payload: ContestCreate, db: DB):
    contest = db.scalar(select(CollegeContest).where(CollegeContest.slug == slug))
    if contest is None or not contest.is_active:
        raise HTTPException(404, "Конкурс не найден")
    for field, value in payload.model_dump().items():
        setattr(contest, field, value)
    db.commit()
    db.refresh(contest)
    return contest


@router.delete(
    "/contests/{slug}",
    status_code=204,
    dependencies=[Depends(require_same_origin), Depends(require_admin)],
)
def delete_contest(slug: str, db: DB):
    contest = db.scalar(select(CollegeContest).where(CollegeContest.slug == slug))
    if contest is None:
        raise HTTPException(404, "Конкурс не найден")
    contest.is_active = False
    db.commit()
    return Response(status_code=204)


@protected.get("/college-sections", response_model=list[CollegeSectionOut])
def list_college_sections(db: DB):
    return db.scalars(
        select(CollegeSection).order_by(CollegeSection.sort_order, CollegeSection.title)
    ).all()


@router.post(
    "/college-sections",
    response_model=CollegeSectionOut,
    status_code=201,
    dependencies=[Depends(require_same_origin), Depends(require_admin)],
)
def create_college_section(payload: CollegeSectionCreate, db: DB):
    sort_order = (db.scalar(select(func.max(CollegeSection.sort_order))) or 0) + 1
    section = CollegeSection(
        slug=f"section-{secrets.token_hex(6)}",
        **payload.model_dump(),
        sort_order=sort_order,
    )
    db.add(section)
    db.commit()
    db.refresh(section)
    return section


@router.put(
    "/college-sections/{slug}",
    response_model=CollegeSectionOut,
    dependencies=[Depends(require_same_origin), Depends(require_admin)],
)
def update_college_section(slug: str, payload: CollegeSectionCreate, db: DB):
    section = db.scalar(select(CollegeSection).where(CollegeSection.slug == slug))
    if section is None:
        raise HTTPException(404, "Раздел не найден")
    section.title = payload.title
    section.description = payload.description
    db.commit()
    db.refresh(section)
    return section


@router.delete(
    "/college-sections/{slug}",
    status_code=204,
    dependencies=[Depends(require_same_origin), Depends(require_admin)],
)
def delete_college_section(slug: str, db: DB):
    section = db.scalar(select(CollegeSection).where(CollegeSection.slug == slug))
    if section is None:
        raise HTTPException(404, "Раздел не найден")
    db.delete(section)
    db.commit()
    return Response(status_code=204)


@protected.get(
    "/college-sections/{slug}/items", response_model=list[CollegeSectionItemOut]
)
def list_college_section_items(slug: str, db: DB):
    section = db.scalar(select(CollegeSection).where(CollegeSection.slug == slug))
    if section is None:
        raise HTTPException(404, "Раздел не найден")
    return db.scalars(
        select(CollegeSectionItem)
        .where(CollegeSectionItem.section_id == section.id)
        .order_by(CollegeSectionItem.sort_order, CollegeSectionItem.title)
    ).all()


@router.post(
    "/college-sections/{slug}/items",
    response_model=CollegeSectionItemOut,
    status_code=201,
    dependencies=[Depends(require_same_origin), Depends(require_admin)],
)
def create_college_section_item(slug: str, payload: CollegeSectionItemCreate, db: DB):
    section = db.scalar(select(CollegeSection).where(CollegeSection.slug == slug))
    if section is None:
        raise HTTPException(404, "Раздел не найден")
    sort_order = (
        db.scalar(
            select(func.max(CollegeSectionItem.sort_order)).where(
                CollegeSectionItem.section_id == section.id
            )
        )
        or 0
    ) + 1
    item = CollegeSectionItem(
        section_id=section.id,
        **payload.model_dump(),
        sort_order=sort_order,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put(
    "/college-sections/{slug}/items/{item_id}",
    response_model=CollegeSectionItemOut,
    dependencies=[Depends(require_same_origin), Depends(require_admin)],
)
def update_college_section_item(
    slug: str, item_id: int, payload: CollegeSectionItemCreate, db: DB
):
    item = db.scalar(
        select(CollegeSectionItem)
        .join(CollegeSection)
        .where(CollegeSection.slug == slug, CollegeSectionItem.id == item_id)
    )
    if item is None:
        raise HTTPException(404, "Материал не найден")
    for field, value in payload.model_dump().items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete(
    "/college-sections/{slug}/items/{item_id}",
    status_code=204,
    dependencies=[Depends(require_same_origin), Depends(require_admin)],
)
def delete_college_section_item(slug: str, item_id: int, db: DB):
    item = db.scalar(
        select(CollegeSectionItem)
        .join(CollegeSection)
        .where(CollegeSection.slug == slug, CollegeSectionItem.id == item_id)
    )
    if item is None:
        raise HTTPException(404, "Материал не найден")
    db.delete(item)
    db.commit()
    return Response(status_code=204)


@protected.get("/schedule", response_model=list[LessonOut])
def schedule(
    db: DB, group: Annotated[str, Query(min_length=1, max_length=50)], day: date
):
    return db.scalars(
        select(Lesson)
        .where(Lesson.group_name == normalize_group(group), Lesson.date == day)
        .order_by(Lesson.starts_at)
        .limit(100)
    ).all()


@router.put(
    "/schedule",
    response_model=list[LessonOut],
    dependencies=[Depends(require_same_origin)],
)
def save_schedule(
    payload: ScheduleInput,
    db: DB,
    user: Annotated[User | None, Depends(require_approved_student)],
    group: Annotated[str, Query(min_length=1, max_length=50)],
    day: date,
):
    group = editable_group(user, group)
    db.execute(delete(Lesson).where(Lesson.group_name == group, Lesson.date == day))
    lessons = [
        Lesson(group_name=group, date=day, created_by_id=user.id, **item.model_dump())
        for item in sorted(payload.lessons, key=lambda lesson: lesson.starts_at)
    ]
    db.add_all(lessons)
    db.commit()
    for lesson in lessons:
        db.refresh(lesson)
    return lessons


app.include_router(router)
app.include_router(applications_router)
app.include_router(auth_router)
app.include_router(schedule_import_router)
app.include_router(protected)
app.include_router(ai_router)
