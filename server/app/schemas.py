from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

ALLOWED_CATEGORIES = {"study", "work", "personal", "other"}
ALLOWED_STATUSES = {"todo", "doing", "done"}


class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class UserRead(BaseModel):
    id: int
    name: str
    email: EmailStr


class AuthResponse(BaseModel):
    token: str
    user: UserRead


class MeResponse(BaseModel):
    user: UserRead


class TaskBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    title: str = Field(min_length=3, max_length=120)
    description: str = Field(default="", max_length=1000)
    category: str = "study"
    status: str = "todo"
    due_date: Optional[datetime] = Field(default=None, alias="dueDate")

    @field_validator("category")
    @classmethod
    def validate_category(cls, value: str) -> str:
        if value not in ALLOWED_CATEGORIES:
            raise ValueError("Category is invalid")
        return value

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        if value not in ALLOWED_STATUSES:
            raise ValueError("Status is invalid")
        return value


class TaskCreate(TaskBase):
    pass


class TaskUpdate(TaskBase):
    pass


class TaskRead(TaskBase):
    id: int
    user_id: int = Field(alias="userId")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
    deleted_at: Optional[datetime] = Field(default=None, alias="deletedAt")


class TaskStatsResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    total: int
    todo: int
    doing: int
    done: int
    unfinished: int
    overdue: int
    due_soon: int = Field(alias="dueSoon")
    deleted: int
    by_category: dict[str, int] = Field(alias="byCategory")


class AiSuggestRequest(BaseModel):
    title: str = Field(min_length=3, max_length=120)


class AiSuggestResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    description: str
    category: str
    due_date: datetime = Field(alias="dueDate")


class TaskListResponse(BaseModel):
    tasks: list[TaskRead]
    total: int
    page: int
    pageSize: int
    totalPages: int


class TaskResponse(BaseModel):
    task: TaskRead


class MessageResponse(BaseModel):
    message: str
