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