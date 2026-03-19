"""
Модели базы данных (SQLAlchemy ORM).
"""
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import (
    String, Text, Boolean, DateTime, Integer, ForeignKey,
    Table, Column, Enum as SAEnum
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
import enum


def utcnow():
    return datetime.now(timezone.utc)


# ─── Роли ────────────────────────────────────────────────────────────────────
class RoleName(str, enum.Enum):
    ADMIN = "admin"
    TEACHER = "teacher"
    STUDENT = "student"


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    can_create_notes: Mapped[bool] = mapped_column(Boolean, default=False)
    can_edit_notes: Mapped[bool] = mapped_column(Boolean, default=False)
    can_delete_notes: Mapped[bool] = mapped_column(Boolean, default=False)
    can_publish_notes: Mapped[bool] = mapped_column(Boolean, default=False)
    can_manage_users: Mapped[bool] = mapped_column(Boolean, default=False)
    can_comment: Mapped[bool] = mapped_column(Boolean, default=True)

    users: Mapped[List["User"]] = relationship("User", back_populates="role")


# ─── Пользователи ─────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_blocked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"), nullable=False)
    role: Mapped["Role"] = relationship("Role", back_populates="users")

    notes: Mapped[List["Note"]] = relationship("Note", back_populates="author", cascade="all, delete-orphan")
    comments: Mapped[List["Comment"]] = relationship("Comment", back_populates="author", cascade="all, delete-orphan")
    logs: Mapped[List["ActivityLog"]] = relationship("ActivityLog", back_populates="user", cascade="all, delete-orphan")


# ─── Теги ─────────────────────────────────────────────────────────────────────
class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    color: Mapped[str] = mapped_column(String(20), default="#6366f1")

    notes: Mapped[List["Note"]] = relationship("Note", secondary="note_tags", back_populates="tags")


# M2M: заметки ↔ теги
note_tags = Table(
    "note_tags",
    Base.metadata,
    Column("note_id", Integer, ForeignKey("notes.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)

# M2M: связи между заметками
note_links = Table(
    "note_links",
    Base.metadata,
    Column("source_id", Integer, ForeignKey("notes.id", ondelete="CASCADE"), primary_key=True),
    Column("target_id", Integer, ForeignKey("notes.id", ondelete="CASCADE"), primary_key=True),
)


# ─── Заметки ──────────────────────────────────────────────────────────────────
class Note(Base):
    __tablename__ = "notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, default="")
    is_published: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    views_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    author_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    author: Mapped["User"] = relationship("User", back_populates="notes")

    tags: Mapped[List["Tag"]] = relationship("Tag", secondary="note_tags", back_populates="notes")
    comments: Mapped[List["Comment"]] = relationship(
        "Comment", back_populates="note", cascade="all, delete-orphan",
        order_by="Comment.created_at"
    )

    # Исходящие связи (from this note)
    linked_notes: Mapped[List["Note"]] = relationship(
        "Note",
        secondary=note_links,
        primaryjoin="Note.id == note_links.c.source_id",
        secondaryjoin="Note.id == note_links.c.target_id",
        lazy="select",
    )


# ─── Комментарии ──────────────────────────────────────────────────────────────
class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_answer: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    note_id: Mapped[int] = mapped_column(ForeignKey("notes.id", ondelete="CASCADE"), nullable=False)
    note: Mapped["Note"] = relationship("Note", back_populates="comments")

    author_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    author: Mapped["User"] = relationship("User", back_populates="comments")

    parent_id: Mapped[Optional[int]] = mapped_column(ForeignKey("comments.id", ondelete="CASCADE"), nullable=True)
    replies: Mapped[List["Comment"]] = relationship("Comment", back_populates="parent", lazy="selectin", join_depth=2)
    parent: Mapped[Optional["Comment"]] = relationship("Comment", back_populates="replies", remote_side=[id])


# ─── Лог активности ───────────────────────────────────────────────────────────
class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    action: Mapped[str] = mapped_column(String(200), nullable=False)
    entity_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    entity_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    user: Mapped[Optional["User"]] = relationship("User", back_populates="logs")
