from pathlib import Path

import pytest

from app.grading.prompt import load_prompt

PROMPT_PATH = Path(__file__).resolve().parents[2] / "scripts/seed/prompts/grading.local.yaml"


def test_load_committed_prompt():
    prompt = load_prompt(PROMPT_PATH)
    assert prompt.version == "local-example-1"
    assert prompt.system.strip()


def test_load_missing_file_names_path_only(tmp_path):
    missing = tmp_path / "missing.yaml"
    with pytest.raises(ValueError) as e:
        load_prompt(missing)
    assert str(missing) in str(e.value)


def test_load_invalid_file_does_not_leak_content(tmp_path):
    path = tmp_path / "bad.yaml"
    path.write_text("version: 비밀내용\nsystem: ''\n", encoding="utf-8")
    with pytest.raises(ValueError) as e:
        load_prompt(path)
    assert "비밀내용" not in str(e.value)
    assert str(path) in str(e.value)
    path.write_text("a: [비밀내용", encoding="utf-8")
    with pytest.raises(ValueError) as e:
        load_prompt(path)
    assert "비밀내용" not in str(e.value)
    assert e.value.__cause__ is None
