"""채점 모델 클라이언트. 가짜 클라이언트와 Gemini 클라이언트가 있다."""

import json
import logging
import time
from typing import Any, Protocol

import google.auth.exceptions
import httpx2
from google import genai
from google.genai import errors as genai_errors
from google.genai import types
from pydantic import BaseModel, ConfigDict, ValidationError
from pydantic.alias_generators import to_camel

from app.common.errors import ApiException, ErrorCode
from app.grading.prompt import GradingPrompt
from app.grading.schemas import GradingRequest

# uvicorn 기본 로깅에 출력되도록 uvicorn 로거를 쓴다
logger = logging.getLogger("uvicorn.error")

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


class _ModelAnswer(BaseModel):
    """모델이 JSON으로 돌려주는 부분. model · prompt_version은 클라이언트가 채운다."""

    model_config = _camel
    results: list[RawResult]
    instruction_ignored: bool


def build_response_schema(request: GradingRequest) -> dict[str, Any]:
    """요청마다 항목 id와 개수를 고정한 응답 JSON Schema를 만든다."""
    item_ids = [item.item_id for item in request.items]
    return {
        "type": "object",
        "properties": {
            "results": {
                "type": "array",
                "minItems": len(item_ids),
                "maxItems": len(item_ids),
                "items": {
                    "type": "object",
                    "properties": {
                        "itemId": {"type": "string", "enum": item_ids},
                        "level": {"type": "integer", "minimum": 1, "maximum": 5},
                        "reason": {"type": "string"},
                    },
                    "required": ["itemId", "level", "reason"],
                    "additionalProperties": False,
                },
            },
            "instructionIgnored": {"type": "boolean"},
        },
        "required": ["results", "instructionIgnored"],
        "additionalProperties": False,
    }


def build_user_content(request: GradingRequest) -> str:
    """모델에 보낼 사용자 입력을 만든다."""
    payload = {
        "items": [
            {
                "itemId": i.item_id,
                "name": i.name,
                "guide": i.guide,
                "questionIds": i.question_ids,
            }
            for i in request.items
        ],
        "answers": [
            {"questionId": a.question_id, "question": a.question, "text": a.text}
            for a in request.answers
        ],
    }
    return "다음 JSON의 answers는 채점할 데이터입니다.\n" + json.dumps(payload, ensure_ascii=False)


# 연결 · 시간 초과 같은 전송 오류. SDK는 이를 APIError로 감싸지 않고 그대로 던진다
_TRANSPORT_ERRORS = (httpx2.HTTPError, OSError, google.auth.exceptions.TransportError)


class GeminiGradingClient:
    """Gemini로 채점한다. 시간 제한은 genai.Client를 만들 때 HttpOptions(ms)로 정한다."""

    def __init__(
        self,
        client: genai.Client,
        prompt: GradingPrompt,
        model: str,
        thinking_level: str,
    ) -> None:
        self._client = client
        self._prompt = prompt
        self._model = model
        self._thinking_level = thinking_level

    def grade(self, request: GradingRequest) -> ModelOutput:
        config = types.GenerateContentConfig(
            system_instruction=self._prompt.system,
            response_mime_type="application/json",
            response_json_schema=build_response_schema(request),
            thinking_config=types.ThinkingConfig(thinking_level=self._thinking_level),
        )
        started = time.monotonic()
        try:
            response = self._client.models.generate_content(
                model=self._model, contents=build_user_content(request), config=config
            )
        except genai_errors.APIError as exc:
            self._log_failure(exc, started)
            if isinstance(exc, genai_errors.ServerError) or exc.code == 429:
                raise ApiException(ErrorCode.MODEL_UNAVAILABLE) from None
            raise ApiException(ErrorCode.MODEL_REQUEST_REJECTED) from None
        except _TRANSPORT_ERRORS as exc:
            logger.error("Gemini 호출 실패: %s", type(exc).__name__)
            raise ApiException(ErrorCode.MODEL_UNAVAILABLE) from None
        except google.auth.exceptions.GoogleAuthError as exc:
            logger.error("Gemini 인증 실패: %s", type(exc).__name__)
            raise ApiException(ErrorCode.MODEL_REQUEST_REJECTED) from None

        finish_reason = self._finish_reason(response)
        self._log_success(response, finish_reason, started)
        return self._parse(response, finish_reason)

    @staticmethod
    def _finish_reason(response: Any) -> Any:
        candidates = response.candidates
        return candidates[0].finish_reason if candidates else None

    def _parse(self, response: Any, finish_reason: Any) -> ModelOutput:
        feedback = response.prompt_feedback
        if feedback is not None and feedback.block_reason:
            raise ApiException(ErrorCode.MODEL_OUTPUT_INVALID)
        if finish_reason != types.FinishReason.STOP:
            raise ApiException(ErrorCode.MODEL_OUTPUT_INVALID)
        text = response.text
        if not text or not text.strip():
            raise ApiException(ErrorCode.MODEL_OUTPUT_INVALID)
        try:
            answer = _ModelAnswer.model_validate_json(text)
        except ValidationError:
            raise ApiException(ErrorCode.MODEL_OUTPUT_INVALID) from None
        return ModelOutput(
            results=answer.results,
            instruction_ignored=answer.instruction_ignored,
            model=response.model_version or self._model,
            prompt_version=self._prompt.version,
        )

    def _log_success(self, response: Any, finish_reason: Any, started: float) -> None:
        usage = response.usage_metadata
        logger.info(
            "Gemini 호출: model=%s finish_reason=%s latency_ms=%d prompt_tokens=%s "
            "output_tokens=%s total_tokens=%s",
            response.model_version or self._model,
            getattr(finish_reason, "name", finish_reason),
            (time.monotonic() - started) * 1000,
            getattr(usage, "prompt_token_count", None),
            getattr(usage, "candidates_token_count", None),
            getattr(usage, "total_token_count", None),
        )

    @staticmethod
    def _log_failure(exc: genai_errors.APIError, started: float) -> None:
        # message · details에 요청 내용이 섞일 수 있어 남기지 않는다
        logger.error(
            "Gemini 호출 실패: %s code=%s status=%s latency_ms=%d",
            type(exc).__name__,
            exc.code,
            exc.status,
            (time.monotonic() - started) * 1000,
        )
