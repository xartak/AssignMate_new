from aiogram import Router, F
from aiogram.types import Message, CallbackQuery
import logging

from config.settings import settings
from services.api_client import BackendAPIClient
from database.models import User
from keyboards.inline import (
    courses_keyboard,
    lessons_keyboard,
    homeworks_keyboard,
    homework_detail_keyboard,
)
from utils.auth import request_with_refresh
from utils.formatters import (
    format_empty_courses,
    format_courses_header,
    format_lessons_header,
    format_homeworks_header,
    format_homework_detail,
)

logger = logging.getLogger(__name__)
router = Router()


async def _render_text(
    message: Message,
    text: str,
    reply_markup=None,
    edit: bool = False,
):
    if edit:
        await message.edit_text(
            text=text,
            parse_mode="Markdown",
            reply_markup=reply_markup,
        )
    else:
        await message.answer(
            text=text,
            parse_mode="Markdown",
            reply_markup=reply_markup,
        )


async def _handle_unauthorized(
    message: Message,
    edit: bool = False,
):
    await _render_text(
        message,
        text=(
            "❌ Токен устарел. Повторно привяжите аккаунт через /start."
        ),
        edit=edit,
    )


async def _handle_generic_error(
    message: Message,
    edit: bool = False,
):
    await _render_text(
        message,
        text=(
            "❌ Ошибка загрузки. Попробуйте позже или проверьте подключение к интернету."
        ),
        edit=edit,
    )


async def _render_courses_list(
    message: Message,
    user: User,
    access_token: str,
    page: int,
    edit: bool,
):
    async with BackendAPIClient(
        base_url=settings.BACKEND_URL,
        service_token=settings.BOT_SERVICE_TOKEN,
    ) as client:
        response, status, access_token = await request_with_refresh(
            user,
            access_token,
            lambda token: client.get_courses(access_token=token, page=page),
        )

    if response is None:
        if status == 401:
            await _handle_unauthorized(message, edit=edit)
        else:
            await _handle_generic_error(message, edit=edit)
        return

    if response.is_empty:
        await _render_text(
            message,
            text=format_empty_courses(),
            edit=edit,
        )
        return

    await _render_text(
        message,
        text=format_courses_header(page=page, has_next=response.has_next),
        reply_markup=courses_keyboard(
            courses=response.results,
            page=page,
            has_prev=response.has_previous,
            has_next=response.has_next,
        ),
        edit=edit,
    )


async def _render_lessons_list(
    message: Message,
    user: User,
    access_token: str,
    course_id: int,
    page: int,
    edit: bool,
):
    async with BackendAPIClient(
        base_url=settings.BACKEND_URL,
        service_token=settings.BOT_SERVICE_TOKEN,
    ) as client:
        course, course_status, access_token = await request_with_refresh(
            user,
            access_token,
            lambda token: client.get_course_detail(
                access_token=token,
                course_id=course_id,
            ),
        )
        if course_status == 401 and course is None:
            await _handle_unauthorized(message, edit=edit)
            return

        lessons, status, access_token = await request_with_refresh(
            user,
            access_token,
            lambda token: client.get_lessons(
                access_token=token,
                course_id=course_id,
                page=page,
            ),
        )

    if lessons is None:
        if status == 401:
            await _handle_unauthorized(message, edit=edit)
        else:
            await _handle_generic_error(message, edit=edit)
        return

    course_title = course.title if course else f"Курс {course_id}"

    if lessons.is_empty:
        await _render_text(
            message,
            text=f"📭 **Уроки не найдены**\n\n{course_title}",
            reply_markup=lessons_keyboard(
                course_id=course_id,
                lessons=[],
                page=page,
                has_prev=False,
                has_next=False,
            ),
            edit=edit,
        )
        return

    await _render_text(
        message,
        text=format_lessons_header(
            course_title=course_title,
            page=page,
            has_next=lessons.has_next,
        ),
        reply_markup=lessons_keyboard(
            course_id=course_id,
            lessons=lessons.results,
            page=page,
            has_prev=lessons.has_previous,
            has_next=lessons.has_next,
        ),
        edit=edit,
    )


