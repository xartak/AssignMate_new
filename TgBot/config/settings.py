import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()

@dataclass
class Settings:
    BOT_TOKEN: str = os.getenv('BOT_TOKEN') or os.getenv('TELEGRAM_BOT_TOKEN')
    BOT_SERVICE_TOKEN: str = os.getenv('BOT_SERVICE_TOKEN')
    DATABASE_URL: str = os.getenv('DATABASE_URL', 'postgresql+asyncpg://bot:bot@localhost:5432/bot')
    BACKEND_URL: str = os.getenv('BACKEND_URL', 'http://localhost:8000')
    SUPPORT_EMAIL: str = os.getenv('SUPPORT_EMAIL', '')
    SUPPORT_TELEGRAM: str = os.getenv('SUPPORT_TELEGRAM', '')
    # BACKEND_API_VERSION: str = os.getenv('BACKEND_API_VERSION', 'api/v1')
    # BACKEND_VERIFY_TOKEN: str = os.getenv('BACKEND_VERIFY_TOKEN', 'telegram/verify')
    # BACKEND_GET_COURSES: str = os.getenv('BACKEND_GET_COURSES', 'courses')
    # BACKEND_GET_COURSE_DETAIL: str = os.getenv('BACKEND_GET_COURSE_DETAIL', 'courses')

settings = Settings()
