from sqlalchemy import Column, Integer, String, BigInteger, DateTime, Boolean
from datetime import datetime

from database.db import Base


class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    telegram_id = Column(BigInteger, unique=True, nullable=False)
    telegram_username = Column(String, nullable=True)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)

    backend_user_id = Column(Integer, nullable=True)
    access_token = Column(String, nullable=True)
    refresh_token = Column(String, nullable=True)
    token_expires_at = Column(DateTime, nullable=True)

    is_authenticated = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now())
    updated_at = Column(DateTime, default=datetime.now(), onupdate=datetime.now())
