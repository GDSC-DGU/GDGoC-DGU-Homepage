# ai

FastAPI(Python)로 만든 AI 서비스입니다. 지원서 채점을 맡으며 Cloud Run에 배포합니다. 외부에 공개되지 않고 backend만 호출합니다.

| 항목 | 내용 |
|---|---|
| 담당 팀 | Homepage-AI (`homepage-ai`) |
| PR 영역 라벨 | `area:ai` |
| CI | `.github/workflows/ci-ai.yml` (Homepage-AI가 작성 · 관리) |
| 스택 · 도구 | FastAPI, Python, uv |
| 로컬 주소 | http://localhost:8000 (Docker 컨테이너, backend만 호출) |

## 지킬 것

- 호출하는 쪽은 backend뿐입니다. 브라우저가 직접 호출하지 않습니다.
- 채점 루브릭과 프롬프트 본문은 레포에 올리지 않습니다. 운영 환경에서는 Secret Manager에서 읽고, 코드에는 구조만 둡니다.
- 로컬 테스트에는 형식만 같은 가짜 예시 루브릭 `scripts/seed/rubric/rubric.local.yaml`을 씁니다.
- AI API 키는 `.env`에만 두고 커밋하지 않습니다.
- 실제 지원자 정보를 코드, 로그, 테스트 데이터에 넣지 않습니다.

## 코드 작성 규칙

- router는 URL 연결, 요청 받기, 형식 검사(pydantic), service 호출, 응답·상태 코드 반환만 합니다.
- 업무 규칙 판단과 계산은 service에 둡니다. DB를 쓰는 경우 DB 접근은 repository에 두고 service에서만 부릅니다.
- 호출 방향은 router → service (→ repository) 하나뿐입니다. 층을 건너뛰지 않습니다.
- service는 FastAPI `Request` 같은 웹 프레임워크 객체를 받지 않습니다.
- 409, 400 같은 실패 응답은 router의 if문이 아니라, service가 던진 예외를 `exception_handler`가 상태 코드로 바꿉니다.
- 데이터 하나에 딸린 규칙은 그 모델의 메서드로 둘 수 있습니다.

```python
@router.post("/grading")
def grade(req: GradingRequest) -> GradingResult:
    return grading_service.grade(req)
```

코드 구조 확인 항목: [작업 규칙 › 4-5. backend · ai 코드 구조 확인](../RULEBOOKS/contributing.md#4-5-backend--ai-코드-구조-확인)

## 로컬 실행

`ai/` 폴더에서 실행합니다.

```bash
uv sync                                          # 의존성 설치
uv run uvicorn app.main:app --reload --port 8000 # 서버 실행
uv run pytest                                    # 테스트
uv run ruff check .                              # 린트
docker build -t gdgoc-ai ai                      # 이미지 빌드 (레포 루트에서)
```

- `APP_ENV`가 `local`일 때만 `/docs`가 열립니다. 기본값은 `local`입니다.
- 채점 모델은 가짜 클라이언트(`GRADING_CLIENT=fake`)만 연결되어 있습니다.

## 폴더 구조

```
ai/
├─ app/
│  ├─ main.py          앱 생성, router · 예외 처리기 등록
│  ├─ config.py        환경변수 설정
│  ├─ common/          공통 응답 · 에러 코드 · 예외 처리기
│  ├─ health/          GET /health
│  └─ grading/         POST /grading (router · service · schemas · client · dependencies)
├─ tests/
├─ Dockerfile
└─ pyproject.toml · uv.lock
```

## 관련 문서

- [작업 규칙](../RULEBOOKS/contributing.md)
- [머지 규칙](../RULEBOOKS/merge-rules.md)
- [실행 · 배포](../RULEBOOKS/local-and-deploy.md)
