"""JSON contracts for importing a schedule from a photo.

ScheduleDraft — what recognition returns: normalized, but tolerant, because the user
reviews and fixes it before publishing. ScheduleImport — what publishing accepts:
strict, everything is checked again on the server.
"""

import re
from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.groups import normalize_group

# A field called `date` with a default would shadow the type inside the class body.
Date = date
Week = Literal["every", "odd", "even"]
TIME_PATTERN = r"^([01]\d|2[0-3]):[0-5]\d$"
WEEKDAYS = ["", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]


def normalize_time(value: object) -> str:
    """'8:00', '08.00', '8-00' → '08:00'; anything unreadable → ''."""
    if not isinstance(value, str):
        return ""
    match = re.fullmatch(r"\s*(\d{1,2})\s*[:.\-]\s*(\d{2})\s*", value)
    if not match:
        return ""
    hours, minutes = int(match[1]), int(match[2])
    if hours > 23 or minutes > 59:
        return ""
    return f"{hours:02d}:{minutes:02d}"


def _clip(value: object, limit: int) -> str:
    return " ".join(str(value or "").split())[:limit]


def _lenient_date(value: object):
    """An unreadable date from the model becomes None instead of failing the draft."""
    if isinstance(value, str):
        try:
            return date.fromisoformat(value.strip())
        except ValueError:
            return None
    return value


def _initials(subject: str) -> str:
    return "".join(word[0] for word in subject.split() if len(word) > 2).upper()


def expand_abbreviations(lessons: list["DraftLesson"]) -> None:
    """«КС» → «Компьютерные сети» when exactly one full name in the table matches."""
    full_names: dict[str, set[str]] = {}
    for lesson in lessons:
        if len(lesson.subject.split()) > 1:
            full_names.setdefault(_initials(lesson.subject), set()).add(lesson.subject)
    for lesson in lessons:
        short = lesson.subject.replace(".", "").strip()
        if " " in short or not 2 <= len(short) <= 5:
            continue
        candidates = full_names.get(short.upper(), set())
        if len(candidates) == 1:
            lesson.subject = next(iter(candidates))


# ---------- Recognition result (draft) ----------


class DraftLesson(BaseModel):
    weekday: int | None = Field(default=None, ge=1, le=7)
    date: Date | None = None
    pair: int | None = Field(default=None, ge=0, le=20)
    starts_at: str = ""
    ends_at: str = ""
    subject: str = ""
    teacher: str = ""
    room: str = ""
    week: Week = "every"
    note: str | None = None

    @field_validator("weekday", "pair", mode="before")
    @classmethod
    def drop_out_of_range(cls, value, info):
        limits = {"weekday": (1, 7), "pair": (0, 20)}[info.field_name]
        if isinstance(value, int) and not limits[0] <= value <= limits[1]:
            return None
        return value

    @field_validator("date", mode="before")
    @classmethod
    def lenient_date(cls, value):
        return _lenient_date(value)

    @field_validator("starts_at", "ends_at", mode="before")
    @classmethod
    def time(cls, value):
        return normalize_time(value)

    @field_validator("subject", "teacher", mode="before")
    @classmethod
    def long_text(cls, value):
        return _clip(value, 200)

    @field_validator("room", mode="before")
    @classmethod
    def room_text(cls, value):
        return _clip(value, 50)

    @field_validator("note", mode="before")
    @classmethod
    def note_text(cls, value):
        return _clip(value, 200) or None


