# 실행 · 배포

로컬 실행, staging(dev) 배포, production 배포 규칙입니다.

## 1. 실행 환경 세 가지

| | local (내 PC) | dev (staging) | prod (production) |
|---|---|---|---|
| 주소 | `localhost:5173` | `dev.gdgoc-dgu.com` | `gdgoc-dgu.com` |
| 띄우는 방법 | 작업 브랜치에서 `./scripts/deploy.sh` | develop에서 `./scripts/deploy.sh` | main 머지 + Lead 승인 |
| 누가 | 누구나 | 레포 Write 이상 누구나 | Lead 승인 필수 |
| frontend | Vite 개발 서버 | Vercel (dev 도메인 alias) | Vercel (production) |
| backend · ai | Docker 컨테이너 | Cloud Run `backend` · `ai` (GCP `gdgoc-dgu-dev`) | Cloud Run `backend` · `ai` (GCP `gdgoc-dgu-prod`) |
| DB · 로그인 · 파일 | Firebase 에뮬레이터 (가짜 데이터) | dev 프로젝트의 Firestore · Auth · Storage | prod 프로젝트의 Firestore · Auth · Storage |
| 메일 | Mailpit (발송 안 됨, 화면으로 확인) | 실제 발송 (팀원 주소로만 테스트) | 실제 발송 |
| AI | 실제 AI API (개인 `.env` 키) | 실제 AI API (dev 키, Secret Manager) | 실제 AI API (prod 키, Secret Manager) |
| 채점 루브릭 | 가짜 예시 파일 | dev Secret Manager | prod Secret Manager |
| 클라우드 권한 | 필요 없음 | Actions만 가짐 (WIF) | Actions만 가짐 (WIF) |

- Cloud Run은 dev · prod 프로젝트마다 `backend` · `ai` 2개씩, 총 4개입니다. 요청이 없으면 인스턴스가 0개로 줄어듭니다.
- 프론트는 Vercel 프로젝트 하나를 도메인으로 나눠 씁니다.
- PR마다 Vercel 미리보기가 자동으로 만들어집니다. UI 확인용이며, 승인 도메인이 아니라서 로그인은 할 수 없습니다.
- AI API 키는 레포 밖 팀 내부 경로로 공유하고, 각자 `.env`에 보관합니다.

## 2. 로컬 전체 실행

### 2-1. 구성과 포트

| 서비스 | 무엇 | 주소 |
|---|---|---|
| frontend | Vite 개발 서버. `/api/*`를 backend로 프록시 | http://localhost:5173 |
| backend | Spring Boot 컨테이너 | http://localhost:8080 |
| ai | FastAPI 컨테이너 | http://localhost:8000 (backend만 호출) |
| firebase | Firestore · Auth · Storage 에뮬레이터 | Firestore 8180 · Auth 9099 · Storage 9199 · UI http://localhost:4000 |
| mailpit | 보낸 메일을 가로채 보여줌 | SMTP 1025 · UI http://localhost:8025 |
| seed | 가짜 데이터 · 권한별 테스트 계정 주입 (1회 실행 후 종료) | — |

- Firestore 에뮬레이터는 8080이 아니라 **8180** 포트를 씁니다.
- Firebase 프로젝트 ID는 `demo-gdgoc`입니다. `demo-`로 시작하는 ID는 에뮬레이터 전용입니다.
- 전부 띄우면 메모리가 **6GB 이상** 필요합니다. Docker Desktop의 메모리 할당을 확인합니다.

### 2-2. 기능별 로컬 동작

| 기능 | 로컬에서 | 운영과 다른 점 |
|---|---|---|
| 구글 로그인 | Auth 에뮬레이터의 가짜 계정 선택 창 | 시드의 Lead · Core · General 계정으로 권한을 바꿔 테스트 |
| 세션 쿠키 | backend가 Admin SDK로 에뮬레이터 토큰 검증 후 발급 | 로컬 프로필은 `Secure=false` (http에서 동작) |
| DB | Firestore 에뮬레이터 | 컨테이너를 내리면 사라짐. 유지하려면 `.emulator-data/`로 export |
| PDF 첨부 | Storage 에뮬레이터 | 서명 URL 대신 backend 경유 업로드 (로컬 프로필) |
| 메일 발송 | Mailpit | 실제로 나가지 않음 |
| AI 채점 · 챗봇 | 실제 AI API | 개인 키 사용. 루브릭은 가짜 예시 |
| 비동기 채점 (Cloud Tasks) | 즉시 실행으로 대체 | 대기열 없음 |
| `/api` 같은 출처 | Vite 프록시 | Vercel rewrite와 같은 역할 |