async def _render_homeworks_list(
    message: Message,
    user: User,
    access_token: str,
    course_id: int,
    lesson_order: int,
    page: int,
    edit: bool,
):
    async with BackendAPIClient(
        base_url=settings.BACKEND_URL,
        service_token=settings.BOT_SERVICE_TOKEN,
    ) as client:
        course, course_status, access_token = await request_with_refresh(
            user,
            access_token,
            lambda token: client.get_course_detail(
                access_token=token,
                course_id=course_id,
            ),
        )
        if course_status == 401 and course is None:
            await _handle_unauthorized(message, edit=edit)
            return

        lesson, lesson_status, access_token = await request_with_refresh(
            user,
            access_token,
            lambda token: client.get_lesson_detail(
                access_token=token,
                course_id=course_id,
                lesson_order=lesson_order,
            ),
        )
        if lesson_status == 401 and lesson is None:
            await _handle_unauthorized(message, edit=edit)
            return

        homeworks, status, access_token = await request_with_refresh(
            user,
            access_token,
            lambda token: client.get_homeworks(
                access_token=token,
                course_id=course_id,
                lesson_order=lesson_order,
                page=page,
            ),
        )

    if homeworks is None:
        if status == 401:
            await _handle_unauthorized(message, edit=edit)
        else:
            await _handle_generic_error(message, edit=edit)
        return

    course_title = course.title if course else f"Курс {course_id}"
    lesson_title = lesson.title if lesson else f"Урок {lesson_order}"

    if homeworks.is_empty:
        await _render_text(
            message,
            text=(
                "📭 **Домашние задания не найдены**\n\n"
                f"{course_title} — урок {lesson_order}"
            ),
            reply_markup=homeworks_keyboard(
                course_id=course_id,
                lesson_order=lesson_order,
                homeworks=[],
                page=page,
                has_prev=False,
                has_next=False,
            ),
            edit=edit,
        )
        return

    await _render_text(
        message,
        text=format_homeworks_header(
            course_title=course_title,
            lesson_title=lesson_title,
            lesson_order=lesson_order,
            page=page,
            has_next=homeworks.has_next,
        ),
        reply_markup=homeworks_keyboard(
            course_id=course_id,
            lesson_order=lesson_order,
            homeworks=homeworks.results,
            page=page,
            has_prev=homeworks.has_previous,
            has_next=homeworks.has_next,
        ),
        edit=edit,
    )


async def _render_homework_detail(
    message: Message,
    user: User,
    access_token: str,
    course_id: int,
    lesson_order: int,
    homework_order: int,
):
    async with BackendAPIClient(
        base_url=settings.BACKEND_URL,
        service_token=settings.BOT_SERVICE_TOKEN,
    ) as client:
        homework, status, access_token = await request_with_refresh(
            user,
            access_token,
            lambda token: client.get_homework_detail(
                access_token=token,
                course_id=course_id,
                lesson_order=lesson_order,
                homework_order=homework_order,
            ),
        )

    if homework is None:
        if status == 401:
            await _handle_unauthorized(message, edit=True)
        else:
            await _render_text(
                message,
                text="❌ Задание не найдено.",
                edit=True,
            )
        return

    await _render_text(
        message,
        text=format_homework_detail(homework),
        reply_markup=homework_detail_keyboard(course_id, lesson_order),
        edit=True,
    )


