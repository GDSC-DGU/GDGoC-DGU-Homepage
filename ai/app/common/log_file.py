"""로컬 실행 시 uvicorn.error 로그를 일별 파일에도 남긴다."""

import logging
from logging.handlers import TimedRotatingFileHandler
from pathlib import Path

LOG_FILE_NAME = "ai-local.log"
_LOGGER_NAME = "uvicorn.error"
_BACKUP_COUNT = 14


def _find_handler(logger: logging.Logger) -> TimedRotatingFileHandler | None:
    for handler in logger.handlers:
        if isinstance(handler, TimedRotatingFileHandler) and getattr(handler, "_ai_local", False):
            return handler
    return None


def attach_file_log(log_dir: Path) -> None:
    """파일 핸들러를 붙인다. 이미 붙어 있으면 아무것도 하지 않는다."""
    logger = logging.getLogger(_LOGGER_NAME)
    if _find_handler(logger) is not None:
        return
    log_dir.mkdir(parents=True, exist_ok=True)
    handler = TimedRotatingFileHandler(
        log_dir / LOG_FILE_NAME,
        when="midnight",
        backupCount=_BACKUP_COUNT,
        encoding="utf-8",
    )
    handler._ai_local = True  # type: ignore[attr-defined]
    handler.setLevel(logging.INFO)
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    logger.addHandler(handler)
    # 레벨이 정해져 있지 않을 때만 INFO가 버려지지 않게 맞춘다
    if logger.level == logging.NOTSET and logger.getEffectiveLevel() > logging.INFO:
        logger.setLevel(logging.INFO)


def detach_file_log() -> None:
    """붙어 있는 파일 핸들러를 떼고 닫는다."""
    logger = logging.getLogger(_LOGGER_NAME)
    handler = _find_handler(logger)
    if handler is not None:
        logger.removeHandler(handler)
        handler.close()
