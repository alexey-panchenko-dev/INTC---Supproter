from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import require_admin, require_approved_student, require_same_origin
from app.db import get_db
from app.models import Application
from app.schemas import ApplicationInput, ApplicationOut

router = APIRouter(prefix="/api/v1/applications", tags=["applications"])
DB = Annotated[Session, Depends(get_db)]
write_access = [Depends(require_admin), Depends(require_same_origin)]


@router.get(
    "",
    response_model=list[ApplicationOut],
    dependencies=[Depends(require_approved_student)],
)
def applications(db: DB):
    return db.scalars(select(Application).order_by(Application.id)).all()


@router.post(
    "", response_model=ApplicationOut, status_code=201, dependencies=write_access
)
def create_application(payload: ApplicationInput, db: DB):
    # Legacy columns remain in storage; categories are no longer part of the catalog.
    application = Application(**payload.model_dump(), subject="", subject_kk="")
    db.add(application)
    db.commit()
    db.refresh(application)
    return application


def get_application(application_id: int, db: Session):
    application = db.get(Application, application_id)
    if application is None:
        raise HTTPException(404, "Приложение не найдено")
    return application


@router.put("/{application_id}", response_model=ApplicationOut, dependencies=write_access)
def update_application(application_id: int, payload: ApplicationInput, db: DB):
    application = get_application(application_id, db)
    for field, value in payload.model_dump().items():
        setattr(application, field, value)
    db.commit()
    db.refresh(application)
    return application


@router.delete("/{application_id}", status_code=204, dependencies=write_access)
def delete_application(application_id: int, db: DB):
    db.delete(get_application(application_id, db))
    db.commit()
