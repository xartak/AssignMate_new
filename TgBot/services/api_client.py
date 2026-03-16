import aiohttp
from typing import Optional, Dict, List
import logging

from utils.dataclasses import PaginatedResponse, Course

logger = logging.getLogger(__name__)


class BackendAPIClient:
    def __init__(
        self,
        base_url: str,
        service_token: str,
    ) -> None:
        self.base_url = base_url.rstrip('/')
        self.service_token = service_token
        self.session: Optional[aiohttp.ClientSession] = None

    async def __aenter__(self) -> "BackendAPIClient":
        self.session = aiohttp.ClientSession(
            headers={
                'X-Service-Token': self.service_token,
                'Content-Type': 'application/json',
            },
        )
        return self

    async def __aexit__(
        self,
        exc_type,
        exc_val,
        exc_tb,
    ) -> None:
        if self.session:
            await self.session.close()

    async def verify_token(
        self,
        token: str,
        telegram_id: int,
        username: str = '',
    ) -> Optional[Dict]:
        """Проверка токена привязки"""
        url = f"{self.base_url}/api/v1/telegram/verify/"

        payload = {
            'token': token,
            'telegram_id': telegram_id,
            'telegram_username': username
        }

        try:
            async with self.session.post(
                url=url,
                json=payload
            ) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    error_data = await response.json()
                    logger.error(f"Verification failed: {error_data}")
                    return None
        except Exception as e:
            logger.error(f"API request failed: {e}")
            return None

    async def get_courses(
        self,
        access_token: str,
        page_url: str = None,
    ) -> Optional[PaginatedResponse]:
        """
        Получение списка курсов с поддержкой пагинации

        Args:
            access_token: JWT токен пользователя
            page_url: URL конкретной страницы (для пагинации)

        Returns:
            PaginatedResponse или None в случае ошибки
        """
        if page_url:
            # Если передан URL страницы, используем его
            url = page_url if page_url.startswith('http') else f"{self.base_url}{page_url}"
        else:
            # Иначе используем базовый URL
            url = f"{self.base_url}/api/v1/courses/"

        logger.info(f"Fetching courses from: {url}")

        try:
            async with self.session.get(
                    url,
                    headers={'Authorization': f'Bearer {access_token}'}
            ) as response:
                if response.status == 200:
                    data = await response.json()

                    # Логируем информацию о пагинации
                    logger.info(f"Got courses: count={data.get('count')}, results={len(data.get('results', []))}")

                    # Парсим ответ с преобразованием в объекты Course
                    paginated = PaginatedResponse.from_dict(
                        data,
                        item_parser=Course.from_dict
                    )

                    return paginated
                else:
                    error_text = await response.text()
                    logger.error(f"Failed to get courses. Status: {response.status}, Response: {error_text}")
                    return None
        except Exception as e:
            logger.error(f"Error fetching courses: {e}", exc_info=True)
            return None

    async def get_course_detail(
        self,
        access_token: str,
        course_id: int,
    ) -> Optional[Course]:
        """Получение детальной информации о конкретном курсе"""
        url = f"{self.base_url}/api/v1/courses/{course_id}/"

        try:
            async with self.session.get(
                url=url,
                headers={'Authorization': f'Bearer {access_token}'},
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    return Course.from_dict(data)
                else:
                    logger.error(f"Failed to get course {course_id}: {response.status}")
                    return None
        except Exception as e:
            logger.error(f"Error fetching course {course_id}: {e}")
            return None
