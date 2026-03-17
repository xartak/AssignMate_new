from aiogram import Router, F
from aiogram.types import Message
import logging

from config.settings import settings
from services.api_client import BackendAPIClient
from database.models import User
from utils.auth import request_with_refresh
from utils.formatters import format_profile, format_help

logger = logging.getLogger(__name__)
router = Router()


@router.message(F.text == "Профиль")
async def show_profile(
    message: Message,
    user: User | None = None,
    access_token: str | None = None,
):
    if not user or not user.is_authenticated or not access_token:
        await message.answer(
            text=(
                "❌ Вы не авторизованы.\n"
                "Используйте /start для привязки аккаунта."
            )
        )
        return

    loading_msg = await message.answer(text="🔄 Загружаю профиль...")

    async with BackendAPIClient(
        base_url=settings.BACKEND_URL,
        service_token=settings.BOT_SERVICE_TOKEN,
    ) as client:
        profile, status, access_token = await request_with_refresh(
            user,
            access_token,
            lambda token: client.get_profile(access_token=token),
        )

    await loading_msg.delete()

    if profile is None:
        if status == 401:
            await message.answer(
                text=(
                    "❌ Токен устарел. Повторно привяжите аккаунт через /start."
                )
            )
        else:
            await message.answer(
                text=(
                    "❌ Не удалось получить профиль. Попробуйте позже."
                )
            )
        return

    await message.answer(
        text=format_profile(profile),
        parse_mode="Markdown",
    )


@router.message(F.text == "Помощь")
async def show_help(message: Message):
    await message.answer(
        text=format_help(
            support_email=settings.SUPPORT_EMAIL,
            support_telegram=settings.SUPPORT_TELEGRAM,
        ),
        parse_mode="Markdown",
    )
