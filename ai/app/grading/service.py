"""채점 업무 규칙. 점수 계산은 하지 않고 level만 검증해 넘긴다."""

from app.common.errors import ApiException, ErrorCode
from app.grading.client import GradingModelClient, ModelOutput
from app.grading.schemas import GradingRequest, GradingResult, ItemResult


class GradingService:
    def __init__(self, client: GradingModelClient) -> None:
        self._client = client

    def grade(self, req: GradingRequest) -> GradingResult:
        self._check_request(req)
        output = self._client.grade(req)
        return self._build_result(req, output)

    @staticmethod
    def _check_request(req: GradingRequest) -> None:
        question_ids = [a.question_id for a in req.answers]
        item_ids = [i.item_id for i in req.items]
        if len(set(question_ids)) != len(question_ids) or len(set(item_ids)) != len(item_ids):
            raise ApiException(ErrorCode.VALIDATION_FAILED)
        known = set(question_ids)
        if any(qid not in known for item in req.items for qid in item.question_ids):
            raise ApiException(ErrorCode.VALIDATION_FAILED)

    @staticmethod
    def _build_result(req: GradingRequest, output: ModelOutput) -> GradingResult:
        by_item = {r.item_id: r for r in output.results}
        # 결과 수와 id 집합이 모두 일치해야 누락·초과·중복이 없다
        if len(output.results) != len(req.items) or set(by_item) != {i.item_id for i in req.items}:
            raise ApiException(ErrorCode.MODEL_OUTPUT_INVALID)
        results: list[ItemResult] = []
        for item in req.items:
            raw = by_item[item.item_id]
            if not 1 <= raw.level <= 5 or not raw.reason.strip():
                raise ApiException(ErrorCode.MODEL_OUTPUT_INVALID)
            results.append(ItemResult(item_id=raw.item_id, level=raw.level, reason=raw.reason))
        return GradingResult(
            application_id=req.application_id,
            results=results,
            instruction_ignored=output.instruction_ignored,
            model=output.model,
            prompt_version=output.prompt_version,
        )
