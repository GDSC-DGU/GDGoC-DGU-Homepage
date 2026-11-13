import json

from fastapi.testclient import TestClient

from app.main import create_app
from tests.conftest import make_body


def test_unknown_path(client):
    res = client.get("/nope")
    assert res.status_code == 404
    assert res.json() == {
        "success": False,
        "code": "NOT_FOUND",
        "message": "요청한 대상을 찾을 수 없습니다.",
    }


def test_method_not_allowed(client):
    res = client.post("/health")
    assert res.status_code == 405
    assert res.json() == {
        "success": False,
        "code": "METHOD_NOT_ALLOWED",
        "message": "지원하지 않는 요청 방식입니다.",
    }


def test_validation_does_not_echo_input(client):
    body = make_body()
    body["answers"][0]["text"] = "예시 답변 유출확인"
    del body["applicationId"]
    res = client.post("/grading", json=body)
    assert res.status_code == 422
    assert res.json() == {
        "success": False,
        "code": "VALIDATION_FAILED",
        "message": "요청 형식이 올바르지 않습니다.",
    }
    assert "유출확인" not in res.text
    assert "input" not in res.json() and "detail" not in res.json()


def test_unhandled_exception():
    app = create_app()

    @app.get("/boom")
    def boom() -> None:
        raise RuntimeError("secret detail")

    res = TestClient(app, raise_server_exceptions=False).get("/boom")
    assert res.status_code == 500
    assert res.json() == {
        "success": False,
        "code": "INTERNAL_ERROR",
        "message": "서버 오류가 발생했습니다.",
    }
    assert "secret" not in res.text


def test_non_utf8_body_is_422(client):
    content = json.dumps(make_body(), ensure_ascii=False).encode("cp949")
    res = client.post("/grading", content=content, headers={"content-type": "application/json"})
    assert res.status_code == 422
    assert res.json() == {
        "success": False,
        "code": "VALIDATION_FAILED",
        "message": "요청 형식이 올바르지 않습니다.",
    }
