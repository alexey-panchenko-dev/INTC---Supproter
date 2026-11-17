from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


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
