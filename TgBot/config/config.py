import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()


@dataclass
class BotSettings:
    TOKEN: str = os.getenv('TG_BOT_TOKEN')
    BOT_SERVICE_TOKEN: str = os.getenv('TG_BOT_SERVICE_TOKEN')


@dataclass
class DatabaseSettings:
    NAME: str = os.getenv('TG_BOT_DATABASE_NAME')
    USER: str = os.getenv('TG_BOT_DATABASE_USER')
    PASSWORD: str = os.getenv('TG_BOT_DATABASE_PASSWORD')
    HOST: str = os.getenv('TG_BOT_DATABASE_HOST')
    PORT: int = os.getenv('TG_BOT_DATABASE_INTERNAL_PORT')

    def get_db_url(self, driver: str) -> str:
        return (f'{driver}://{self.USER}:{self.PASSWORD}@'
                f'{self.HOST}:{self.PORT}/{self.NAME}')


@dataclass
class SupportSettings:
    EMAIL: str = os.getenv('TG_BOT_SUPPORT_EMAIL')
    TELEGRAM: str = os.getenv('TG_BOT_SUPPORT_TELEGRAM')


@dataclass
class Settings:
    BOT: BotSettings = BotSettings
    DATABASE: DatabaseSettings = DatabaseSettings
    BACKEND_URL: str = os.getenv('TG_BOT_BACKEND_URL')
    SUPPORT: SupportSettings = SupportSettings

settings = Settings()
