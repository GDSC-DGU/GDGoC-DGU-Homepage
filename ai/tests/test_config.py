from pathlib import Path

import pytest
from pydantic import ValidationError

from app.config import Settings

KEY = "fake-key-do-not-leak"
PROMPT_PATH = Path(__file__).resolve().parents[2] / "scripts/seed/prompts/grading.local.yaml"


def _settings(**kwargs):
    return Settings(_env_file=None, **kwargs)


def test_defaults():
    s = _settings()
    assert s.grading_client == "fake"
    assert s.gemini_model == "gemini-3.8-flash"
    assert s.gemini_timeout_seconds == 90


def test_gemini_ai_studio_local_ok():
    s = _settings(grading_client="gemini", ai_studio_key=KEY, grading_prompt_path=PROMPT_PATH)
    assert s.ai_studio_key.get_secret_value() == KEY


def test_gemini_vertex_prod_ok():
    s = _settings(
        app_env="prod",
        grading_client="gemini",
        gemini_backend="vertex",
        google_cloud_project="p",
        grading_prompt_path=PROMPT_PATH,
    )
    assert s.google_cloud_location == "global"


def test_prod_rejects_ai_studio():
    with pytest.raises(ValidationError) as e:
        _settings(
            app_env="prod",
            grading_client="gemini",
            ai_studio_key=KEY,
            grading_prompt_path=PROMPT_PATH,
        )
    assert KEY not in str(e.value)


def test_prod_rejects_fake():
    with pytest.raises(ValidationError):
        _settings(app_env="prod")


def test_gemini_requires_key():
    with pytest.raises(ValidationError):
        _settings(grading_client="gemini", grading_prompt_path=PROMPT_PATH)


def test_gemini_requires_prompt_path():
    with pytest.raises(ValidationError) as e:
        _settings(grading_client="gemini", ai_studio_key=KEY)
    assert KEY not in str(e.value)


def test_vertex_requires_project():
    with pytest.raises(ValidationError):
        _settings(grading_client="gemini", gemini_backend="vertex", grading_prompt_path=PROMPT_PATH)


def test_timeout_bounds():
    with pytest.raises(ValidationError):
        _settings(gemini_timeout_seconds=0)
    with pytest.raises(ValidationError):
        _settings(gemini_timeout_seconds=601)


def test_empty_env_value_is_unset(monkeypatch):
    monkeypatch.setenv("AI_STUDIO_KEY", "")
    with pytest.raises(ValidationError):
        _settings(grading_client="gemini", grading_prompt_path=PROMPT_PATH)
