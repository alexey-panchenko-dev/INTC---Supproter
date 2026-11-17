"""Create an administrator without exposing the password in process arguments."""

import argparse
from getpass import getpass

from sqlalchemy import select

from app.auth import hash_password
from app.db import SessionLocal
from app.models import User
from app.schemas import RegisterRequest


def main():
    parser = argparse.ArgumentParser(description="Create an administrator")
    parser.add_argument("--email", required=True)
    parser.add_argument("--first-name", default="Администратор")
    parser.add_argument("--last-name", default="Портала")
    args = parser.parse_args()
    credentials = RegisterRequest(
        email=args.email,
        password=getpass("Password: "),
        first_name=args.first_name,
        last_name=args.last_name,
        group_name="admin",
    )
    with SessionLocal() as db:
        if db.scalar(select(User).where(User.email == credentials.email)):
            parser.error("Account already exists; no changes made")
        db.add(
            User(
                email=credentials.email,
                first_name=credentials.first_name,
                last_name=credentials.last_name,
                password_hash=hash_password(credentials.password),
                role="admin",
                status="approved",
                group_name=None,
            )
        )
        db.commit()
    print("Administrator created")


if __name__ == "__main__":
    main()
