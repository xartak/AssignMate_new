from functools import lru_cache

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, AsyncEngine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from config.settings import settings

ASYNC_DRIVER = 'postgresql+asyncpg'
SYNC_DRIVER = 'postgresql+psycopg'

Base = declarative_base()

def get_async_db_url() -> str:
    driver = ASYNC_DRIVER
    name = settings.DATABASE.DATABASE_NAME
    user = settings.DATABASE.DATABASE_USER
    password = settings.DATABASE.DATABASE_PASSWORD
    host = settings.DATABASE.DATABASE_HOST
    port = settings.DATABASE.DATABASE_PORT
    return f'{driver}://{user}:{password}@{host}:{port}/{name}'

def get_sync_db_url() -> str:
    driver = SYNC_DRIVER
    name = settings.DATABASE.DATABASE_NAME
    user = settings.DATABASE.DATABASE_USER
    password = settings.DATABASE.DATABASE_PASSWORD
    host = settings.DATABASE.DATABASE_HOST
    port = settings.DATABASE.DATABASE_PORT
    return f'{driver}://{user}:{password}@{host}:{port}/{name}'

engine = create_async_engine(
    url=get_async_db_url(),
    echo=True,
)
AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_session() -> AsyncSession:
    async with AsyncSessionLocal as session:
        return session