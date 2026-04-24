import logging
import re

from vkbottle.bot import BotLabeler, Message

from config import settings
from database.db import get_session
from database.models import User
from keyboards.reply import main_keyboard, link_hint_keyboard
from services.api_client import BackendAPIClient
from utils.formatters import format_link_instructions, format_link_success

logger = logging.getLogger(__name__)
labeler = BotLabeler()

# Код — 8 символов из алфавита без 0/O/1/I (см. vk/models.py на бэке).
CODE_PATTERN = re.compile(r"^[A-HJ-NP-Z2-9]{8}$")


@labeler.message(text=["/start", "start", "начать", "Начать"])
async def handle_start(message: Message, user: User | None = None, **_):
    """Приветствие, если пользователь ещё не привязал аккаунт."""
    if user and user.is_authenticated:
        await message.answer(
            "Вы уже авторизованы. Используйте меню для навигации.",
            keyboard=main_keyboard(),
        )
        return

    group_link = (
        f"https://vk.com/{settings.GROUP_SCREEN_NAME}"
        if settings.GROUP_SCREEN_NAME
        else ""
    )
    await message.answer(
        format_link_instructions(group_link),
        keyboard=link_hint_keyboard(),
    )


@labeler.message(regex=CODE_PATTERN)
async def handle_link_code(message: Message, user: User | None = None, **_):
    """Пользователь прислал код привязки — верифицируем через бэкенд."""
    if user and user.is_authenticated:
        await message.answer(
            "Аккаунт уже привязан. Меню доступно ниже.",
            keyboard=main_keyboard(),
        )
        return

    code = (message.text or "").strip().upper()

    from_id = message.from_id
    # Профиль пользователя через users.get не вытягиваем:
    # для этого нужен отдельный scope у community token, и он часто не настроен.
    # Имя и screen_name в БД — nullable, этого достаточно.
    vk_screen_name = ""
    first_name = ""
    last_name = ""

    async with BackendAPIClient(
        base_url=settings.BACKEND_URL,
        service_token=settings.RUN.BOT_SERVICE_TOKEN,
    ) as client:
        result = await client.verify_code(
            code=code,
            vk_user_id=from_id,
            vk_screen_name=vk_screen_name,
        )

    if not result or not result.get("success"):
        await message.answer(
            "❌ Не удалось привязать аккаунт. Код недействителен или истёк.\n"
            "Получите новый код в личном кабинете и попробуйте снова."
        )
        return

    async with get_session() as session:
        new_user = User(
            vk_user_id=from_id,
            vk_screen_name=vk_screen_name,
            first_name=first_name,
            last_name=last_name,
            backend_user_id=result.get("user_id"),
            access_token=result.get("access_token"),
            refresh_token=result.get("refresh_token"),
            is_authenticated=True,
        )
        session.add(new_user)
        try:
            await session.commit()
        except Exception as e:
            logger.warning(f"insert failed (likely already exists): {e}")
            await session.rollback()
            # Обновим существующую запись.
            from sqlalchemy import select

            existing = (
                await session.execute(
                    select(User).where(User.vk_user_id == from_id)
                )
            ).scalar_one_or_none()
            if existing:
                existing.vk_screen_name = vk_screen_name
                existing.first_name = first_name
                existing.last_name = last_name
                existing.backend_user_id = result.get("user_id")
                existing.access_token = result.get("access_token")
                existing.refresh_token = result.get("refresh_token")
                existing.is_authenticated = True
                await session.commit()

    await message.answer(
        format_link_success(result.get("email", "")),
        keyboard=main_keyboard(),
    )
