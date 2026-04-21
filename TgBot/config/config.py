from pathlib import Path

from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]


class RunSettings(BaseModel):
    TOKEN: str = 'your-token'
    BOT_SERVICE_TOKEN: str = 'your-service-token'


class DatabaseSettings(BaseModel):
    NAME: str = 'postgres'
    USER: str = 'postgres'
    PASSWORD: str = 'postgres'
    HOST: str = 'localhost'
    INTERNAL_PORT: int = 5432
    EXTERNAL_PORT: int = 5434


class SupportSettings(BaseModel):
    EMAIL: str = 'your-email'
    TELEGRAM: str = 'your-telegram'


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=[BASE_DIR / '.env'],
        case_sensitive=False,
        env_nested_delimiter="__",
        env_prefix='TG_BOT_',
        extra='ignore',
    )

    RUN: RunSettings = RunSettings()
    DATABASE: DatabaseSettings = DatabaseSettings()
    BACKEND_URL: str = 'backend-url'
    SUPPORT: SupportSettings = SupportSettings()

    def get_db_url(self, driver: str) -> str:
        return (f'{driver}://{self.DATABASE.USER}:{self.DATABASE.PASSWORD}@'
                f'{self.DATABASE.HOST}:{self.DATABASE.INTERNAL_PORT}/{self.DATABASE.NAME}')

settings = Settings()
