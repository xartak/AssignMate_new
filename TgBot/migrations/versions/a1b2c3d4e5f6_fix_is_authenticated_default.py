"""fix is_authenticated default

Revision ID: a1b2c3d4e5f6
Revises: 75f8847f6038
Create Date: 2026-04-22 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '75f8847f6038'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE users SET is_authenticated = FALSE WHERE is_authenticated IS NULL")
    op.alter_column(
        'users',
        'is_authenticated',
        existing_type=sa.Boolean(),
        nullable=False,
        server_default=sa.text('false'),
    )


def downgrade() -> None:
    op.alter_column(
        'users',
        'is_authenticated',
        existing_type=sa.Boolean(),
        nullable=True,
        server_default=None,
    )
