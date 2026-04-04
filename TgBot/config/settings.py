import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()

@dataclass
class DatabaseSettings:
    DATABASE_NAME: str = os.getenv('TG_BOT_DATABASE_NAME')
    DATABASE_USER: str = os.getenv('TG_BOT_DATABASE_USER')
    DATABASE_PASSWORD: str = os.getenv('TG_BOT_DATABASE_PASSWORD')
    DATABASE_HOST: str = os.getenv('TG_BOT_DATABASE_HOST')
    DATABASE_PORT: int = os.getenv('TG_BOT_DATABASE_PORT')

@dataclass
class Settings:
    BOT_TOKEN: str = os.getenv('TG_BOT_TOKEN')
    BOT_SERVICE_TOKEN: str = os.getenv('TG_BOT_SERVICE_TOKEN')
    DATABASE: DatabaseSettings = DatabaseSettings
    BACKEND_URL: str = os.getenv('TG_BOT_BACKEND_URL')
    SUPPORT_EMAIL: str = os.getenv('TG_BOT_SUPPORT_EMAIL')
    SUPPORT_TELEGRAM: str = os.getenv('TG_BOT_SUPPORT_TELEGRAM')

settings = Settings()
