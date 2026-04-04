from aiogram import Router
from aiogram.types import Message
from aiogram.filters import CommandStart
from aiogram.fsm.context import FSMContext
import logging

from config.settings import settings
from database.db import get_session
from database.models import User
from services.api_client import BackendAPIClient
from keyboards.reply import main_keyboard

logger = logging.getLogger(__name__)
router = Router()


@router.message(CommandStart())
async def start_command(
    message: Message,
    command,
    state: FSMContext,
):
    """
    Обработчик команды /start с поддержкой deep linking
    """
    telegram_id = message.from_user.id
    username = message.from_user.username or ""
    args = command.args

    # Проверяем, авторизован ли уже пользователь
    async with get_session() as session:
        from sqlalchemy import select
        result = await session.execute(
            select(User).where(User.telegram_id == telegram_id)
        )
        user = result.scalar_one_or_none()

        if user and user.is_authenticated:
            await message.answer(
                text="👋 Вы уже авторизованы!\n"
                "Используйте кнопку «Курсы» для просмотра доступных курсов.",
                reply_markup=main_keyboard(),
            )
            return

    # Если есть аргументы - это deep link с токеном
    if args:
        logger.info(f"Deep link received: {args} for user {telegram_id}")

        # Показываем индикатор загрузки
        loading_msg = await message.answer(text="🔄 Проверяю токен привязки...")

        # Отправляем токен на бэкенд для верификации
        async with BackendAPIClient(
            base_url=settings.BACKEND_URL,
            service_token=settings.BOT_SERVICE_TOKEN,
        ) as client:
            result = await client.verify_token(
                token=args,
                telegram_id=telegram_id,
                username=username,
            )

        if result and result.get('success'):
            # Сохраняем пользователя в локальную БД
            async with get_session() as session:
                new_user = User(
                    telegram_id=telegram_id,
                    telegram_username=username,
                    first_name=message.from_user.first_name,
                    last_name=message.from_user.last_name,
                    backend_user_id=result['user_id'],
                    access_token=result['access_token'],
                    refresh_token=result['refresh_token'],
                    is_authenticated=True,
                )
                session.add(new_user)
                await session.commit()

            await loading_msg.delete()
            await message.answer(
                text="✅ **Аккаунт успешно привязан!**\n\n"
                f"Добро пожаловать, {result.get('username', 'пользователь')}!\n\n"
                "Теперь вам доступны курсы. Используйте кнопки ниже для навигации.",
                parse_mode="Markdown",
                reply_markup=main_keyboard(),
            )
        else:
            error_msg = result.get('error', 'Неизвестная ошибка') if result else 'Токен недействителен или истек'
            await loading_msg.delete()
            await message.answer(
                text=f"❌ **Ошибка привязки**\n\n{error_msg}\n\n"
                "Попробуйте сгенерировать новую ссылку на сайте.",
                parse_mode="Markdown",
            )
    else:
        # Обычный /start без параметров
        await message.answer(
            text="👋 **Добро пожаловать в бот курсов!**\n\n"
            "Для доступа к курсам необходимо привязать ваш аккаунт.\n\n"
            "🔐 **Как привязать:**\n"
            "1. Зайдите на наш сайт и авторизуйтесь\n"
            "2. В личном кабинете нажмите «Привязать Telegram»\n"
            "3. Нажмите на полученную ссылку\n"
            "4. Вернитесь в бот — привязка произойдет автоматически!\n\n"
            "Если у вас уже есть аккаунт, но нет ссылки — запросите её на сайте.",
            parse_mode="Markdown",
        )
