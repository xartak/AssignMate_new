import logging
from typing import Dict, Optional

import aiohttp

from utils.dataclasses import Course, Homework, Lesson, PaginatedResponse

logger = logging.getLogger(__name__)


class BackendAPIClient:
    def __init__(self, base_url: str, service_token: str) -> None:
        self.base_url = base_url.rstrip('/')
        self.service_token = service_token
        self.session: Optional[aiohttp.ClientSession] = None

    async def __aenter__(self) -> "BackendAPIClient":
        self.session = aiohttp.ClientSession(
            headers={'Content-Type': 'application/json'},
            timeout=aiohttp.ClientTimeout(total=10),
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        if self.session:
            await self.session.close()

    async def verify_code(
        self,
        code: str,
        vk_user_id: int,
        vk_screen_name: str = '',
    ) -> Optional[Dict]:
        """
        POST /api/v1/vk/verify/ с X-Service-Token.
        Возвращает dict с success/access_token/refresh_token/user_id/email или None.
        """
        url = f"{self.base_url}/api/v1/vk/verify/"
        payload = {
            'code': code,
            'vk_user_id': vk_user_id,
            'vk_screen_name': vk_screen_name,
        }
        try:
            async with self.session.post(
                url=url,
                json=payload,
                headers={'X-Service-Token': self.service_token},
            ) as response:
                if response.status == 200:
                    return await response.json()
                try:
                    error_data = await response.json()
                except Exception:
                    error_data = await response.text()
                logger.warning(f"VK verify failed (status={response.status}): {error_data}")
                return None
        except Exception as e:
            logger.error(f"VK verify request error: {e}")
            return None

    async def refresh_token(self, refresh_token: str) -> Optional[Dict]:
        url = f"{self.base_url}/api/v1/auth/refresh/"
        try:
            async with self.session.post(url=url, json={"refresh": refresh_token}) as response:
                if response.status == 200:
                    return await response.json()
                error_text = await response.text()
                logger.error(f"Refresh failed status={response.status}: {error_text}")
                return None
        except Exception as e:
            logger.error(f"Refresh request error: {e}")
            return None

    async def get_courses(
        self,
        access_token: str,
        page: int | None = None,
    ) -> tuple[Optional[PaginatedResponse], int]:
        url = f"{self.base_url}/api/v1/courses/"
        if page:
            url = f"{url}?page={page}"
        try:
            async with self.session.get(
                url, headers={'Authorization': f'Bearer {access_token}'}
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    return (
                        PaginatedResponse.from_dict(data, item_parser=Course.from_dict),
                        response.status,
                    )
                error_text = await response.text()
                logger.error(f"get_courses {response.status}: {error_text}")
                return None, response.status
        except Exception as e:
            logger.error(f"get_courses error: {e}")
            return None, 0

    async def get_course_detail(
        self,
        access_token: str,
        course_id: int,
    ) -> tuple[Optional[Course], int]:
        url = f"{self.base_url}/api/v1/courses/{course_id}/"
        try:
            async with self.session.get(
                url, headers={'Authorization': f'Bearer {access_token}'}
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    return Course.from_dict(data), response.status
                return None, response.status
        except Exception as e:
            logger.error(f"get_course_detail error: {e}")
            return None, 0

    async def get_lessons(
        self,
        access_token: str,
        course_id: int,
        page: int | None = None,
    ) -> tuple[Optional[PaginatedResponse], int]:
        url = f"{self.base_url}/api/v1/courses/{course_id}/lessons/"
        if page:
            url = f"{url}?page={page}"
        try:
            async with self.session.get(
                url, headers={'Authorization': f'Bearer {access_token}'}
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    return (
                        PaginatedResponse.from_dict(data, item_parser=Lesson.from_dict),
                        response.status,
                    )
                return None, response.status
        except Exception as e:
            logger.error(f"get_lessons error: {e}")
            return None, 0

    async def get_lesson_detail(
        self,
        access_token: str,
        course_id: int,
        lesson_order: int,
    ) -> tuple[Optional[Lesson], int]:
        url = f"{self.base_url}/api/v1/courses/{course_id}/lessons/{lesson_order}/"
        try:
            async with self.session.get(
                url, headers={'Authorization': f'Bearer {access_token}'}
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    return Lesson.from_dict(data), response.status
                return None, response.status
        except Exception as e:
            logger.error(f"get_lesson_detail error: {e}")
            return None, 0

    async def get_homeworks(
        self,
        access_token: str,
        course_id: int,
        lesson_order: int,
        page: int | None = None,
    ) -> tuple[Optional[PaginatedResponse], int]:
        url = f"{self.base_url}/api/v1/courses/{course_id}/lessons/{lesson_order}/homeworks/"
        if page:
            url = f"{url}?page={page}"
        try:
            async with self.session.get(
                url, headers={'Authorization': f'Bearer {access_token}'}
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    return (
                        PaginatedResponse.from_dict(data, item_parser=Homework.from_dict),
                        response.status,
                    )
                return None, response.status
        except Exception as e:
            logger.error(f"get_homeworks error: {e}")
            return None, 0

    async def get_homework_detail(
        self,
        access_token: str,
        course_id: int,
        lesson_order: int,
        homework_order: int,
    ) -> tuple[Optional[Homework], int]:
        url = (
            f"{self.base_url}/api/v1/courses/{course_id}/lessons/{lesson_order}/"
            f"homeworks/{homework_order}/"
        )
        try:
            async with self.session.get(
                url, headers={'Authorization': f'Bearer {access_token}'}
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    return Homework.from_dict(data), response.status
                return None, response.status
        except Exception as e:
            logger.error(f"get_homework_detail error: {e}")
            return None, 0

    async def get_profile(self, access_token: str) -> tuple[Optional[Dict], int]:
        url = f"{self.base_url}/api/v1/auth/me/"
        try:
            async with self.session.get(
                url, headers={'Authorization': f'Bearer {access_token}'}
            ) as response:
                if response.status == 200:
                    return await response.json(), response.status
                return None, response.status
        except Exception as e:
            logger.error(f"get_profile error: {e}")
            return None, 0
