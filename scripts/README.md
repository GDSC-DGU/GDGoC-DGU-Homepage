# scripts

가짜 시드 데이터, 초기 세팅 스크립트, `deploy.sh`를 담습니다.

| 항목 | 내용 |
|---|---|
| 담당 팀 | Homepage-Lead/PM (`homepage-lead-pm`) · Homepage-BE (`homepage-be`) 공동 |
| PR 영역 라벨 | 없음 (`.github/labeler.yml`에 `scripts/` 경로 규칙이 없음) |
| 실행 환경 | Git Bash 또는 WSL (Windows) |

## `deploy.sh`

| 현재 브랜치 | 동작 |
|---|---|
| `develop` | `deploy-staging.yml`을 실행해 dev.gdgoc-dgu.com에 배포 |
| `main` | 실행 거부 |
| 그 외 (`feature/` 등) | 로컬 전체 실행 (docker compose + frontend 개발 서버) |
| detached HEAD | 거부 |

옵션은 `--only frontend,backend,ai`, `--dry-run`, `-y` / `--yes`, `--down`입니다.

## 지킬 것

- 시드 데이터는 가짜 데이터만 씁니다. 실제 지원자·회원 정보(이름, 학번, 이메일)를 넣지 않습니다.
- 채점 루브릭은 형식만 같은 가짜 예시를 씁니다. 실제 루브릭은 커밋하지 않습니다.
- `.env`, 키, 토큰을 커밋하지 않습니다.

## 관련 문서

- [실행 · 배포](../RULEBOOKS/local-and-deploy.md)
- [작업 규칙](../RULEBOOKS/contributing.md)
- [머지 규칙](../RULEBOOKS/merge-rules.md)
