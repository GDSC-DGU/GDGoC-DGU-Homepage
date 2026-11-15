"""환경 설정. 환경변수와 루트 .env에서 읽는다."""

from functools import lru_cache
from pathlib import Path
from typing import Literal, Self

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ai/에서 실행해도 레포 루트의 .env를 읽는다. 빈 값은 설정하지 않은 것으로 본다
    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),
        extra="ignore",
        env_ignore_empty=True,
        hide_input_in_errors=True,
    )

    app_env: Literal["local", "dev", "prod"] = "local"
    grading_client: Literal["fake", "gemini"] = "fake"
    gemini_backend: Literal["ai_studio", "vertex"] = "ai_studio"
    ai_studio_key: SecretStr | None = None
    google_cloud_project: str | None = None
    google_cloud_location: str = "global"
    gemini_model: str = "gemini-3.8-flash"
    gemini_thinking_level: Literal["low", "medium", "high"] = "medium"
    gemini_timeout_seconds: float = Field(default=90, gt=0, le=600)
    grading_prompt_path: Path | None = None

    @model_validator(mode="after")
    def _check_combination(self) -> Self:
        # 오류 문구에는 값을 넣지 않는다 (키 노출 방지)
        if self.app_env != "local":
            if self.grading_client != "gemini":
                raise ValueError("local이 아닌 환경에서는 GRADING_CLIENT=gemini여야 합니다.")
            if self.gemini_backend != "vertex":
                raise ValueError("local이 아닌 환경에서는 GEMINI_BACKEND=vertex여야 합니다.")
        if self.grading_client == "gemini":
            if self.grading_prompt_path is None:
                raise ValueError("GRADING_CLIENT=gemini에는 GRADING_PROMPT_PATH가 필요합니다.")
            if self.gemini_backend == "ai_studio" and self.ai_studio_key is None:
                raise ValueError("GEMINI_BACKEND=ai_studio에는 AI_STUDIO_KEY가 필요합니다.")
            if self.gemini_backend == "vertex" and not self.google_cloud_project:
                raise ValueError("GEMINI_BACKEND=vertex에는 GOOGLE_CLOUD_PROJECT가 필요합니다.")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
