from typing import Annotated

from fastapi import APIRouter, Depends

from app.grading.dependencies import get_grading_service
from app.grading.schemas import GradingRequest, GradingResult
from app.grading.service import GradingService

router = APIRouter()


@router.post("/grading", response_model=GradingResult, response_model_by_alias=True)
def grade(
    req: GradingRequest, service: Annotated[GradingService, Depends(get_grading_service)]
) -> GradingResult:
    return service.grade(req)
