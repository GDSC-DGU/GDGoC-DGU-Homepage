import json
import logging
from types import SimpleNamespace

import httpx2
import pytest
from google.genai import errors as genai_errors
from google.genai import types

from app.common.errors import ApiException, ErrorCode
from app.grading.client import GeminiGradingClient
from app.grading.dependencies import get_grading_client
from app.grading.prompt import GradingPrompt
from app.grading.schemas import GradingRequest
from tests.conftest import make_body

PROMPT = GradingPrompt(version="p-1", system="비밀지시문텍스트")


class FakeGenai:
    """genai.Client 대역. models.generate_content만 흉내 낸다."""

    def __init__(self, result) -> None:
        self.calls: list[dict] = []
        self._result = result
        self.models = SimpleNamespace(generate_content=self._generate)

    def _generate(self, **kwargs):
        self.calls.append(kwargs)
        if isinstance(self._result, Exception):
            raise self._result
        return self._result


def _response(
    text: str | None = None,
    finish=types.FinishReason.STOP,
    block=None,
    model_version="gemini-3.8-flash-001",
    candidates=True,
):
    if text is None:
        text = json.dumps(
            {
                "results": [
                    {"itemId": "item-1", "level": 4, "reason": "근거"},
                    {"itemId": "item-2", "level": 2, "reason": "근거"},
                ],
                "instructionIgnored": False,
            }
        )
    return SimpleNamespace(
        text=text,
        candidates=[SimpleNamespace(finish_reason=finish)] if candidates else None,
        prompt_feedback=SimpleNamespace(block_reason=block) if block else None,
        usage_metadata=SimpleNamespace(
            prompt_token_count=11, candidates_token_count=7, total_token_count=18
        ),
        model_version=model_version,
    )


def _grade(fake: FakeGenai):
    client = GeminiGradingClient(fake, PROMPT, "gemini-3.8-flash", "medium")
    return client.grade(GradingRequest.model_validate(make_body()))


def _code(fake: FakeGenai) -> ErrorCode:
    with pytest.raises(ApiException) as e:
        _grade(fake)
    return e.value.code


def test_success():
    out = _grade(FakeGenai(_response()))
    assert [(r.item_id, r.level) for r in out.results] == [("item-1", 4), ("item-2", 2)]
    assert out.instruction_ignored is False
    assert out.model == "gemini-3.8-flash-001"
    assert out.prompt_version == "p-1"


def test_model_falls_back_to_configured():
    assert _grade(FakeGenai(_response(model_version=None))).model == "gemini-3.8-flash"


def test_request_config():
    fake = FakeGenai(_response())
    _grade(fake)
    call = fake.calls[0]
    assert call["model"] == "gemini-3.8-flash"
    config = call["config"]
    assert config.system_instruction == PROMPT.system
    assert config.response_mime_type == "application/json"
    assert config.temperature is None and config.top_p is None and config.top_k is None
    assert config.thinking_config.thinking_level == types.ThinkingLevel.MEDIUM
    assert config.thinking_config.thinking_budget is None
    schema = config.response_json_schema
    results = schema["properties"]["results"]
    assert results["minItems"] == results["maxItems"] == 2
    props = results["items"]["properties"]
    assert props["itemId"]["enum"] == ["item-1", "item-2"]
    assert props["level"]["minimum"] == 1 and props["level"]["maximum"] == 5
    assert schema["additionalProperties"] is False
    assert schema["required"] == ["results", "instructionIgnored"]


def test_user_content_is_json_data():
    fake = FakeGenai(_response())
    _grade(fake)
    _, _, payload = fake.calls[0]["contents"].partition("\n")
    data = json.loads(payload)
    assert data["items"][0]["itemId"] == "item-1"
    assert data["answers"][0] == {"questionId": "q-1", "question": "예시 질문", "text": "예시 답변"}


def test_finish_reason_not_stop():
    fake = FakeGenai(_response(finish=types.FinishReason.MAX_TOKENS))
    assert _code(fake) == ErrorCode.MODEL_OUTPUT_INVALID


def test_blocked_prompt():
    fake = FakeGenai(_response(text="", block="SAFETY", candidates=False))
    assert _code(fake) == ErrorCode.MODEL_OUTPUT_INVALID


def test_empty_text():
    assert _code(FakeGenai(_response(text="  "))) == ErrorCode.MODEL_OUTPUT_INVALID


def test_invalid_json():
    assert _code(FakeGenai(_response(text="{깨진"))) == ErrorCode.MODEL_OUTPUT_INVALID
    assert _code(FakeGenai(_response(text='{"results": []}'))) == ErrorCode.MODEL_OUTPUT_INVALID


def test_server_error():
    err = genai_errors.ServerError(503, {"error": {"status": "UNAVAILABLE", "message": "x"}})
    assert _code(FakeGenai(err)) == ErrorCode.MODEL_UNAVAILABLE


def test_rate_limit():
    err = genai_errors.ClientError(429, {"error": {"status": "RESOURCE_EXHAUSTED"}})
    assert _code(FakeGenai(err)) == ErrorCode.MODEL_UNAVAILABLE


@pytest.mark.parametrize("status", [400, 401, 403])
def test_other_client_error(status):
    err = genai_errors.ClientError(status, {"error": {"status": "INVALID_ARGUMENT"}})
    assert _code(FakeGenai(err)) == ErrorCode.MODEL_REQUEST_REJECTED


@pytest.mark.parametrize("exc", [httpx2.ReadTimeout("t"), httpx2.ConnectError("c"), TimeoutError()])
def test_transport_errors(exc):
    assert _code(FakeGenai(exc)) == ErrorCode.MODEL_UNAVAILABLE


def test_error_response_shape(client):
    gemini = GeminiGradingClient(FakeGenai(genai_errors.ServerError(500, {})), PROMPT, "m", "low")
    client.app.dependency_overrides[get_grading_client] = lambda: gemini
    res = client.post("/grading", json=make_body())
    assert res.status_code == 503
    assert res.json() == {
        "success": False,
        "code": "MODEL_UNAVAILABLE",
        "message": "AI 모델을 일시적으로 사용할 수 없습니다.",
    }


def test_logs_do_not_contain_content(caplog):
    secret_message = "메시지에섞인답변"
    caplog.set_level(logging.DEBUG, logger="uvicorn.error")
    _grade(FakeGenai(_response()))
    err = genai_errors.ClientError(
        400, {"error": {"status": "INVALID_ARGUMENT", "message": secret_message}}
    )
    with pytest.raises(ApiException):
        _grade(FakeGenai(err))
    text = caplog.text
    assert "model=gemini-3.8-flash-001" in text and "total_tokens=18" in text
    assert "code=400 status=INVALID_ARGUMENT" in text
    for forbidden in ("예시 답변", "예시 평가 가이드", "예시 질문", "비밀지시문텍스트", "근거"):
        assert forbidden not in text
    assert secret_message not in text
