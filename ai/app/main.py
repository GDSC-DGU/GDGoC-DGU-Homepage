from fastapi import FastAPI

from app.common.handlers import register_exception_handlers
from app.config import get_settings
from app.grading.router import router as grading_router
from app.health.router import router as health_router


def create_app() -> FastAPI:
    # API 문서는 로컬에서만 연다
    local = get_settings().app_env == "local"
    app = FastAPI(
        title="GDGoC DGU AI",
        docs_url="/docs" if local else None,
        redoc_url="/redoc" if local else None,
        openapi_url="/openapi.json" if local else None,
    )
    app.include_router(health_router)
    app.include_router(grading_router)
    register_exception_handlers(app)
    return app


app = create_app()
