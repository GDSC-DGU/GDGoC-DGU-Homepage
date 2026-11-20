from functools import lru_cache
from typing import Annotated

from fastapi import Depends
from google import genai
from google.genai import types

from app.config import Settings, get_settings
from app.grading.client import FakeGradingModelClient, GeminiGradingClient, GradingModelClient
from app.grading.prompt import load_prompt
from app.grading.service import GradingService

# 종료 시 닫을 수 있도록 만든 genai 클라이언트를 보관한다
_genai_clients: list[genai.Client] = []


def _build_genai_client(settings: Settings) -> genai.Client:
    # 재시도는 켜지 않는다 (Cloud Tasks가 요청 단위로 재시도). timeout 단위는 ms
    http_options = types.HttpOptions(timeout=int(settings.gemini_timeout_seconds * 1000))
    if settings.gemini_backend == "vertex":
        return genai.Client(
            enterprise=True,
            project=settings.google_cloud_project,
            location=settings.google_cloud_location,
            http_options=http_options,
        )
    key = settings.ai_studio_key
    return genai.Client(api_key=key.get_secret_value() if key else None, http_options=http_options)


@lru_cache
def get_grading_client() -> GradingModelClient:
    settings = get_settings()
    if settings.grading_client == "fake":
        return FakeGradingModelClient()
    assert settings.grading_prompt_path is not None  # Settings가 보장한다
    prompt = load_prompt(settings.grading_prompt_path)
    genai_client = _build_genai_client(settings)
    _genai_clients.append(genai_client)
    return GeminiGradingClient(
        genai_client, prompt, settings.gemini_model, settings.gemini_thinking_level
    )


def close_grading_client() -> None:
    """만들어 둔 genai 클라이언트를 닫고 캐시를 비운다."""
    while _genai_clients:
        _genai_clients.pop().close()
    get_grading_client.cache_clear()


def get_grading_service(
    client: Annotated[GradingModelClient, Depends(get_grading_client)],
) -> GradingService:
    return GradingService(client)
