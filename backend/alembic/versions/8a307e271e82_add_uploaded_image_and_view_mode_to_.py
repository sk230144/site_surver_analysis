"""add uploaded image and view mode to projects

Revision ID: 8a307e271e82
Revises: 0001_init
Create Date: 2025-12-31 23:32:35.213021
"""

from alembic import op
import sqlalchemy as sa

revision = '8a307e271e82'
down_revision = '0001_init'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column('projects', sa.Column('uploaded_image_url', sa.Text(), nullable=True))
    op.add_column('projects', sa.Column('geometry_view_mode', sa.String(20), nullable=True, server_default='uploaded'))

def downgrade() -> None:
    op.drop_column('projects', 'geometry_view_mode')
    op.drop_column('projects', 'uploaded_image_url')
