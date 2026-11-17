from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


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


class DocumentOut(ORMModel):
    id: int
    title: str
    category: str
    url: str


class LessonOut(ORMModel):
    id: int
    group_name: str
    date: date
    starts_at: str
    ends_at: str
    subject: str
    teacher: str
    room: str


class ApplicationOut(ORMModel):
    id: int
    name: str
    description: str
    subject: str
    url: str


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
