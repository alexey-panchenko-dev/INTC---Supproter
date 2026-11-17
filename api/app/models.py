from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    LargeBinary,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("status IN ('pending', 'approved', 'blocked')"),
        CheckConstraint("role IN ('student', 'admin')"),
        CheckConstraint(
            "role = 'admin' OR (group_name IS NOT NULL AND length(trim(group_name)) > 0)",
            name="student_group_required",
        ),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    group_name: Mapped[str | None] = mapped_column(String(50))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), server_default="student")
    status: Mapped[str] = mapped_column(String(20), server_default="approved")


class AuthSession(Base):
    __tablename__ = "auth_sessions"
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    expires_at: Mapped[int]


class Document(Base):
    __tablename__ = "documents"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(250))
    category: Mapped[str] = mapped_column(String(100))
    url: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text, default="")
    file_name: Mapped[str | None] = mapped_column(String(250))
    file_data: Mapped[bytes | None] = mapped_column(LargeBinary)
    sort_order: Mapped[int] = mapped_column(default=0)


class ContestSignup(Base):
    __tablename__ = "contest_signups"
    __table_args__ = (
        CheckConstraint(
            "NOT is_team OR (team_name IS NOT NULL AND length(trim(team_name)) > 0 "
            "AND team_members IS NOT NULL AND length(trim(team_members)) > 0)",
            name="team_details_required",
        ),
        CheckConstraint("consent IS TRUE", name="consent_required"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    contest_id: Mapped[str] = mapped_column(String(100), index=True)
    contest_title: Mapped[str] = mapped_column(String(250))
    full_name: Mapped[str] = mapped_column(String(250))
    group_name: Mapped[str] = mapped_column(String(50))
    course: Mapped[str] = mapped_column(String(20))
    contact: Mapped[str] = mapped_column(String(200))
    is_team: Mapped[bool] = mapped_column(Boolean)
    team_name: Mapped[str | None] = mapped_column(String(200))
    team_members: Mapped[str | None] = mapped_column(Text)
    comment: Mapped[str | None] = mapped_column(Text)
    consent: Mapped[bool] = mapped_column(Boolean)
    consented_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class CollegeContest(Base):
    __tablename__ = "college_contests"
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(250))
    description: Mapped[str] = mapped_column(Text)
    dates: Mapped[str] = mapped_column(String(250))
    signup_deadline: Mapped[date] = mapped_column(Date)
    format: Mapped[str] = mapped_column(String(250))
    eligibility: Mapped[str] = mapped_column(Text)
    curator: Mapped[str] = mapped_column(String(200))
    photo_filename: Mapped[str | None] = mapped_column(String(250))
    details: Mapped[list[str]] = mapped_column(JSON, default=list)
    sort_order: Mapped[int] = mapped_column(default=0)
    is_active: Mapped[bool] = mapped_column(default=True, server_default="true")


class CollegeSection(Base):
    __tablename__ = "college_sections"
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(default=0)


class CollegeSectionItem(Base):
    __tablename__ = "college_section_items"
    id: Mapped[int] = mapped_column(primary_key=True)
    section_id: Mapped[int] = mapped_column(
        ForeignKey("college_sections.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(160))
    summary: Mapped[str] = mapped_column(String(500))
    content: Mapped[str] = mapped_column(Text, default="")
    link_url: Mapped[str | None] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(default=0)


class Lesson(Base):
    __tablename__ = "lessons"
    id: Mapped[int] = mapped_column(primary_key=True)
    group_name: Mapped[str] = mapped_column(String(50), index=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    starts_at: Mapped[str] = mapped_column(String(5))
    ends_at: Mapped[str] = mapped_column(String(5))
    subject: Mapped[str] = mapped_column(String(200))
    teacher: Mapped[str] = mapped_column(String(200))
    room: Mapped[str] = mapped_column(String(50))
    note: Mapped[str | None] = mapped_column(String(200))
    created_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )


class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (
        CheckConstraint(
            "pricing IN ('free', 'freemium', 'paid')", name="application_pricing"
        ),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    subject: Mapped[str] = mapped_column(String(200))
    url: Mapped[str] = mapped_column(Text)
    description_kk: Mapped[str] = mapped_column(Text, server_default="")
    subject_kk: Mapped[str] = mapped_column(String(200), server_default="")
    logo_url: Mapped[str] = mapped_column(Text, server_default="")
    pricing: Mapped[str] = mapped_column(String(20), server_default="free")
