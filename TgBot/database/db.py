from contextlib import asynccontextmanager
from typing import AsyncIterator

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from config import settings

ASYNC_DRIVER = 'postgresql+asyncpg'
SYNC_DRIVER = 'postgresql+psycopg'

Base = declarative_base()

async_db_url = settings.DATABASE.get_db_url(driver=ASYNC_DRIVER)

sync_db_url = settings.DATABASE.get_db_url(driver=SYNC_DRIVER)

engine = create_async_engine(
    url=async_db_url,
    echo=True,
)
AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@asynccontextmanager
async def get_session() -> AsyncIterator[AsyncSession]:
    async with AsyncSessionLocal() as session:
        yield session
