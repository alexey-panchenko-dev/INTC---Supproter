from fastapi import HTTPException


def require_approved_student() -> None:
    """Closed until authentication and database-backed status checks are implemented.

    Replace with validated session lookup; reject pending and blocked accounts.
    Never trust a role/status supplied by the client.
    """
    raise HTTPException(
        401,
        "Для доступа войдите в подтверждённый аккаунт",
        headers={"WWW-Authenticate": "Bearer"},
    )
