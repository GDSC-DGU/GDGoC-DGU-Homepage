from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.common.handlers import register_exception_handlers
from app.common.log_file import attach_file_log, detach_file_log
from app.config import get_settings
from app.grading.dependencies import close_grading_client
from app.grading.router import router as grading_router
from app.health.router import router as health_router


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    # 파일 로그는 로컬에서만 남긴다 (dev/prod는 stdout을 Cloud Run이 수집)
    if settings.app_env == "local":
        attach_file_log(settings.log_dir)
    try:
        yield
    finally:
        detach_file_log()
        close_grading_client()


def create_app() -> FastAPI:
    # API 문서는 로컬에서만 연다
    local = get_settings().app_env == "local"
    app = FastAPI(
        title="GDGoC DGU AI",
        lifespan=lifespan,
        docs_url="/docs" if local else None,
        redoc_url="/redoc" if local else None,
        openapi_url="/openapi.json" if local else None,
    )
    app.include_router(health_router)
    app.include_router(grading_router)
    register_exception_handlers(app)
    return app


app = create_app()
