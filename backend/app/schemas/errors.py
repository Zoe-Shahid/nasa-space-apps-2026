from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ValidationFieldError(BaseModel):
    model_config = ConfigDict(extra="forbid")

    field: str
    code: str
    message: str


class ProblemDetails(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: str
    title: str
    status: int
    detail: str
    request_id: UUID
    errors: list[ValidationFieldError] = Field(default_factory=list)
