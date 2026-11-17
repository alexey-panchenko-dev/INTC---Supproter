from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import URL


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    db_host: str = "127.0.0.1"
    db_port: int = 55432
    db_name: str = "intc_supporter"
    db_user: str = "intc"
    db_password: str = "intc_local_dev"
    cookie_secure: bool = False
    session_lifetime_seconds: int = 604800

    @property
    def database_url(self) -> URL:
        return URL.create(
            "postgresql+psycopg",
            username=self.db_user,
            password=self.db_password,
            host=self.db_host,
            port=self.db_port,
            database=self.db_name,
        )


settings = Settings()
