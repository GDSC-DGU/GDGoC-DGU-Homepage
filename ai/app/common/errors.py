"""에러 코드와 service가 던지는 예외."""

from enum import Enum


class ErrorCode(Enum):
    VALIDATION_FAILED = (422, "요청 형식이 올바르지 않습니다.")
    NOT_FOUND = (404, "요청한 대상을 찾을 수 없습니다.")
    METHOD_NOT_ALLOWED = (405, "지원하지 않는 요청 방식입니다.")
    MODEL_OUTPUT_INVALID = (502, "채점 결과 형식이 올바르지 않습니다.")
    INTERNAL_ERROR = (500, "서버 오류가 발생했습니다.")

    @property
    def status(self) -> int:
        return self.value[0]

    @property
    def message(self) -> str:
        return self.value[1]


class ApiException(Exception):
    def __init__(self, code: ErrorCode, message: str | None = None) -> None:
        super().__init__(code.name)
        self.code = code
        self.message = message or code.message