### 2-3. 환경변수와 루브릭

- `.env.example`을 `.env`로 복사해 값을 채웁니다(`cp .env.example .env`). 값은 팀 내부 경로로 공유받습니다. `.env`는 커밋하지 않습니다.
- 채점 루브릭은 형식만 같은 가짜 예시 `scripts/seed/rubric/rubric.local.yaml`을 씁니다. 실제 루브릭으로 테스트하려면 `rubric.local.private.yaml`로 따로 두며, 이 파일은 커밋되지 않습니다.

## 3. `scripts/deploy.sh`

Windows에서는 Git Bash 또는 WSL에서 실행합니다.

### 3-1. 동작

| 현재 브랜치 | 동작 |
|---|---|
| `develop` | GitHub Actions의 `deploy-staging.yml`을 실행하고 진행 상황을 터미널에 표시 → `dev.gdgoc-dgu.com` |
| `main` | **실행 거부**. production은 릴리스 PR 머지 → Lead 승인으로만 배포 |
| 그 외 (`feature/` 등) | 로컬 전체 실행 (docker compose + frontend 개발 서버) |
| detached HEAD | 거부 (브랜치를 체크아웃하라고 안내) |

| 옵션 | 뜻 |
|---|---|
| `--only frontend,backend,ai` | 일부만 배포 · 실행 (기본: 전부) |
| `--dry-run` | 실제로 실행하지 않고 할 일만 출력 |
| `-y`, `--yes` | 확인 질문 생략 |
| `--down` | (로컬) 띄운 컨테이너 종료 |

develop에 머지돼도 staging에 자동으로 배포되지 않습니다. staging 배포는 이 스크립트로만 합니다.

### 3-2. develop에서 배포 전 확인

1. `gh`가 설치 · 로그인돼 있는가 (`gh auth status`)
2. `git fetch` 후 로컬 develop과 `origin/develop` 비교
   - 로컬이 앞섬(push 안 한 커밋): "배포되는 것은 origin/develop입니다" 경고 후 확인
   - 로컬이 뒤처짐: `git pull` 안내
3. 커밋하지 않은 변경이 있으면 "배포에 포함되지 않습니다" 경고
4. 배포할 커밋(`origin/develop` 최신)과 대상(`--only`)을 보여주고 확인

### 3-3. 스크립트를 건너뛰어도 막히는 구조

`gh workflow run --ref feature/x`를 직접 치거나 Actions 화면에서 버튼을 눌러도 아래에서 막힙니다.

| 단계 | 막는 것 |
|---|---|
| ① `deploy.sh` | main 거부, develop만 배포 |
| ② `deploy-staging.yml`의 guard 잡 | `GITHUB_REF`가 develop이 아니면 실패 |
| ③ Environment `staging` | Deployment branches = develop만 (GitHub 서버가 차단) |
| ④ `concurrency: staging` | 동시에 실행해도 한 번에 하나씩 |

## 4. 배포 workflow

| 파일 | 실행 조건 | 환경 | 대상 |
|---|---|---|---|
| `deploy-preview.yml` | PR 열림 · 업데이트 (fork PR 제외) | `preview` | Vercel 미리보기 URL을 PR 댓글로 |
| `deploy-staging.yml` | `workflow_dispatch` (deploy.sh), develop만 | `staging` | Vercel dev alias, Cloud Run dev `backend` · `ai` |
| `deploy-production.yml` | main push | `production` (Lead 승인) | Vercel production, Cloud Run prod `backend` · `ai` |
| `deploy-infra.yml` | develop · main의 `infra/**` 변경 | staging / production | Firestore rules · indexes, Storage 설정 |

- production 배포는 main push(릴리스 · hotfix 머지)로 자동 시작되고, `production` 환경에서 Lead가 승인해야 진행됩니다.
- `ai` 서비스는 외부에 공개되지 않고 backend만 호출할 수 있습니다.

### 4-1. 필요한 시크릿 · 변수

| 이름 | 위치 | 값 |
|---|---|---|
| `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | 환경 preview · staging · production | Vercel 공용 계정 |
| `GCP_WIF_PROVIDER`, `GCP_DEPLOYER_SA` (변수) | 환경 staging · production | dev / prod 프로젝트 값 |
