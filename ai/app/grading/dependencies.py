from typing import Annotated

from fastapi import Depends

from app.config import get_settings
from app.grading.client import FakeGradingModelClient, GradingModelClient
from app.grading.service import GradingService


def get_grading_client() -> GradingModelClient:
    if get_settings().grading_client == "fake":
        return FakeGradingModelClient()
    raise ValueError("지원하지 않는 채점 클라이언트입니다.")


def get_grading_service(
    client: Annotated[GradingModelClient, Depends(get_grading_client)],
) -> GradingService:
    return GradingService(client)
