"""공통 응답 모델. backend와 같은 success 형태를 쓴다."""

from typing import Literal

from pydantic import BaseModel


class ApiSuccess(BaseModel):
    # 첫 필드여야 모든 성공 JSON이 "success": true로 시작한다
    success: Literal[True] = True


class ErrorResponse(BaseModel):
    success: Literal[False] = False
    code: str
    message: str
