import logging

from vkbottle.bot import BotLabeler, Message

from config import settings
from database.models import User
from keyboards.carousel import courses_carousel
from keyboards.inline import (
    homework_detail_keyboard,
    homeworks_keyboard,
    lessons_keyboard,
)
from keyboards.reply import paginator_keyboard, ensure_payload, main_keyboard
from services.api_client import BackendAPIClient
from utils.auth import request_with_refresh
from utils.formatters import (
    format_empty_courses,
    format_homework_detail,
    format_homeworks_header,
    format_lessons_header,
)

logger = logging.getLogger(__name__)
labeler = BotLabeler()


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------


def _require_auth(user: User | None, access_token: str | None) -> bool:
    return bool(user and user.is_authenticated and access_token)


async def _send_unauthorized(message: Message) -> None:
    await message.answer(
        "❌ Вы не авторизованы. Отправьте /start, чтобы привязать аккаунт."
    )


async def _send_error(message: Message) -> None:
    await message.answer("Не удалось загрузить данные. Попробуйте позже.")


# ------------------------------------------------------------------
# Курсы (carousel)
# ------------------------------------------------------------------


async def _render_courses(
    message: Message,
    user: User,
    access_token: str,
    page: int,
) -> None:
    async with BackendAPIClient(
        base_url=settings.BACKEND_URL,
        service_token=settings.RUN.BOT_SERVICE_TOKEN,
    ) as client:
        response, status, _ = await request_with_refresh(
            user,
            access_token,
            lambda token: client.get_courses(access_token=token, page=page),
        )

    if response is None:
        if status == 401:
            await _send_unauthorized(message)
        else:
            await _send_error(message)
        return

    if response.is_empty:
        await message.answer(format_empty_courses(), keyboard=main_keyboard())
        return

    template = courses_carousel(response.results)
    nav = paginator_keyboard(
        page=page,
        has_prev=response.has_previous,
        has_next=response.has_next,
    )
    await message.answer(
        f"📚 Доступные курсы (страница {page}). Выберите карточку:",
        template=template,
        keyboard=nav,
    )


@labeler.message(text=["📚 Курсы", "Курсы", "/курсы"])
async def show_courses(
    message: Message,
    user: User | None = None,
    access_token: str | None = None,
    **_,
):
    if not _require_auth(user, access_token):
        await _send_unauthorized(message)
        return
    await _render_courses(message, user, access_token, page=1)


# ------------------------------------------------------------------
# Уроки
# ------------------------------------------------------------------


async def _render_lessons(
    message: Message,
    user: User,
    access_token: str,
    course_id: int,
    page: int,
) -> None:
    async with BackendAPIClient(
        base_url=settings.BACKEND_URL,
        service_token=settings.RUN.BOT_SERVICE_TOKEN,
    ) as client:
        course, course_status, access_token = await request_with_refresh(
            user,
            access_token,
            lambda token: client.get_course_detail(access_token=token, course_id=course_id),
        )
        if course_status == 401 and course is None:
            await _send_unauthorized(message)
            return

        lessons, status, _ = await request_with_refresh(
            user,
            access_token,
            lambda token: client.get_lessons(
                access_token=token, course_id=course_id, page=page
            ),
        )

    if lessons is None:
        if status == 401:
            await _send_unauthorized(message)
        else:
            await _send_error(message)
        return

    course_title = course.title if course else f"Курс {course_id}"

    if lessons.is_empty:
        await message.answer(
            f"📭 Уроки не найдены.\n\n{course_title}",
            keyboard=lessons_keyboard(
                course_id=course_id,
                lessons=[],
                page=page,
                has_prev=False,
                has_next=False,
            ),
        )
        return

    await message.answer(
        format_lessons_header(
            course_title=course_title,
            page=page,
            has_next=lessons.has_next,
        ),
        keyboard=lessons_keyboard(
            course_id=course_id,
            lessons=lessons.results,
            page=page,
            has_prev=lessons.has_previous,
            has_next=lessons.has_next,
        ),
    )


# ------------------------------------------------------------------
# Домашние задания
# ------------------------------------------------------------------


