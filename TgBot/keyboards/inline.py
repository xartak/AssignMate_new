from aiogram.types import InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder
from typing import Optional


class PaginationKeyboard:
    @staticmethod
    def create(
        current_page: int,
        total_pages: int,
        next_url: Optional[str],
        prev_url: Optional[str]
    ) -> InlineKeyboardMarkup:
        """
        Создает клавиатуру для пагинации

        Args:
            current_page: текущая страница
            total_pages: всего страниц
            next_url: URL следующей страницы
            prev_url: URL предыдущей страницы
        """
        builder = InlineKeyboardBuilder()

        # Кнопки навигации
        if prev_url:
            builder.button(
                text="◀️ Предыдущая",
                callback_data=f"page:{current_page - 1}:{next_url}:{prev_url}"
            )

        # Информация о странице
        builder.button(
            text=f"📄 {current_page}/{total_pages}",
            callback_data="current_page_info"
        )

        if next_url:
            builder.button(
                text="Следующая ▶️",
                callback_data=f"page:{current_page + 1}:{next_url}:{prev_url}"
            )

        # Кнопка обновления
        builder.button(
            text="🔄 Обновить",
            callback_data="refresh_courses",
        )

        # Располагаем кнопки
        if prev_url and next_url:
            builder.adjust(1, 2, 1)  # info на отдельной строке
        else:
            builder.adjust(2, 1, 1)  # если только одна стрелка

        return builder.as_markup()