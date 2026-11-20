from app.grading.client import ModelOutput, RawResult
from app.grading.dependencies import get_grading_client
from tests.conftest import make_body


def test_grading_ok(client):
    res = client.post("/grading", json=make_body())
    assert res.status_code == 200
    data = res.json()
    assert list(data)[0] == "success"
    assert data == {
        "success": True,
        "applicationId": "app-1",
        "results": [
            {"itemId": "item-1", "level": 3, "reason": "가짜 채점 결과입니다."},
            {"itemId": "item-2", "level": 3, "reason": "가짜 채점 결과입니다."},
        ],
        "instructionIgnored": False,
        "model": "fake",
        "promptVersion": "local-fake",
    }


def test_missing_question_id(client):
    body = make_body()
    body["items"][0]["questionIds"] = ["q-없음"]
    res = client.post("/grading", json=body)
    assert res.status_code == 422
    assert res.json()["code"] == "VALIDATION_FAILED"


def test_duplicate_item_id(client):
    body = make_body()
    body["items"][1]["itemId"] = "item-1"
    res = client.post("/grading", json=body)
    assert res.status_code == 422
    assert res.json()["code"] == "VALIDATION_FAILED"


def test_duplicate_question_id(client):
    body = make_body()
    body["answers"].append(dict(body["answers"][0]))
    assert client.post("/grading", json=body).status_code == 422


def test_too_many_items(client):
    res = client.post("/grading", json=make_body(21))
    assert res.status_code == 422
    assert res.json()["code"] == "VALIDATION_FAILED"


class _StubClient:
    def __init__(self, output: ModelOutput) -> None:
        self._output = output

    def grade(self, request) -> ModelOutput:
        return self._output


def _post_with(client, *results: RawResult):
    output = ModelOutput(
        results=list(results), instruction_ignored=False, model="stub", prompt_version="x"
    )
    client.app.dependency_overrides[get_grading_client] = lambda: _StubClient(output)
    return client.post("/grading", json=make_body())


def test_level_out_of_range(client):
    res = _post_with(
        client,
        RawResult(item_id="item-1", level=9, reason="x"),
        RawResult(item_id="item-2", level=3, reason="x"),
    )
    assert res.status_code == 502
    assert res.json()["code"] == "MODEL_OUTPUT_INVALID"


def test_missing_item_result(client):
    res = _post_with(client, RawResult(item_id="item-1", level=3, reason="x"))
    assert res.status_code == 502
    assert res.json()["code"] == "MODEL_OUTPUT_INVALID"
