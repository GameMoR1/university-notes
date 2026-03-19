"""Pydantic-схемы для API."""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, EmailStr, field_validator


# ─── Роль ─────────────────────────────────────────────────────────────────────
class RoleOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    can_create_notes: bool
    can_edit_notes: bool
    can_delete_notes: bool
    can_publish_notes: bool
    can_manage_users: bool
    can_comment: bool

    model_config = ConfigDict(from_attributes=True)


class RoleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    can_create_notes: bool = False
    can_edit_notes: bool = False
    can_delete_notes: bool = False
    can_publish_notes: bool = False
    can_manage_users: bool = False
    can_comment: bool = True


class RoleUpdate(BaseModel):
    description: Optional[str] = None
    can_create_notes: Optional[bool] = None
    can_edit_notes: Optional[bool] = None
    can_delete_notes: Optional[bool] = None
    can_publish_notes: Optional[bool] = None
    can_manage_users: Optional[bool] = None
    can_comment: Optional[bool] = None


# ─── Пользователи ─────────────────────────────────────────────────────────────
class UserRegister(BaseModel):
    email: EmailStr
    name: str
    password: str
    role: Optional[str] = "student"

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Пароль должен содержать минимум 8 символов")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    name: str
    is_active: bool
    is_blocked: bool
    created_at: datetime
    role: RoleOut

    model_config = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None


class UserAdminUpdate(BaseModel):
    is_blocked: Optional[bool] = None
    role_id: Optional[int] = None
    name: Optional[str] = None


# ─── Папки ────────────────────────────────────────────────────────────────────
class FolderOut(BaseModel):
    id: int
    name: str
    is_favorite: bool
    created_at: datetime
    user_id: int

    model_config = ConfigDict(from_attributes=True)


class FolderCreate(BaseModel):
    name: str


class FolderUpdate(BaseModel):
    name: Optional[str] = None
    is_favorite: Optional[bool] = None


# ─── Теги ─────────────────────────────────────────────────────────────────────
class TagOut(BaseModel):
    id: int
    name: str
    color: str

    model_config = ConfigDict(from_attributes=True)


class TagCreate(BaseModel):
    name: str
    color: str = "#6366f1"


# ─── Заметки ──────────────────────────────────────────────────────────────────
class NoteAuthor(BaseModel):
    id: int
    name: str
    email: str

    model_config = ConfigDict(from_attributes=True)


class LinkedNoteShort(BaseModel):
    id: int
    title: str
    is_published: bool

    model_config = ConfigDict(from_attributes=True)


class NoteCreate(BaseModel):
    title: str
    content: str = ""
    is_published: bool = False
    tag_ids: List[int] = []
    linked_note_ids: List[int] = []
    folder_id: Optional[int] = None


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    is_published: Optional[bool] = None
    tag_ids: Optional[List[int]] = None
    linked_note_ids: Optional[List[int]] = None
    folder_id: Optional[int] = None


class NoteShort(BaseModel):
    id: int
    title: str
    is_published: bool
    views_count: int
    comments_count: int = 0
    created_at: datetime
    updated_at: datetime
    author: NoteAuthor
    tags: List[TagOut] = []
    folder_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class NoteOut(NoteShort):
    content: str
    linked_notes: List[LinkedNoteShort] = []

    model_config = ConfigDict(from_attributes=True)


# ─── Граф ─────────────────────────────────────────────────────────────────────
class GraphNode(BaseModel):
    id: int
    title: str
    is_published: bool
    tags: List[TagOut] = []
    links_count: int = 0
    comments_count: int = 0
    views_count: int = 0


class GraphEdge(BaseModel):
    source: int
    target: int


class GraphData(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]

class GraphLinkCreate(BaseModel):
    source_id: int
    target_id: int


# ─── Комментарии ──────────────────────────────────────────────────────────────
class CommentCreate(BaseModel):
    content: str
    parent_id: Optional[int] = None


class CommentOut(BaseModel):
    id: int
    content: str
    is_answer: bool
    created_at: datetime
    author: NoteAuthor
    parent_id: Optional[int] = None
    replies: List["CommentOut"] = []

    model_config = ConfigDict(from_attributes=True)


CommentOut.model_rebuild()


# ─── Токены ───────────────────────────────────────────────────────────────────
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


class TokenRefresh(BaseModel):
    refresh_token: str


# ─── Статистика ───────────────────────────────────────────────────────────────
class StatsOut(BaseModel):
    total_users: int
    total_notes: int
    published_notes: int
    total_comments: int
    total_tags: int
    notes_by_role: dict
    recent_logs: List[dict]


# ─── Пагинация ────────────────────────────────────────────────────────────────
class PaginatedNotes(BaseModel):
    items: List[NoteShort]
    total: int
    page: int
    per_page: int
    pages: int


class PaginatedUsers(BaseModel):
    items: List[UserOut]
    total: int
    page: int
    per_page: int
    pages: int


# ─── Ответы ───────────────────────────────────────────────────────────────────
class MessageResponse(BaseModel):
    message: str
