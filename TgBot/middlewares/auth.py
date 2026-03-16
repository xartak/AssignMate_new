from aiogram import BaseMiddleware
from aiogram.types import Message, CallbackQuery
from typing import Callable, Dict, Any, Awaitable
import logging

from sqlalchemy import select

from database.db import get_session
from database.models import User


logger = logging.getLogger(__name__)


class AuthMiddleware(BaseMiddleware):
    async def __call__(
        self,
        handler: Callable[[Message, Dict[str, Any]], Awaitable[Any]],
        event: Message | CallbackQuery,
        data: Dict[str, Any],
    ) -> Any:
        # Получаем telegram_id из события
        if isinstance(event, Message):
            telegram_id = event.from_user.id
        elif isinstance(event, CallbackQuery):
            telegram_id = event.from_user.id
        else:
            return await handler(event, data)

        # Ищем пользователя в БД
        async with await get_session() as session:
            result = await session.execute(
                select(User).where(User.telegram_id == telegram_id)
            )
            user = result.scalar_one_or_none()

            if user and user.is_authenticated:
                # Добавляем пользователя в data для хендлеров
                data['user'] = user
                data['access_token'] = user.access_token

        return await handler(event, data)