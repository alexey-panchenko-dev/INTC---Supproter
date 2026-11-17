from datetime import date

from sqlalchemy import CheckConstraint, Date, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Student(Base):
    __tablename__ = "students"
    __table_args__ = (
        CheckConstraint("status IN ('pending', 'approved', 'blocked')"),
        CheckConstraint("role IN ('student', 'admin')"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    group_name: Mapped[str] = mapped_column(String(50))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), server_default="student")
    status: Mapped[str] = mapped_column(String(20), server_default="pending")


class Document(Base):
    __tablename__ = "documents"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(250))
    category: Mapped[str] = mapped_column(String(100))
    url: Mapped[str] = mapped_column(Text)


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


class Application(Base):
    __tablename__ = "applications"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    subject: Mapped[str] = mapped_column(String(200))
    url: Mapped[str] = mapped_column(Text)
