import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    institution: str | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: EmailStr
    role: str
    institution: str | None
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ProjectCreate(BaseModel):
    title: str
    description: str | None = None
    workspace_json: dict[str, Any] = {}


class ProjectUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    workspace_json: dict[str, Any] | None = None
    generated_code: str | None = None
    is_published: bool | None = None


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_id: uuid.UUID
    title: str
    description: str | None
    workspace_json: dict[str, Any]
    generated_code: str | None
    is_published: bool
    created_at: datetime
    updated_at: datetime
