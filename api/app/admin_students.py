from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import require_admin, require_same_origin
from app.db import get_db
from app.models import User
from app.schemas import StudentOut, StudentStatusUpdate

router = APIRouter(prefix="/api/v1/admin/students", tags=["admin-students"])
DB = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[StudentOut])
def list_students(
    db: DB,
    _admin: Annotated[User, Depends(require_admin)],
):
    return db.scalars(
        select(User)
        .where(User.role == "student", User.status == "pending")
        .order_by(User.last_name, User.first_name, User.id)
        .limit(1000)
    ).all()


@router.put(
    "/{student_id}/status",
    response_model=StudentOut,
    dependencies=[Depends(require_same_origin)],
)
def update_student_status(
    student_id: int,
    payload: StudentStatusUpdate,
    db: DB,
    _admin: Annotated[User, Depends(require_admin)],
):
    student = db.scalar(select(User).where(User.id == student_id, User.role == "student"))
    if student is None:
        raise HTTPException(404, "Студент не найден")
    student.status = payload.status
    db.commit()
    db.refresh(student)
    return student
