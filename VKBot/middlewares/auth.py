import logging

from sqlalchemy import select
from vkbottle.bot import Message
from vkbottle.dispatch.middlewares import BaseMiddleware

from database.db import get_session
from database.models import User

logger = logging.getLogger(__name__)


class AuthMiddleware(BaseMiddleware[Message]):
    """
    Инжектирует User + access_token в context хендлера, если пользователь
    авторизован. Если нет — оставляет user=None, access_token=None.
    """

    async def pre(self):
        vk_user_id = self.event.from_id
        try:
            async with get_session() as session:
                result = await session.execute(
                    select(User).where(User.vk_user_id == vk_user_id)
                )
                user = result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Auth middleware DB error for vk_user_id={vk_user_id}: {e}")
            self.send({"user": None, "access_token": None})
            return

        if user and user.is_authenticated and user.access_token:
            self.send({"user": user, "access_token": user.access_token})
        else:
            self.send({"user": user, "access_token": None})
