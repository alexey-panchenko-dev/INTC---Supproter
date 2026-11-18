from datetime import date, datetime
from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    HttpUrl,
    field_validator,
    model_validator,
)

from app.groups import normalize_group


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr = Field(max_length=254)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value):
        return value.strip().lower() if isinstance(value, str) else value


class RegisterRequest(LoginRequest):
    password: str = Field(min_length=8, max_length=128)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    group_name: str = Field(min_length=1, max_length=50)

    @field_validator("first_name", "last_name", "group_name", mode="before")
    @classmethod
    def trim_text(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("group_name")
    @classmethod
    def canonical_group(cls, value: str) -> str:
        return normalize_group(value)


class ProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr = Field(max_length=254)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    group_name: str | None = Field(default=None, max_length=50)
    current_password: str | None = Field(default=None, min_length=1, max_length=128)
    new_password: str | None = Field(default=None, min_length=8, max_length=128)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value):
        return value.strip().lower() if isinstance(value, str) else value

    @field_validator("first_name", "last_name", mode="before")
    @classmethod
    def trim_profile_text(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("group_name", mode="before")
    @classmethod
    def canonical_optional_group(cls, value):
        if not isinstance(value, str):
            return value
        value = value.strip()
        return normalize_group(value) if value else None

    @model_validator(mode="after")
    def require_current_password(self):
        if self.new_password and not self.current_password:
            raise ValueError("Для смены пароля укажите текущий пароль")
        return self


class UserOut(ORMModel):
    id: int
    first_name: str
    last_name: str
    email: str
    status: Literal["pending", "approved", "blocked"]


class StudentOut(UserOut):
    role: Literal["student"]
    group_name: str


class AdminOut(UserOut):
    role: Literal["admin"]


class StudentStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: Literal["approved", "blocked"]


class DocumentOut(ORMModel):
    id: int
    title: str
    category: str
    url: str
    description: str


class ContestSignupCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    contest_id: str = Field(min_length=3, max_length=100, pattern=r"^[a-z0-9-]+$")
    contest_title: str = Field(min_length=1, max_length=250)
    full_name: str = Field(min_length=2, max_length=250)
    group_name: str = Field(min_length=1, max_length=50)
    course: str = Field(min_length=1, max_length=20)
    contact: str = Field(min_length=3, max_length=200)
    is_team: bool
    team_name: str | None = Field(default=None, max_length=200)
    team_members: str | None = Field(default=None, max_length=2000)
    comment: str | None = Field(default=None, max_length=2000)
    consent: Literal[True]

    @field_validator(
        "contest_title", "full_name", "group_name", "course", "contact", mode="before"
    )
    @classmethod
    def trim_required_text(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("team_name", "team_members", "comment", mode="before")
    @classmethod
    def trim_optional_text(cls, value):
        if not isinstance(value, str):
            return value
        value = value.strip()
        return value or None

    @model_validator(mode="after")
    def validate_team_details(self):
        if self.is_team and (not self.team_name or not self.team_members):
            raise ValueError("Для командной заявки укажите название и участников команды")
        return self


class ContestSignupOut(ORMModel):
    id: int
    contest_id: str
    contest_title: str
    submitted_at: datetime


class ContestCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=2, max_length=250)
    description: str = Field(min_length=10, max_length=2000)
    dates: str = Field(min_length=3, max_length=250)
    signup_deadline: date
    format: str = Field(min_length=2, max_length=250)
    eligibility: str = Field(min_length=2, max_length=2000)
    curator: str = Field(min_length=2, max_length=200)
    photo_filename: str | None = Field(default=None, max_length=250)
    details: list[str] = Field(min_length=1, max_length=12)

    @field_validator(
        "title", "description", "dates", "format", "eligibility", "curator", mode="before"
    )
    @classmethod
    def trim_contest_text(cls, value):
        return value.strip() if isinstance(value, str) else value


class ContestOut(ORMModel):
    id: int
    slug: str
    title: str
    description: str
    dates: str
    signup_deadline: date
    format: str
    eligibility: str
    curator: str
    photo_filename: str | None
    details: list[str]
    is_active: bool


class CollegeSectionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=2, max_length=120)
    description: str = Field(min_length=3, max_length=500)

    @field_validator("title", "description", mode="before")
    @classmethod
    def trim_section_text(cls, value):
        return value.strip() if isinstance(value, str) else value


class CollegeSectionOut(ORMModel):
    id: int
    slug: str
    title: str
    description: str


class CollegeSectionItemCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=2, max_length=160)
    summary: str = Field(min_length=2, max_length=500)
    content: str = Field(default="", max_length=10000)
    link_url: str | None = Field(default=None, max_length=2000)

    @field_validator("title", "summary", "content", mode="before")
    @classmethod
    def trim_section_item_text(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("link_url", mode="before")
    @classmethod
    def validate_section_item_link(cls, value):
        if not isinstance(value, str):
            return value
        value = value.strip()
        if not value:
            return None
        if not value.startswith(("https://", "http://")):
            raise ValueError("Ссылка должна начинаться с http:// или https://")
        return value


class CollegeSectionItemOut(ORMModel):
    id: int
    section_id: int
    title: str
    summary: str
    content: str
    link_url: str | None
    sort_order: int


class LessonOut(ORMModel):
    id: int
    group_name: str
    date: date
    starts_at: str
    ends_at: str
    subject: str
    teacher: str
    room: str
    note: str | None = None


class LessonInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    starts_at: str = Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    ends_at: str = Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    subject: str = Field(min_length=1, max_length=200)
    teacher: str = Field(min_length=1, max_length=200)
    # Some rows (e.g. «Кураторский час») have no room in the official schedule.
    room: str = Field(default="", max_length=50)
    note: str | None = Field(default=None, max_length=200)

    @model_validator(mode="after")
    def validate_time(self):
        if self.starts_at >= self.ends_at:
            raise ValueError("Окончание пары должно быть позже начала")
        return self


class ScheduleInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    lessons: list[LessonInput] = Field(max_length=100)

    @model_validator(mode="after")
    def validate_overlaps(self):
        ordered = sorted(self.lessons, key=lambda lesson: lesson.starts_at)
        for previous, current in zip(ordered, ordered[1:]):
            if previous.ends_at > current.starts_at:
                raise ValueError("Время пар пересекается")
        return self


class ApplicationInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    name: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=2000)
    description_kk: str = Field(min_length=1, max_length=2000)
    url: str = Field(min_length=1, max_length=2000)
    logo_url: str = Field(min_length=1, max_length=2000)
    pricing: Literal["free", "freemium", "paid"]

    @field_validator("url")
    @classmethod
    def validate_url(cls, value):
        parsed = HttpUrl(value)
        if parsed.username or parsed.password:
            raise ValueError("URL credentials are not allowed")
        return str(parsed)

    @field_validator("logo_url")
    @classmethod
    def validate_logo(cls, value):
        if value.startswith("/logos/") and value.count("/") == 2 and ".." not in value:
            return value
        return cls.validate_url(value)


class ApplicationOut(ORMModel):
    id: int
    name: str
    description: str
    url: str
    description_kk: str
    logo_url: str
    pricing: Literal["free", "freemium", "paid"]


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    language: Literal["ru", "kk"] = "ru"
