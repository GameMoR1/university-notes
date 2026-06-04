"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-06-04
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "roles",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(50), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("can_create_notes", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("can_edit_notes", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("can_delete_notes", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("can_publish_notes", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("can_manage_users", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("can_comment", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_table(
        "site_settings",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("key", sa.String(100), nullable=False),
        sa.Column("value", sa.Text(), nullable=False, server_default=""),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_site_settings_key", "site_settings", ["key"], unique=True)
    op.create_table(
        "tags",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("color", sa.String(20), nullable=False, server_default="#6366f1"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_tags_name", "tags", ["name"], unique=True)
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_blocked", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("role_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"], ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_table(
        "folders",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("is_favorite", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "notes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("content", sa.Text(), nullable=False, server_default=""),
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("views_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("author_id", sa.Integer(), nullable=False),
        sa.Column("folder_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["folder_id"], ["folders.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_notes_title", "notes", ["title"])
    op.create_index("ix_notes_is_published", "notes", ["is_published"])
    op.create_table(
        "activity_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("action", sa.String(200), nullable=False),
        sa.Column("entity_type", sa.String(50), nullable=True),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "comments",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("is_answer", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("note_id", sa.Integer(), nullable=False),
        sa.Column("author_id", sa.Integer(), nullable=False),
        sa.Column("parent_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["note_id"], ["notes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["parent_id"], ["comments.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "files",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("original_name", sa.String(500), nullable=False),
        sa.Column("stored_path", sa.String(500), nullable=False),
        sa.Column("mime_type", sa.String(200), nullable=False, server_default="application/octet-stream"),
        sa.Column("file_size", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("note_id", sa.Integer(), nullable=False),
        sa.Column("author_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["note_id"], ["notes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "note_tags",
        sa.Column("note_id", sa.Integer(), nullable=False),
        sa.Column("tag_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["note_id"], ["notes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tag_id"], ["tags.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("note_id", "tag_id"),
    )
    op.create_table(
        "note_links",
        sa.Column("source_id", sa.Integer(), nullable=False),
        sa.Column("target_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["source_id"], ["notes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["target_id"], ["notes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("source_id", "target_id"),
    )


def downgrade() -> None:
    op.drop_table("note_links")
    op.drop_table("note_tags")
    op.drop_table("files")
    op.drop_table("comments")
    op.drop_table("activity_logs")
    op.drop_table("notes")
    op.drop_table("folders")
    op.drop_table("users")
    op.drop_table("tags")
    op.drop_table("site_settings")
    op.drop_table("roles")
