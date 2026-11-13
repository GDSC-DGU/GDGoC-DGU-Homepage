from typing import Literal

from fastapi import APIRouter

from app.common.responses import ApiSuccess

router = APIRouter()


class HealthResponse(ApiSuccess):
    status: Literal["UP"] = "UP"


@router.get("/health")
def health() -> HealthResponse:
    return HealthResponse()
