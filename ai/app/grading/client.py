"""채점 모델 클라이언트. 가짜 클라이언트만 있고 실제 모델은 호출하지 않는다."""

from typing import Protocol

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from app.grading.schemas import GradingRequest

_camel = ConfigDict(alias_generator=to_camel, populate_by_name=True, protected_namespaces=())


class RawResult(BaseModel):
    model_config = _camel
    item_id: str
    level: int  # 범위 검사는 service가 한다
    reason: str


class ModelOutput(BaseModel):
    """모델 원본 답변. 잘못된 출력을 service가 잡아내도록 범위 제한을 두지 않는다."""

    model_config = _camel
    results: list[RawResult]
    instruction_ignored: bool
    model: str
    prompt_version: str


class GradingModelClient(Protocol):
    def grade(self, request: GradingRequest) -> ModelOutput: ...


class FakeGradingModelClient:
    """네트워크 없이 항상 같은 결과를 돌려준다."""

    def grade(self, request: GradingRequest) -> ModelOutput:
        return ModelOutput(
            results=[
                RawResult(item_id=item.item_id, level=3, reason="가짜 채점 결과입니다.")
                for item in request.items
            ],
            instruction_ignored=False,
            model="fake",
            prompt_version="local-fake",
        )
