import logging

from vkbottle import Bot
from vkbottle.bot import BotLabeler

from config import settings
from handlers import courses, profile, start
from middlewares.auth import AuthMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def build_bot() -> Bot:
    labeler = BotLabeler()
    labeler.load(start.labeler)
    labeler.load(profile.labeler)
    labeler.load(courses.labeler)

    bot = Bot(token=settings.RUN.GROUP_TOKEN, labeler=labeler)
    bot.labeler.message_view.register_middleware(AuthMiddleware)
    return bot


if __name__ == "__main__":
    logger.info("Starting VKBot polling")
    bot = build_bot()
    # run_forever() сам стартует event loop через LoopWrapper.
    # Не оборачивать в asyncio.run — иначе RuntimeError: loop in loop.
    bot.run_forever()
