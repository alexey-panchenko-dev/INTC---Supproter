"""Import a schedule from a photo: recognize → user reviews the JSON → publish.

Who can publish: an administrator — for any group; a student — only for their own
group (the schedule then becomes visible to the whole group).

Week alternation: the week containing start_date is week 1 (a weekend start moves
week 1 to the next Monday). "odd" lessons (black text
in the source) happen in weeks 1, 3, 5…, "even" lessons (red text) in weeks 2, 4, 6….
"""

import threading
import time
from collections import defaultdict, deque
from collections.abc import Sequence
from datetime import date, timedelta
from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app import schedule_ai
from app.auth import require_approved_student, require_same_origin
from app.db import get_db
from app.groups import normalize_group
from app.models import Lesson, User
from app.schedule_schemas import (
    WEEKDAYS,
    DatedImport,
    ImportResult,
    RecognizeRequest,
    ScheduleDraft,
    ScheduleImport,
    WeeklyImport,
)

router = APIRouter(
    prefix="/api/v1/schedule",
    tags=["schedule-import"],
    dependencies=[Depends(require_same_origin)],
)
DB = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User | None, Depends(require_approved_student)]

RECOGNITIONS_PER_HOUR = 20
_recent: dict[int, deque[float]] = defaultdict(deque)
_recent_lock = threading.Lock()


def editable_group(user: User | None, requested: str) -> str:
    """Return the canonical group name the user may write to, or raise 403."""
    if user is None:
        raise HTTPException(401, "Войдите в аккаунт")
    group = normalize_group(requested)
    if not group:
        raise HTTPException(422, "Укажите группу")
    if user.role == "admin":
        return group
    if not user.group_name or normalize_group(user.group_name) != group:
        raise HTTPException(
            403, "Студент может публиковать расписание только своей группы"
        )
    return group


def _check_rate_limit(user_id: int) -> None:
    now = time.monotonic()
    with _recent_lock:
        calls = _recent[user_id]
        while calls and now - calls[0] > 3600:
            calls.popleft()
        if len(calls) >= RECOGNITIONS_PER_HOUR:
            raise HTTPException(429, "Слишком много распознаваний. Попробуйте через час.")
        calls.append(now)


# ---------- Expansion into concrete dates ----------


def first_week_monday(start: date) -> date:
    """Monday of study week 1.

    Weeks are calendar weeks (Mon–Sun), so black/red alternation always flips on a
    Monday. A start on Saturday or Sunday («с 10 октября», a Saturday) means the
    study weeks begin next Monday — otherwise week 1 would be almost empty.
    """
    monday = start - timedelta(days=start.weekday())
    return monday + timedelta(weeks=1) if start.weekday() >= 5 else monday


def week_number(day: date, start: date) -> int:
    """1-based number of the study week containing `day`."""
    return (day - first_week_monday(start)).days // 7 + 1


def expand_weekly(payload: WeeklyImport) -> tuple[date, date, dict[date, list]]:
    first_monday = first_week_monday(payload.start_date)
    first = max(payload.start_date, first_monday)
    last = first_monday + timedelta(weeks=payload.weeks, days=-1)
    days: dict[date, list] = {}
    day = first
    while day <= last:
        parity = "odd" if week_number(day, payload.start_date) % 2 else "even"
        rows = [
            lesson
            for lesson in payload.lessons
            if lesson.weekday == day.isoweekday() and lesson.week in ("every", parity)
        ]
        if rows:
            days[day] = rows
        day += timedelta(days=1)
    return first, last, days


def expand_dated(payload: DatedImport) -> tuple[date, date, dict[date, list]]:
    days: dict[date, list] = defaultdict(list)
    for lesson in payload.lessons:
        days[lesson.date].append(lesson)
    return min(days), max(days), dict(days)


def _check_overlaps(day: date, rows: Sequence, start: date | None) -> None:
    ordered = sorted(rows, key=lambda row: row.starts_at)
    for previous, current in zip(ordered, ordered[1:]):
        if previous.ends_at > current.starts_at:
            where = f"{WEEKDAYS[day.isoweekday()]} {day:%d.%m.%Y}"
            if start is not None:
                where += f" ({week_number(day, start)}-я неделя)"
            raise HTTPException(
                422,
                f"{where}: пересекаются «{previous.subject}» "
                f"{previous.starts_at}–{previous.ends_at} и «{current.subject}» "
                f"{current.starts_at}–{current.ends_at}. Проверьте неделю (чёрная/красная)"
                " или время.",
            )


# ---------- Endpoints ----------


@router.post("/recognize", response_model=ScheduleDraft)
def recognize(payload: RecognizeRequest, user: CurrentUser):
    if user is None:
        raise HTTPException(401, "Войдите в аккаунт")
    if not schedule_ai.vision_settings.api_key:
        raise HTTPException(503, "Распознавание не настроено: нет ключа ИИ")
    try:
        image, mime = schedule_ai.decode_image(payload.image)
    except schedule_ai.RecognitionError as error:
        raise HTTPException(422, str(error)) from None
    _check_rate_limit(user.id)
    try:
        return schedule_ai.recognize_schedule(image, mime, date.today())
    except schedule_ai.AIQuotaExceededError as error:
        raise HTTPException(402, str(error)) from None
    except schedule_ai.RecognitionError as error:
        raise HTTPException(502, str(error)) from None


@router.post("/import", response_model=ImportResult)
def import_schedule(
    payload: Annotated[ScheduleImport, Body()], user: CurrentUser, db: DB
):
    group = editable_group(user, payload.group)
    if isinstance(payload, WeeklyImport):
        first, last, days = expand_weekly(payload)
        start = payload.start_date
    else:
        first, last, days = expand_dated(payload)
        start = None
    for day, rows in days.items():
        _check_overlaps(day, rows, start)

    if isinstance(payload, WeeklyImport):
        # The whole period is replaced, so lessons left from an older version disappear.
        replaced = (Lesson.date >= first) & (Lesson.date <= last)
    else:
        # Practice replaces only its own dates; other days keep the regular schedule.
        replaced = Lesson.date.in_(list(days))
    db.execute(delete(Lesson).where(Lesson.group_name == group, replaced))
    created = [
        Lesson(
            group_name=group,
            date=day,
            starts_at=row.starts_at,
            ends_at=row.ends_at,
            subject=row.subject,
            teacher=row.teacher,
            room=row.room,
            note=row.note,
            created_by_id=user.id,
        )
        for day, rows in sorted(days.items())
        for row in sorted(rows, key=lambda item: item.starts_at)
    ]
    db.add_all(created)
    db.commit()
    return ImportResult(
        group=group,
        first_date=first,
        last_date=last,
        days_with_lessons=len(days),
        lessons_created=len(created),
    )