async def _render_homeworks(
    message: Message,
    user: User,
    access_token: str,
    course_id: int,
    lesson_order: int,
    page: int,
) -> None:
    async with BackendAPIClient(
        base_url=settings.BACKEND_URL,
        service_token=settings.RUN.BOT_SERVICE_TOKEN,
    ) as client:
        course, course_status, access_token = await request_with_refresh(
            user,
            access_token,
            lambda token: client.get_course_detail(access_token=token, course_id=course_id),
        )
        if course_status == 401 and course is None:
            await _send_unauthorized(message)
            return

        lesson, lesson_status, access_token = await request_with_refresh(
            user,
            access_token,
            lambda token: client.get_lesson_detail(
                access_token=token, course_id=course_id, lesson_order=lesson_order
            ),
        )
        if lesson_status == 401 and lesson is None:
            await _send_unauthorized(message)
            return

        homeworks, status, _ = await request_with_refresh(
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
            await _send_unauthorized(message)
        else:
            await _send_error(message)
        return

    course_title = course.title if course else f"Курс {course_id}"
    lesson_title = lesson.title if lesson else f"Урок {lesson_order}"

    if homeworks.is_empty:
        await message.answer(
            f"📭 Заданий пока нет.\n\n{course_title} — Урок {lesson_order}",
            keyboard=homeworks_keyboard(
                course_id=course_id,
                lesson_order=lesson_order,
                homeworks=[],
                page=page,
                has_prev=False,
                has_next=False,
            ),
        )
        return

    await message.answer(
        format_homeworks_header(
            course_title=course_title,
            lesson_title=lesson_title,
            lesson_order=lesson_order,
            page=page,
            has_next=homeworks.has_next,
        ),
        keyboard=homeworks_keyboard(
            course_id=course_id,
            lesson_order=lesson_order,
            homeworks=homeworks.results,
            page=page,
            has_prev=homeworks.has_previous,
            has_next=homeworks.has_next,
        ),
    )


async def _render_homework_detail(
    message: Message,
    user: User,
    access_token: str,
    course_id: int,
    lesson_order: int,
    homework_order: int,
) -> None:
    async with BackendAPIClient(
        base_url=settings.BACKEND_URL,
        service_token=settings.RUN.BOT_SERVICE_TOKEN,
    ) as client:
        homework, status, _ = await request_with_refresh(
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
            await _send_unauthorized(message)
        else:
            await message.answer("❌ Задание не найдено.", keyboard=main_keyboard())
        return

    await message.answer(
        format_homework_detail(homework),
        keyboard=homework_detail_keyboard(course_id, lesson_order),
    )


# ------------------------------------------------------------------
# Единый диспетчер payload (для всех text-кнопок с payload)
# ------------------------------------------------------------------


@labeler.message(payload_contains={"a": "courses"})
async def cb_courses(message: Message, user=None, access_token=None, **_):
    if not _require_auth(user, access_token):
        await _send_unauthorized(message)
        return
    await _render_courses(message, user, access_token, page=1)


@labeler.message(payload_contains={"a": "course"})
async def cb_course_select(message: Message, user=None, access_token=None, **_):
    if not _require_auth(user, access_token):
        await _send_unauthorized(message)
        return
    payload = ensure_payload(message.payload)
    course_id = payload.get("id")
    if not course_id:
        await _send_error(message)
        return
    await _render_lessons(message, user, access_token, int(course_id), page=1)


@labeler.message(payload_contains={"a": "lesson"})
async def cb_lesson_select(message: Message, user=None, access_token=None, **_):
    if not _require_auth(user, access_token):
        await _send_unauthorized(message)
        return
    payload = ensure_payload(message.payload)
    course_id = payload.get("c")
    lesson_order = payload.get("o")
    if not course_id or lesson_order is None:
        await _send_error(message)
        return
    await _render_homeworks(
        message, user, access_token, int(course_id), int(lesson_order), page=1
    )


@labeler.message(payload_contains={"a": "homework"})
async def cb_homework_select(message: Message, user=None, access_token=None, **_):
    if not _require_auth(user, access_token):
        await _send_unauthorized(message)
        return
    payload = ensure_payload(message.payload)
    course_id = payload.get("c")
    lesson_order = payload.get("l")
    homework_order = payload.get("o")
    if not course_id or lesson_order is None or homework_order is None:
        await _send_error(message)
        return
    await _render_homework_detail(
        message,
        user,
        access_token,
        int(course_id),
        int(lesson_order),
        int(homework_order),
    )


@labeler.message(payload_contains={"a": "page"})
async def cb_page(message: Message, user=None, access_token=None, **_):
    if not _require_auth(user, access_token):
        await _send_unauthorized(message)
        return
    payload = ensure_payload(message.payload)
    entity = payload.get("e")
    page = int(payload.get("p", 1))
    if entity == "courses":
        await _render_courses(message, user, access_token, page=page)
    elif entity == "lessons":
        course_id = payload.get("c")
        if not course_id:
            await _send_error(message)
            return
        await _render_lessons(message, user, access_token, int(course_id), page=page)
    elif entity == "homeworks":
        course_id = payload.get("c")
        lesson_order = payload.get("l")
        if not course_id or lesson_order is None:
            await _send_error(message)
            return
        await _render_homeworks(
            message,
            user,
            access_token,
            int(course_id),
            int(lesson_order),
            page=page,
        )
    else:
        await _send_error(message)


@labeler.message(payload_contains={"a": "back"})
async def cb_back(message: Message, user=None, access_token=None, **_):
    if not _require_auth(user, access_token):
        await _send_unauthorized(message)
        return
    payload = ensure_payload(message.payload)
    destination = payload.get("to")
    if destination == "courses":
        await _render_courses(message, user, access_token, page=1)
    elif destination == "lessons":
        course_id = payload.get("c")
        if not course_id:
            await _send_error(message)
            return
        await _render_lessons(message, user, access_token, int(course_id), page=1)
    elif destination == "homeworks":
        course_id = payload.get("c")
        lesson_order = payload.get("l")
        if not course_id or lesson_order is None:
            await _send_error(message)
            return
        await _render_homeworks(
            message,
            user,
            access_token,
            int(course_id),
            int(lesson_order),
            page=1,
        )
    else:
        await _send_error(message)


@labeler.message(payload_contains={"a": "menu"})
async def cb_menu(message: Message, **_):
    await message.answer("🏠 Главное меню", keyboard=main_keyboard())
