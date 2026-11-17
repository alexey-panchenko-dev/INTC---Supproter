import hashlib
import hmac
import secrets
import time
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models import AuthSession, User
from app.schemas import AdminOut, LoginRequest, RegisterRequest, StudentOut

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])
DB = Annotated[Session, Depends(get_db)]
COOKIE = "intc_session"


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.scrypt(password.encode(), salt=salt.encode(), n=16384, r=8, p=1)
    return f"scrypt${salt}${digest.hex()}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, salt, digest = encoded.split("$")
        if algorithm != "scrypt":
            return False
        actual = hashlib.scrypt(password.encode(), salt=salt.encode(), n=16384, r=8, p=1)
        return hmac.compare_digest(actual.hex(), digest)
    except (ValueError, TypeError):
        return False


DUMMY_HASH = hash_password(secrets.token_urlsafe(32))


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def require_same_origin(request: Request):
    origin = request.headers.get("origin")
    if request.headers.get("sec-fetch-site") == "cross-site" or (
        origin and origin.rstrip("/") != str(request.base_url).rstrip("/")
    ):
        raise HTTPException(403, "Недопустимый источник запроса")


def current_user(request: Request, db: DB) -> User:
    token = request.cookies.get(COOKIE)
    session = db.get(AuthSession, token_hash(token)) if token else None
    if session is None or session.expires_at <= int(time.time()):
        raise HTTPException(401, "Войдите в аккаунт")
    user = db.get(User, session.user_id)
    if user is None:
        raise HTTPException(401, "Войдите в аккаунт")
    return user


def require_approved_student(user: Annotated[User, Depends(current_user)]) -> User:
    if user.status != "approved":
        raise HTTPException(403, "Доступ к аккаунту ограничен администратором")
    return user


def require_admin(user: Annotated[User, Depends(current_user)]) -> User:
    if user.status != "approved":
        raise HTTPException(403, "Доступ к аккаунту ограничен администратором")
    if user.role != "admin":
        raise HTTPException(403, "Добавлять документы может только администратор")
    return user


@router.post(
    "/register",
    response_model=StudentOut,
    status_code=201,
    dependencies=[Depends(require_same_origin)],
)
def register(payload: RegisterRequest, db: DB):
    user = User(
        **payload.model_dump(exclude={"password"}),
        password_hash=hash_password(payload.password),
        role="student",
        status="approved",
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Эта почта уже зарегистрирована") from None
    db.refresh(user)
    return user


@router.post(
    "/login",
    response_model=StudentOut | AdminOut,
    dependencies=[Depends(require_same_origin)],
)
def login(payload: LoginRequest, request: Request, response: Response, db: DB):
    user = db.scalar(select(User).where(User.email == payload.email))
    valid = verify_password(payload.password, user.password_hash if user else DUMMY_HASH)
    if not valid or user is None:
        raise HTTPException(401, "Неверная почта или пароль")
    if user.status != "approved":
        raise HTTPException(403, "Доступ к аккаунту ограничен администратором")
    previous = request.cookies.get(COOKIE)
    if previous:
        db.execute(
            delete(AuthSession).where(AuthSession.token_hash == token_hash(previous))
        )
    db.execute(delete(AuthSession).where(AuthSession.expires_at <= int(time.time())))
    token = secrets.token_urlsafe(32)
    db.add(
        AuthSession(
            token_hash=token_hash(token),
            user_id=user.id,
            expires_at=int(time.time()) + settings.session_lifetime_seconds,
        )
    )
    db.commit()
    response.set_cookie(
        COOKIE,
        token,
        max_age=settings.session_lifetime_seconds,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="strict",
        path="/",
    )
    return user


@router.get("/me", response_model=StudentOut | AdminOut)
def me(user: Annotated[User, Depends(current_user)]):
    return user


@router.post("/logout", status_code=204, dependencies=[Depends(require_same_origin)])
def logout(request: Request, response: Response, db: DB):
    token = request.cookies.get(COOKIE)
    if token:
        db.execute(delete(AuthSession).where(AuthSession.token_hash == token_hash(token)))
        db.commit()
    response.delete_cookie(
        COOKIE, path="/", secure=settings.cookie_secure, httponly=True, samesite="strict"
    )
