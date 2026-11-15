"""채점 지시문 파일 읽기. 운영에서는 Secret Manager 값을 파일로 마운트해 같은 경로로 읽는다."""

from pathlib import Path

import yaml
from pydantic import BaseModel, Field, ValidationError


class GradingPrompt(BaseModel):
    version: str = Field(min_length=1, max_length=50)
    system: str = Field(min_length=1, max_length=20000)


def load_prompt(path: Path) -> GradingPrompt:
    """지시문 파일을 읽는다. 오류 메시지에는 경로만 넣고 파일 내용은 넣지 않는다."""
    try:
        data = yaml.safe_load(Path(path).read_text(encoding="utf-8"))
    except OSError, UnicodeDecodeError, yaml.YAMLError:
        raise ValueError(f"채점 지시문 파일을 읽을 수 없습니다: {path}") from None
    try:
        return GradingPrompt.model_validate(data)
    except ValidationError:
        raise ValueError(f"채점 지시문 파일 형식이 올바르지 않습니다: {path}") from None
