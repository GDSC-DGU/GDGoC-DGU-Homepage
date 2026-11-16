import logging
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.common.log_file import LOG_FILE_NAME, attach_file_log, detach_file_log
from app.config import get_settings
from app.main import create_app

logger = logging.getLogger("uvicorn.error")


def _file_handlers() -> list[logging.Handler]:
    return [h for h in logger.handlers if isinstance(h, logging.FileHandler)]


@pytest.fixture(autouse=True)
def _clean_handlers():
    detach_file_log()
    original = logger.level
    yield
    detach_file_log()
    logger.setLevel(original)


def test_local_lifespan_writes_info_line(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    log_dir = tmp_path / "logs"
    monkeypatch.setenv("LOG_DIR", str(log_dir))
    get_settings.cache_clear()
    with TestClient(create_app()):
        logger.info("호출 기록 예시")
        for handler in _file_handlers():
            handler.flush()
        assert "INFO 호출 기록 예시" in (log_dir / LOG_FILE_NAME).read_text(encoding="utf-8")
    assert _file_handlers() == []


def test_non_local_does_not_create_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    log_dir = tmp_path / "logs"
    monkeypatch.setenv("APP_ENV", "dev")
    monkeypatch.setenv("GRADING_CLIENT", "gemini")
    monkeypatch.setenv("GEMINI_BACKEND", "vertex")
    monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "example-project")
    monkeypatch.setenv("GRADING_PROMPT_PATH", str(tmp_path / "prompt.yaml"))
    monkeypatch.setenv("LOG_DIR", str(log_dir))
    get_settings.cache_clear()
    assert get_settings().app_env == "dev"
    with TestClient(create_app()):
        assert _file_handlers() == []
    assert not log_dir.exists()


def test_attach_is_idempotent(tmp_path: Path):
    attach_file_log(tmp_path / "logs")
    attach_file_log(tmp_path / "logs")
    assert len(_file_handlers()) == 1


def test_detach_removes_handler(tmp_path: Path):
    attach_file_log(tmp_path / "logs")
    detach_file_log()
    assert _file_handlers() == []
    detach_file_log()
