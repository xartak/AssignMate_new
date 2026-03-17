import logging

from sqlalchemy import select

from config.settings import settings
from database.db import get_session
from database.models import User
from services.api_client import BackendAPIClient

logger = logging.getLogger(__name__)


async def refresh_user_tokens(user: User) -> bool:
    if not user or not user.refresh_token:
        return False

    async with BackendAPIClient(
        base_url=settings.BACKEND_URL,
        service_token=settings.BOT_SERVICE_TOKEN,
    ) as client:
        tokens = await client.refresh_token(user.refresh_token)

    if not tokens or "access" not in tokens:
        async with await get_session() as session:
            result = await session.execute(select(User).where(User.id == user.id))
            db_user = result.scalar_one_or_none()
            if db_user:
                db_user.is_authenticated = False
                db_user.access_token = None
                db_user.refresh_token = None
                await session.commit()
                user.is_authenticated = False
                user.access_token = None
                user.refresh_token = None
        return False

    async with await get_session() as session:
        result = await session.execute(select(User).where(User.id == user.id))
        db_user = result.scalar_one_or_none()
        if not db_user:
            return False

        db_user.access_token = tokens["access"]
        if tokens.get("refresh"):
            db_user.refresh_token = tokens["refresh"]
        db_user.is_authenticated = True
        await session.commit()

        user.access_token = db_user.access_token
        user.refresh_token = db_user.refresh_token

    return True


async def request_with_refresh(
    user: User,
    access_token: str,
    request_fn,
):
    """
    Выполняет запрос к backend, при необходимости обновляя токен.

    request_fn: асинхронная функция, принимающая access_token.
    """
    response, status = await request_fn(access_token)
    if status == 401 and await refresh_user_tokens(user):
        access_token = user.access_token
        response, status = await request_fn(access_token)
    return response, status, access_token
