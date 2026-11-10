# packages/contracts

OpenAPI 3로 쓴 API 계약입니다. 프론트엔드·백엔드·AI 구현의 기준이 됩니다.

| 파일 | 대상 | 담당 팀 (변경 시 양쪽 팀에 공유) |
|---|---|---|
| `openapi.yaml` | frontend ↔ backend | `homepage-fe` + `homepage-be` |
| `ai-internal.yaml` | backend ↔ ai (내부 전용) | `homepage-be` + `homepage-ai` |
| `examples/` | 계약 작성 방식 예시 (실제 계약 아님) | — |

| 항목 | 내용 |
|---|---|
| 담당 팀 | `openapi.yaml`은 Homepage-FE · Homepage-BE, `ai-internal.yaml`은 Homepage-BE · Homepage-AI |
| PR 영역 라벨 | `area:contracts` |
| 스택 · 도구 | OpenAPI 3 |

## 지킬 것

- API를 바꾸는 작업은 계약부터 고칩니다. 계약만 담은 PR을 먼저 올려 합의해도 됩니다.
- 하위 호환이 깨지는 변경이면 PR 제목을 `type(contracts)!:` 형식으로 쓰고 `breaking` 라벨을 수동으로 붙입니다.
- 구현은 계약과 일치해야 합니다.
- 계약과 예시에 실제 개인정보, 키, 채점 루브릭 본문을 넣지 않습니다.
- `examples/`의 파일은 작성 방식을 보여 주는 예시이며 실제 계약이 아닙니다.

## 관련 문서

- [작업 규칙](../../RULEBOOKS/contributing.md)
- [머지 규칙](../../RULEBOOKS/merge-rules.md)
