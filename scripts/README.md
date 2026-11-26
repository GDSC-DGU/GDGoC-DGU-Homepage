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
| `develop` | `origin/develop` 기준으로 `deploy-staging.yml`을 실행해 dev에 배포하고, 진행 상황을 터미널에 표시 |
| `main` | 실행 거부 |
| 그 외 (`feature/` 등) | 로컬 전체 실행은 아직 구현되지 않아 안내 후 종료 |
| detached HEAD | 거부 |

옵션은 `--only backend,ai,frontend`(기본 `backend,ai`), `--dry-run`, `-y` / `--yes`, `--down`(로컬 실행용, 아직 미구현), `-h` / `--help`입니다. `frontend`는 아직 workflow가 배포하지 않아 건너뜁니다.

실행하려면 `gh`가 설치되고 로그인돼 있어야 합니다. bash 3.2(macOS)와 Git Bash에서 동작합니다.

## `seed/rct-dev.mjs` — RCT 테스트 모집 데이터

운영진용 모집 · 폼 · 평가 기준 API(RCT-006 ~ 013)가 생기기 전까지, 지원 흐름(RCT-001 · 002 · 003 · 005)을 확인할 가짜 회차를 넣고 지웁니다. Node 18 이상만 있으면 되고 설치할 패키지는 없습니다.

| 명령 | 동작 |
|---|---|
| `seed` | `recruitments/rct_900`(진행 중, 오늘 기준 어제 ~ 14일 뒤)과 지원폼 · 평가 기준 버전 1을 만듭니다. 이미 있으면 멈추고, `--force`면 덮어씁니다 |
| `clean` | 그 회차, 지원폼 · 평가 기준 · 중복 방지 키, 그 회차로 제출된 지원서를 모두 지웁니다 |

옵션은 `--project <id>`, `--cohort <n>`(기본 900, 회차 ID `rct_<n>`), `--force`, `-h` / `--help`입니다.

**로컬 에뮬레이터**

```bash
FIRESTORE_EMULATOR_HOST=localhost:8180 node scripts/seed/rct-dev.mjs seed
```

**dev (`dev-gdgoc-dgu-homepage`)**

```bash
gcloud auth login
node scripts/seed/rct-dev.mjs seed --project dev-gdgoc-dgu-homepage
# 테스트가 끝나면
node scripts/seed/rct-dev.mjs clean --project dev-gdgoc-dgu-homepage
```

- 토큰은 `gcloud auth print-access-token`으로 얻습니다. gcloud가 없으면 GCP 콘솔의 Cloud Shell에서 실행하거나, `GOOGLE_OAUTH_ACCESS_TOKEN`에 토큰을 넣습니다. 계정에 dev Firestore 쓰기 권한이 있어야 합니다.
- 운영 프로젝트(`gdgoc-dgu-homepage`)와 그 밖의 프로젝트에는 쓰지 않고 멈춥니다.
- 테스트 회차는 지원 시작일이 가장 늦어 dev의 "현재 모집"(RCT-001)으로 보입니다. dev는 팀이 함께 쓰므로 테스트가 끝나면 `clean`을 실행합니다.
- dev에서 지원서를 제출하면 Cloud Tasks를 거쳐 AI 채점까지 실제로 실행됩니다. 중복 확인 · 제출에는 dev Cloud Run에 `RECRUIT_KEY_HMAC_SECRET`이 설정돼 있어야 합니다(없으면 500).

## 지킬 것

- 시드 데이터는 가짜 데이터만 씁니다. 실제 지원자·회원 정보(이름, 학번, 이메일)를 넣지 않습니다.
- 채점 루브릭은 형식만 같은 가짜 예시를 씁니다. 실제 루브릭은 커밋하지 않습니다.
- `.env`, 키, 토큰을 커밋하지 않습니다.

## 관련 문서

- [실행 · 배포](../RULEBOOKS/local-and-deploy.md)
- [작업 규칙](../RULEBOOKS/contributing.md)
- [머지 규칙](../RULEBOOKS/merge-rules.md)
