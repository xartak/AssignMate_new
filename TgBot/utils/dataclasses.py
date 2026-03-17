from dataclasses import dataclass
from typing import Optional, List, Any


@dataclass
class Course:
    """Модель курса для удобной работы"""
    id: int
    title: str
    description: str
    author_id: int

    # Добавьте другие поля по необходимости

    @classmethod
    def from_dict(
        cls,
        data: dict,
    ) -> 'Course':
        return cls(
            id=data.get('id'),
            title=data.get('title', 'Без названия'),
            description=data.get('description', ''),
            author_id=data.get('author'),
        )


@dataclass
class Lesson:
    """Модель урока"""
    id: int
    order: int
    title: str
    description: str
    materials: str | None
    duration: int | None

    @classmethod
    def from_dict(
        cls,
        data: dict,
    ) -> 'Lesson':
        return cls(
            id=data.get('id'),
            order=data.get('order', 0),
            title=data.get('title', 'Без названия'),
            description=data.get('description', ''),
            materials=data.get('materials'),
            duration=data.get('duration'),
        )


@dataclass
class Homework:
    """Модель домашнего задания"""
    id: int
    order: int
    title: str
    description: str
    type: str
    max_score: int | None
    deadline: str | None
    details: dict | None

    @classmethod
    def from_dict(
        cls,
        data: dict,
    ) -> 'Homework':
        return cls(
            id=data.get('id'),
            order=data.get('order', 0),
            title=data.get('title', 'Без названия'),
            description=data.get('description', ''),
            type=data.get('type', ''),
            max_score=data.get('max_score'),
            deadline=data.get('deadline'),
            details=data.get('details'),
        )


@dataclass
class PaginatedResponse:
    """Модель для пагинированного ответа"""
    count: int
    next: Optional[str]
    previous: Optional[str]
    results: List[Any]

    @classmethod
    def from_dict(
        cls,
        data: dict,
        item_parser=None,
    ) -> 'PaginatedResponse':
        results = data.get('results', [])
        if item_parser:
            results = [item_parser(item) for item in results]

        return cls(
            count=data.get('count', 0),
            next=data.get('next'),
            previous=data.get('previous'),
            results=results,
        )

    @property
    def has_next(self) -> bool:
        return self.next is not None

    @property
    def has_previous(self) -> bool:
        return self.previous is not None

    @property
    def is_empty(self) -> bool:
        return self.count == 0 or len(self.results) == 0
