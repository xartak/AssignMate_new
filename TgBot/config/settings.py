import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()

@dataclass
class Settings:
    BOT_TOKEN: str = os.getenv('TG_BOT_TOKEN')
    BOT_SERVICE_TOKEN: str = os.getenv('TG_BOT_SERVICE_TOKEN')
    DATABASE_URL: str = os.getenv('TG_BOT_DATABASE_URL')
    BACKEND_URL: str = os.getenv('TG_BOT_BACKEND_URL')
    SUPPORT_EMAIL: str = os.getenv('TG_BOT_SUPPORT_EMAIL')
    SUPPORT_TELEGRAM: str = os.getenv('TG_BOT_SUPPORT_TELEGRAM')
    # BACKEND_API_VERSION: str = os.getenv('BACKEND_API_VERSION', 'api/v1')
    # BACKEND_VERIFY_TOKEN: str = os.getenv('BACKEND_VERIFY_TOKEN', 'telegram/verify')
    # BACKEND_GET_COURSES: str = os.getenv('BACKEND_GET_COURSES', 'courses')
    # BACKEND_GET_COURSE_DETAIL: str = os.getenv('BACKEND_GET_COURSE_DETAIL', 'courses')

settings = Settings()
