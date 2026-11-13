from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app(), raise_server_exceptions=False)


def make_body(item_count: int = 2) -> dict[str, Any]:
    """형식만 맞춘 가짜 요청 본문."""
    return {
        "applicationId": "app-1",
        "items": [
            {
                "itemId": f"item-{n}",
                "name": f"예시 항목 {n}",
                "questionIds": ["q-1"],
                "guide": "예시 평가 가이드",
            }
            for n in range(1, item_count + 1)
        ],
        "answers": [{"questionId": "q-1", "question": "예시 질문", "text": "예시 답변"}],
    }