class ScheduleDraft(BaseModel):
    kind: Literal["weekly", "dated"]
    group: str | None = None
    title: str | None = None
    weeks_count: int | None = None
    start_date: Date | None = None
    lessons: list[DraftLesson] = Field(default_factory=list, max_length=300)
    warnings: list[str] = Field(default_factory=list)

    @field_validator("group", mode="before")
    @classmethod
    def group_name(cls, value):
        text = _clip(value, 50)
        return normalize_group(text) if text else None

    @field_validator("title", mode="before")
    @classmethod
    def title_text(cls, value):
        return _clip(value, 300) or None

    @field_validator("weeks_count", mode="before")
    @classmethod
    def weeks(cls, value):
        return value if isinstance(value, int) and 1 <= value <= 30 else None

    @field_validator("start_date", mode="before")
    @classmethod
    def lenient_start(cls, value):
        return _lenient_date(value)

    @field_validator("warnings", mode="before")
    @classmethod
    def warning_texts(cls, value):
        if not isinstance(value, list):
            return []
        return [_clip(item, 500) for item in value if str(item or "").strip()][:50]

    @model_validator(mode="after")
    def check_rows(self):
        kept: list[DraftLesson] = []
        for lesson in self.lessons:
            if not lesson.subject:
                continue
            if self.kind == "weekly" and lesson.weekday is None:
                self.warnings.append(
                    f"Не удалось определить день недели для «{lesson.subject}»"
                    " — строка пропущена."
                )
                continue
            if self.kind == "dated" and lesson.date is None:
                self.warnings.append(
                    f"Не удалось определить дату для «{lesson.subject}» — строка пропущена."
                )
                continue
            if self.kind == "dated":
                lesson.weekday, lesson.week = None, "every"
            if not lesson.starts_at or not lesson.ends_at:
                self.warnings.append(f"Проверьте время: «{lesson.subject}».")
            elif lesson.starts_at >= lesson.ends_at:
                self.warnings.append(
                    f"Окончание раньше начала: «{lesson.subject}»"
                    f" {lesson.starts_at}–{lesson.ends_at}."
                )
            kept.append(lesson)
        expand_abbreviations(kept)
        if self.kind == "weekly":
            kept.sort(key=lambda item: (item.weekday or 0, item.starts_at, item.week))
        else:
            kept.sort(key=lambda item: (item.date or date.min, item.starts_at))
        self.lessons = kept
        if not kept:
            self.warnings.append("На изображении не найдено ни одного занятия.")
        return self


# ---------- Publishing (strict) ----------


class _LessonIn(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    starts_at: str = Field(pattern=TIME_PATTERN)
    ends_at: str = Field(pattern=TIME_PATTERN)
    subject: str = Field(min_length=1, max_length=200)
    teacher: str = Field(default="", max_length=200)
    room: str = Field(default="", max_length=50)
    note: str | None = Field(default=None, max_length=200)

    @field_validator("note")
    @classmethod
    def empty_note(cls, value):
        return value or None

    @model_validator(mode="after")
    def validate_time(self):
        if self.starts_at >= self.ends_at:
            raise ValueError(f"«{self.subject}»: окончание пары должно быть позже начала")
        return self


class WeeklyLessonIn(_LessonIn):
    weekday: int = Field(ge=1, le=7)
    pair: int | None = Field(default=None, ge=0, le=20)
    week: Week = "every"


class DatedLessonIn(_LessonIn):
    date: Date


class _ImportBase(BaseModel):
    model_config = ConfigDict(extra="forbid")
    group: str = Field(min_length=1, max_length=50)

    @field_validator("group")
    @classmethod
    def canonical_group(cls, value: str) -> str:
        group = normalize_group(value)
        if not group:
            raise ValueError("Укажите группу")
        return group


class WeeklyImport(_ImportBase):
    kind: Literal["weekly"]
    start_date: date
    weeks: int = Field(ge=1, le=30)
    lessons: list[WeeklyLessonIn] = Field(min_length=1, max_length=300)


class DatedImport(_ImportBase):
    kind: Literal["dated"]
    lessons: list[DatedLessonIn] = Field(min_length=1, max_length=300)

    @model_validator(mode="after")
    def reasonable_range(self):
        dates = [lesson.date for lesson in self.lessons]
        if (max(dates) - min(dates)).days > 366:
            raise ValueError("Даты охватывают больше года — проверьте год в датах")
        return self


ScheduleImport = Annotated[WeeklyImport | DatedImport, Field(discriminator="kind")]


class RecognizeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    # 8 MB of image ≈ 11 MB of base64 plus the data URL prefix.
    image: str = Field(min_length=16, max_length=11_300_000)


class ImportResult(BaseModel):
    group: str
    first_date: date
    last_date: date
    days_with_lessons: int
    lessons_created: int
