from aiogram import Router, F
from aiogram.types import Message, CallbackQuery
from aiogram.utils.keyboard import InlineKeyboardBuilder
import logging

from config.settings import settings
from services.api_client import BackendAPIClient
from database.models import User
from database.db import get_session
from sqlalchemy import select
from keyboards.inline import PaginationKeyboard
from utils.formatters import format_empty_courses, format_course_message

logger = logging.getLogger(__name__)
router = Router()

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


@router.message(F.text == '📚 Курсы')
async def show_courses(
    message: Message,
    user: User,
    access_token: str,
):
    """
    Показывает список доступных курсов (первая страница)
    """
    if not user or not user.is_authenticated:
        await message.answer(
            text="❌ Вы не авторизованы.\n"
            "Используйте /start для привязки аккаунта."
        )
        return

    # Отправляем сообщение о загрузке
    loading_msg = await message.answer(text="🔄 Загружаю список курсов...")

    # Запрашиваем курсы с бэкенда
    async with BackendAPIClient(
        base_url=settings.BACKEND_URL,
        service_token=settings.BOT_SERVICE_TOKEN,
    ) as client:
        response, status = await client.get_courses(access_token=access_token)

        if status == 401 and await refresh_user_tokens(user):
            response, status = await client.get_courses(access_token=user.access_token)

    await loading_msg.delete()

    if response is None:
        if status == 401:
            await message.answer(
                text="❌ Токен устарел. Повторно привяжите аккаунт через /start.",
            )
            return
        await message.answer(
            text="❌ **Ошибка загрузки**\n\n"
            "Не удалось получить список курсов.\n"
            "Попробуйте позже или проверьте подключение к интернету.",
            parse_mode="Markdown",
        )
        return

    if response.is_empty:
        await message.answer(
            text=format_empty_courses(),
            parse_mode="Markdown",
        )
        return

    # Сохраняем ответ в состоянии для пагинации
    # Здесь можно сохранить в FSM или Redis

    # Форматируем и отправляем сообщение
    total_pages = (response.count + 9) // 10  # Примерно, если по 10 на странице

    # Создаем клавиатуру для пагинации
    keyboard = None
    if response.has_next or response.has_previous:
        # Сохраняем URLs в каком-нибудь хранилище
        # В реальном проекте лучше использовать Redis
        keyboard = PaginationKeyboard.create(
            current_page=1,
            total_pages=total_pages,
            next_url=response.next,
            prev_url=response.previous,
        )

    await message.answer(
        format_course_message(
            courses=response.results,
            page=1,
            total_pages=total_pages,
        ),
        parse_mode="Markdown",
        reply_markup=keyboard,
    )


@router.callback_query(F.data.startswith("page:"))
async def handle_pagination(
    callback: CallbackQuery,
    user: User,
    access_token: str,
):
    """
    Обработчик пагинации
    """
    # Парсим callback_data
    # Формат: "page:1:next_url:prev_url"
    parts = callback.data.split(":")
    page = int(parts[1])
    next_url = parts[2] if len(parts) > 2 and parts[2] != "None" else None
    prev_url = parts[3] if len(parts) > 3 and parts[3] != "None" else None

    # Определяем URL для загрузки
    url_to_load = None
    if "next" in callback.data and next_url:
        url_to_load = next_url
    elif "prev" in callback.data and prev_url:
        url_to_load = prev_url

    if not url_to_load:
        await callback.answer(text="Нет доступных страниц")
        return

    # Показываем "загрузка"
    await callback.answer(text="🔄 Загружаю...")

    # Загружаем следующую страницу
    async with BackendAPIClient(
        base_url=settings.BACKEND_URL,
        service_token=settings.BOT_SERVICE_TOKEN,
    ) as client:
        response, status = await client.get_courses(
            access_token=access_token,
            page_url=url_to_load,
        )

        if status == 401 and await refresh_user_tokens(user):
            response, status = await client.get_courses(
                access_token=user.access_token,
                page_url=url_to_load,
            )

    if not response:
        if status == 401:
            await callback.message.edit_text(
                text="❌ Токен устарел. Повторно привяжите аккаунт через /start.",
                parse_mode="Markdown",
            )
            return
        await callback.message.edit_text(
            text="❌ Ошибка загрузки страницы",
            parse_mode="Markdown",
        )
        return

    # Форматируем сообщение
    total_pages = (response.count + 9) // 10

    # Обновляем клавиатуру
    keyboard = PaginationKeyboard.create(
        current_page=page,
        total_pages=total_pages,
        next_url=response.next,
        prev_url=response.previous,
    )

    # Обновляем сообщение
    await callback.message.edit_text(
        format_course_message(
            courses=response.results,
            page=page,
            total_pages=total_pages,
        ),
        parse_mode="Markdown",
        reply_markup=keyboard,
    )


@router.message(F.text.startswith('/course'))
async def show_course_detail(
    message: Message,
    user: User,
    access_token: str,
):
    """
    Показывает детальную информацию о конкретном курсе
    Использование: /course 42
    """
    if not user or not user.is_authenticated:
        await message.answer(text="❌ Вы не авторизованы")
        return

    # Парсим ID курса из сообщения
    parts = message.text.split()
    if len(parts) != 2:
        await message.answer(
            text="❌ **Неверный формат**\n\n"
            "Используйте: `/course <id>`\n"
            "Например: `/course 42`",
            parse_mode="Markdown"
        )
        return

    try:
        course_id = int(parts[1])
    except ValueError:
        await message.answer(text="❌ ID курса должен быть числом")
        return

    loading_msg = await message.answer(text=f"🔄 Загружаю информацию о курсе {course_id}...")

    async with BackendAPIClient(
        base_url=settings.BACKEND_URL,
        service_token=settings.BOT_SERVICE_TOKEN,
    ) as client:
        course, status = await client.get_course_detail(
            access_token=access_token,
            course_id=course_id,
        )

        if status == 401 and await refresh_user_tokens(user):
            course, status = await client.get_course_detail(
                access_token=user.access_token,
                course_id=course_id,
            )

    await loading_msg.delete()

    if not course:
        if status == 401:
            await message.answer(
                text="❌ Токен устарел. Повторно привяжите аккаунт через /start.",
            )
            return
        await message.answer(
            text=f"❌ **Курс с ID {course_id} не найден**\n\n"
            "Проверьте правильность ID или список доступных курсов через /courses",
            parse_mode="Markdown",
        )
        return

    # Форматируем детальную информацию
    detail_message = (
        f"📘 **{course.title}**\n"
        f"┌{'─' * 30}\n"
        f"│ **ID:** `{course.id}`\n"
        f"│ **Автор:** `{course.author_id}`\n"
        f"├{'─' * 30}\n"
        f"│ **Описание:**\n"
        f"│ {course.description}\n"
        f"└{'─' * 30}\n"
    )

    # Добавляем клавиатуру с действиями
    keyboard = InlineKeyboardBuilder()
    keyboard.button(
        text="📚 Все курсы",
        callback_data="back_to_courses",
    )
    keyboard.button(
        text="❓ Помощь",
        callback_data="help",
    )
    keyboard.adjust(2)

    await message.answer(
        text=detail_message,
        parse_mode="Markdown",
        reply_markup=keyboard.as_markup(),
    )
