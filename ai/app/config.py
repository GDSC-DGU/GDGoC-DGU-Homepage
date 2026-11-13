"""환경 설정. 환경변수에서 읽는다."""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_env: Literal["local", "dev", "prod"] = "local"
    grading_client: Literal["fake"] = "fake"


@lru_cache
def get_settings() -> Settings:
    return Settings()
