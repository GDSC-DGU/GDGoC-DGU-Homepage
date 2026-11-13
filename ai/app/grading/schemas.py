"""채점 요청·응답 모델. 필드 이름과 길이 제한은 backend와 맞출 초안을 따른다."""

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from app.common.responses import ApiSuccess

_camel = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class Answer(BaseModel):
    model_config = _camel
    question_id: str = Field(min_length=1, max_length=100)
    question: str = Field(min_length=1, max_length=1000)
    text: str = Field(min_length=0, max_length=5000)


class GradingItem(BaseModel):
    model_config = _camel
    item_id: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=100)
    question_ids: list[str] = Field(min_length=1, max_length=10)
    guide: str = Field(min_length=1, max_length=2000)


class GradingRequest(BaseModel):
    model_config = _camel
    application_id: str = Field(min_length=1, max_length=100)
    items: list[GradingItem] = Field(min_length=1, max_length=20)
    answers: list[Answer] = Field(min_length=1, max_length=10)


class ItemResult(BaseModel):
    model_config = _camel
    item_id: str
    level: int = Field(ge=1, le=5)
    reason: str = Field(min_length=1)


class GradingResult(ApiSuccess):
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, protected_namespaces=()
    )
    application_id: str
    results: list[ItemResult]
    instruction_ignored: bool
    model: str
    prompt_version: str
