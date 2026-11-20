"""예외를 {"success": false, "code", "message"} 응답으로 바꾼다."""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.common.errors import ApiException, ErrorCode
from app.common.responses import ErrorResponse

# uvicorn 기본 로깅에 출력되도록 uvicorn 로거를 쓴다
logger = logging.getLogger("uvicorn.error")


def _code_for_status(status: int) -> ErrorCode:
    if status == 404:
        return ErrorCode.NOT_FOUND
    if status == 405:
        return ErrorCode.METHOD_NOT_ALLOWED
    # 본문 디코딩 실패 같은 나머지 4xx는 재시도해도 소용없으므로 422로 통일한다
    if 400 <= status < 500:
        return ErrorCode.VALIDATION_FAILED
    return ErrorCode.INTERNAL_ERROR


def _error(code: ErrorCode, message: str | None = None) -> JSONResponse:
    body = ErrorResponse(code=code.name, message=message or code.message)
    return JSONResponse(status_code=code.status, content=body.model_dump())


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiException)
    async def api_exception(_: Request, exc: ApiException) -> JSONResponse:
        return _error(exc.code, exc.message)

    @app.exception_handler(RequestValidationError)
    async def validation_error(_: Request, __: RequestValidationError) -> JSONResponse:
        # 기본 응답은 입력값(지원자 답변)을 되돌려 보내므로 쓰지 않는다
        return _error(ErrorCode.VALIDATION_FAILED)

    @app.exception_handler(StarletteHTTPException)
    async def http_exception(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        return _error(_code_for_status(exc.status_code))

    @app.exception_handler(Exception)
    async def unhandled(_: Request, exc: Exception) -> JSONResponse:
        # 요청 본문은 남기지 않고 예외 정보만 남긴다
        logger.error("처리되지 않은 예외: %s", type(exc).__name__, exc_info=exc)
        return _error(ErrorCode.INTERNAL_ERROR)