@router.message(F.text == "Курсы")
async def show_courses(
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

    loading_msg = await message.answer(text="🔄 Загружаю список курсов...")
    await _render_courses_list(
        message=message,
        user=user,
        access_token=access_token,
        page=1,
        edit=False,
    )
    await loading_msg.delete()


@router.callback_query(F.data.startswith("courses_page:"))
async def handle_courses_pagination(
    callback: CallbackQuery,
    user: User | None = None,
    access_token: str | None = None,
):
    await callback.answer(text="🔄 Загружаю...")

    if not user or not user.is_authenticated or not access_token:
        await _handle_unauthorized(callback.message, edit=True)
        return

    parts = callback.data.split(":")
    page = int(parts[1]) if len(parts) > 1 else 1

    await _render_courses_list(
        message=callback.message,
        user=user,
        access_token=access_token,
        page=page,
        edit=True,
    )


@router.callback_query(F.data.startswith("course:"))
async def handle_course_select(
    callback: CallbackQuery,
    user: User | None = None,
    access_token: str | None = None,
):
    await callback.answer(text="🔄 Загружаю уроки...")

    if not user or not user.is_authenticated or not access_token:
        await _handle_unauthorized(callback.message, edit=True)
        return

    parts = callback.data.split(":")
    course_id = int(parts[1]) if len(parts) > 1 else 0

    await _render_lessons_list(
        message=callback.message,
        user=user,
        access_token=access_token,
        course_id=course_id,
        page=1,
        edit=True,
    )


@router.callback_query(F.data.startswith("lessons_page:"))
async def handle_lessons_pagination(
    callback: CallbackQuery,
    user: User | None = None,
    access_token: str | None = None,
):
    await callback.answer(text="🔄 Загружаю уроки...")

    if not user or not user.is_authenticated or not access_token:
        await _handle_unauthorized(callback.message, edit=True)
        return

    parts = callback.data.split(":")
    course_id = int(parts[1]) if len(parts) > 1 else 0
    page = int(parts[2]) if len(parts) > 2 else 1

    await _render_lessons_list(
        message=callback.message,
        user=user,
        access_token=access_token,
        course_id=course_id,
        page=page,
        edit=True,
    )


@router.callback_query(F.data.startswith("lesson:"))
async def handle_lesson_select(
    callback: CallbackQuery,
    user: User | None = None,
    access_token: str | None = None,
):
    await callback.answer(text="🔄 Загружаю задания...")

    if not user or not user.is_authenticated or not access_token:
        await _handle_unauthorized(callback.message, edit=True)
        return

    parts = callback.data.split(":")
    course_id = int(parts[1]) if len(parts) > 1 else 0
    lesson_order = int(parts[2]) if len(parts) > 2 else 0

    await _render_homeworks_list(
        message=callback.message,
        user=user,
        access_token=access_token,
        course_id=course_id,
        lesson_order=lesson_order,
        page=1,
        edit=True,
    )


@router.callback_query(F.data.startswith("homeworks_page:"))
async def handle_homeworks_pagination(
    callback: CallbackQuery,
    user: User | None = None,
    access_token: str | None = None,
):
    await callback.answer(text="🔄 Загружаю задания...")

    if not user or not user.is_authenticated or not access_token:
        await _handle_unauthorized(callback.message, edit=True)
        return

    parts = callback.data.split(":")
    course_id = int(parts[1]) if len(parts) > 1 else 0
    lesson_order = int(parts[2]) if len(parts) > 2 else 0
    page = int(parts[3]) if len(parts) > 3 else 1

    await _render_homeworks_list(
        message=callback.message,
        user=user,
        access_token=access_token,
        course_id=course_id,
        lesson_order=lesson_order,
        page=page,
        edit=True,
    )


@router.callback_query(F.data.startswith("homework:"))
async def handle_homework_select(
    callback: CallbackQuery,
    user: User | None = None,
    access_token: str | None = None,
):
    await callback.answer(text="🔄 Загружаю задание...")

    if not user or not user.is_authenticated or not access_token:
        await _handle_unauthorized(callback.message, edit=True)
        return

    parts = callback.data.split(":")
    course_id = int(parts[1]) if len(parts) > 1 else 0
    lesson_order = int(parts[2]) if len(parts) > 2 else 0
    homework_order = int(parts[3]) if len(parts) > 3 else 0

    await _render_homework_detail(
        message=callback.message,
        user=user,
        access_token=access_token,
        course_id=course_id,
        lesson_order=lesson_order,
        homework_order=homework_order,
    )


@router.callback_query(F.data.startswith("back:"))
async def handle_back_navigation(
    callback: CallbackQuery,
    user: User | None = None,
    access_token: str | None = None,
):
    await callback.answer()

    if not user or not user.is_authenticated or not access_token:
        await _handle_unauthorized(callback.message, edit=True)
        return

    parts = callback.data.split(":")
    destination = parts[1] if len(parts) > 1 else "courses"

    if destination == "courses":
        await _render_courses_list(
            message=callback.message,
            user=user,
            access_token=access_token,
            page=1,
            edit=True,
        )
        return

    if destination == "lessons" and len(parts) > 2:
        course_id = int(parts[2])
        await _render_lessons_list(
            message=callback.message,
            user=user,
            access_token=access_token,
            course_id=course_id,
            page=1,
            edit=True,
        )
        return

    if destination == "homeworks" and len(parts) > 3:
        course_id = int(parts[2])
        lesson_order = int(parts[3])
        await _render_homeworks_list(
            message=callback.message,
            user=user,
            access_token=access_token,
            course_id=course_id,
            lesson_order=lesson_order,
            page=1,
            edit=True,
        )
        return

    await _handle_generic_error(callback.message, edit=True)
