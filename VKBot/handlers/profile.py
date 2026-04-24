from vkbottle.bot import BotLabeler, Message

from config import settings
from database.models import User
from keyboards.reply import main_keyboard
from services.api_client import BackendAPIClient
from utils.auth import request_with_refresh
from utils.formatters import format_help, format_profile

labeler = BotLabeler()


@labeler.message(text=["👤 Профиль", "Профиль", "/профиль"])
async def show_profile(
    message: Message,
    user: User | None = None,
    access_token: str | None = None,
    **_,
):
    if not user or not user.is_authenticated or not access_token:
        await message.answer(
            "❌ Вы не авторизованы. Отправьте /start, чтобы привязать аккаунт."
        )
        return

    async with BackendAPIClient(
        base_url=settings.BACKEND_URL,
        service_token=settings.RUN.BOT_SERVICE_TOKEN,
    ) as client:
        profile, status, _ = await request_with_refresh(
            user,
            access_token,
            lambda token: client.get_profile(access_token=token),
        )

    if profile is None:
        if status == 401:
            await message.answer(
                "Токен устарел. Отправьте /start для повторной привязки."
            )
        else:
            await message.answer("Не удалось получить профиль. Попробуйте позже.")
        return

    await message.answer(format_profile(profile), keyboard=main_keyboard())


@labeler.message(text=["❓ Помощь", "Помощь", "/помощь", "/help"])
async def show_help(message: Message, **_):
    await message.answer(
        format_help(
            support_email=settings.SUPPORT.EMAIL,
            support_telegram=settings.SUPPORT.TELEGRAM,
            support_vk=settings.SUPPORT.VK,
        ),
        keyboard=main_keyboard(),
    )
