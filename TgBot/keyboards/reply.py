from aiogram.types import ReplyKeyboardMarkup, KeyboardButton

def main_keyboard():
    """Основная клавиатура для авторизованных пользователей"""
    buttons = [
        [KeyboardButton(text="Курсы")],
        [KeyboardButton(text="Профиль"), KeyboardButton(text="Помощь")]
    ]
    return ReplyKeyboardMarkup(
        keyboard=buttons,
        resize_keyboard=True
    )
