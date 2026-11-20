# 규칙 요약 (RULE SUMMARY)

GDGoC DGU 홈페이지 레포의 모든 규칙을 한 페이지로 모았습니다. 각 항목은 **제목 → 요약 → 자세한 문서 링크** 순서입니다. 처음 온 사람은 1~12번만 읽으면 작업을 시작할 수 있습니다.

| 표시 | 뜻 |
|---|---|
| **강제** | GitHub 설정(ruleset, CI)이 막습니다. 지키지 않으면 머지가 안 됩니다 |
| **약속** | 설정으로 막지 않고 팀이 지킵니다 |

## 문서 구성

| 문서 | 내용 | 읽을 사람 |
|---|---|---|
| [작업 규칙](./contributing.md) | 작업 종류, 브랜치 이름, PR 제목, 작업 순서, 공개 레포 규칙, 라벨 | 전원 |
| [머지 규칙](./merge-rules.md) | 머지 조건, 릴리스, 핫픽스, 우회 | 전원 |
| [실행 · 배포](./local-and-deploy.md) | 로컬 실행, `deploy.sh`, 배포 workflow | 전원 |
| [레포 설정](./repo-settings.md) | 팀 · 권한 · 레포 설정 · 자동화 파일 · 파트별 CI · ruleset · 환경 | Lead/PM |

---

## 1. 작업 흐름 한눈에

> [!NOTE]
> (선택) 이슈 생성 → `develop`에서 브랜치 생성 → 작업 → `develop`으로 PR → `pr-title` · 파트별 CI 통과 → **작성자가 squash merge** → `deploy.sh`로 staging 확인 → Lead가 릴리스 PR로 `main` 반영

📖 자세히: [작업 규칙 › 한눈에 보기](./contributing.md#한눈에-보기)

## 2. 브랜치 구조

> [!IMPORTANT]
> - `main`: production(gdgoc-dgu.com) 기준. `develop` 릴리스 PR과 `hotfix/*` PR이 들어옵니다.
> - `develop`: staging(dev.gdgoc-dgu.com) 기준이자 **기본 브랜치**. 작업 브랜치 PR이 들어옵니다.
> - 두 브랜치 모두 **직접 push · force push · 삭제 금지** (강제)

📖 자세히: [작업 규칙 › 한눈에 보기](./contributing.md#한눈에-보기)

## 3. 작업 종류와 브랜치 헤드

> [!NOTE]
> 작업 종류는 Issue type이 아니라 **종류 라벨**로 구분하고, 브랜치 헤드는 작업 종류에서 정해집니다.
> 기능 → `feature/` · 디자인 → `design/` · 버그 → `fix/` (긴급이면 `hotfix/`, main에서 출발) · 작업 → `task/` · 문서 → `docs/`
> 같은 화면이라도 **"새로고침해도 결과가 남는가"**로 Feature와 Design을 나눕니다. 둘 다 필요하면 Design 먼저.
> 이슈는 선택입니다. 이슈를 만들 때는 템플릿(기능 / 디자인 / 버그 / 작업 / 문서) 중 하나를 고릅니다.

📖 자세히: [작업 규칙 › 1. 작업 종류와 브랜치 헤드](./contributing.md#1-작업-종류와-브랜치-헤드) · [Feature와 Design의 경계](./contributing.md#feature와-design의-경계)

## 4. 브랜치 이름

> [!IMPORTANT]
> 형식 `<헤드>/<ID>-<짧은-설명>`, **전부 소문자**, 50자 이내. 예: `feature/f-hom-001-hero-section`
> ID는 노션 ID 또는 GitHub 이슈 번호이고, 둘 다 없으면 생략합니다. 예: `task/ci-frontend-cache`
> 허용된 헤드 6개 외에는 브랜치를 만들 수 없습니다 (강제). 이슈 화면의 "Create a branch" 기본 이름은 막히니 고쳐서 만듭니다.

📖 자세히: [작업 규칙 › 2. 브랜치 명명 규칙](./contributing.md#2-브랜치-명명-규칙)

## 5. PR 제목 (= develop에 남는 커밋 메시지)

> [!IMPORTANT]
> 형식 `<type>(<scope>): <요약>` — CI가 검사합니다 (강제). 예: `feat(frontend): Teams 게시글 작성 기능 추가`
> type: `feat` `design` `fix` `refactor` `test` `docs` `chore` `ci` `perf` `revert` (`release`는 릴리스 PR 전용)
> scope: `frontend` `backend` `ai` `infra` `ci` `repo` `deps` 중 하나(생략 가능). 하위 호환이 깨지면 `type(scope)!:`
> 작업 브랜치 안의 커밋 메시지는 자유입니다.

📖 자세히: [작업 규칙 › 3. 커밋 · PR 제목 규칙](./contributing.md#3-커밋--pr-제목-규칙)

## 6. 작업 순서

> [!TIP]
> - **시작 전**: (선택) 이슈 생성 → 이슈가 있으면 본인을 Assignee로 → 최신 `develop`에서 브랜치
> - **작업 중**: PR은 400줄 이하로 작게, 일찍 Draft PR. 리뷰가 시작된 뒤에는 force push 대신 "Update branch"
> - **PR**: 템플릿 작성, 이슈가 있으면 `Closes #이슈번호`, `pr-title` · 파트별 CI 실패는 머지 전에 수정
> - **backend · ai**: PR 전에 controller/router에 업무 로직 · DB 접근이 없는지 확인 (controller/router → service → repository 한 방향)
> - **머지 후**: 같은 브랜치를 다시 쓰지 않습니다. 새 작업은 최신 `develop`에서 새 브랜치로

📖 자세히: [작업 규칙 › 4. 작업 순서](./contributing.md#4-작업-순서) · [4-5. backend · ai 코드 구조 확인](./contributing.md#4-5-backend--ai-코드-구조-확인)

## 7. 머지 조건

> [!IMPORTANT]
> - **→ `develop`**: 승인 0명(필수 아님) + `pr-title` 통과 + 코멘트 스레드 전부 해결 → **작성자가 Squash merge** (강제)
> - **→ `main`**: 위 조건 + 브랜치 최신화 → **Lead가 Merge commit** (머지 방식은 강제, 머지하는 사람은 약속)
> - production 배포는 main 머지 후 **Lead 승인**이 있어야 진행됩니다 (강제)

📖 자세히: [머지 규칙 › 1. 대상 브랜치별 머지 조건](./merge-rules.md#1-대상-브랜치별-머지-조건)

## 8. 릴리스 (develop → main)

> [!NOTE]
> Lead가 `release: YYYY-MM-DD` PR을 열고 staging 확인 체크리스트를 채웁니다 → Lead가 Merge commit → Lead가 배포 승인 → `vYYYY.MM.DD` 태그로 GitHub Release
> 주기는 고정하지 않습니다. 단 **지원 기간 중에는 지원서 관련 변경을 릴리스하지 않습니다** (약속).

📖 자세히: [머지 규칙 › 2. 릴리스](./merge-rules.md#2-릴리스-develop--main)

## 9. 핫픽스 (production 긴급 수정)

> [!WARNING]
> `main`에서 `hotfix/<ID>-<짧은-설명>` → main으로 PR → Lead가 Merge commit → 배포 승인
> 그 뒤 **main → develop back-merge**를 Lead가 Merge commit으로 머지합니다. 빠뜨리면 다음 릴리스에서 버그가 되살아납니다.

📖 자세히: [머지 규칙 › 3. 핫픽스](./merge-rules.md#3-핫픽스-production-긴급-수정)

## 10. 규칙 우회 (bypass)

> [!CAUTION]
> 우회는 Repository admin(= `Homepage-Lead/PM` 팀)만, **PR 머지 때만** 할 수 있습니다. 보호 브랜치에 직접 push는 불가합니다.
> back-merge와 CI 장애 같은 긴급 상황에만 쓰고, 우회했다면 팀 채널에 사유를 공유합니다.

📖 자세히: [머지 규칙 › 4. 규칙 우회](./merge-rules.md#4-규칙-우회-bypass)

## 11. 공개 레포에서 지킬 것

> [!WARNING]
> 이 레포는 **Public**입니다. API 키 · 토큰 · `.env` · 실제 지원자/회원 정보 · AI 채점 루브릭 본문 · 취약점 상세는 커밋 · 이슈 · PR · 스크린샷 어디에도 올리지 않습니다.
> 시크릿을 커밋했다면 **커밋 삭제보다 키 폐기(rotate)가 먼저**이고, 바로 Lead에게 알립니다.
> `.env`, 키 파일, AI 도구 설정(`.claude/`, `CLAUDE.md` 등)은 `.gitignore`로 막혀 있습니다.

📖 자세히: [작업 규칙 › 5. 공개 레포에서 지킬 것](./contributing.md#5-공개-레포에서-지킬-것) · [.gitignore](../.gitignore)

## 12. 라벨

> [!NOTE]
> 라벨은 **사람이 붙이지 않습니다.** 종류 라벨은 이슈 템플릿(이슈를 쓸 때)과 브랜치 헤드로, 영역 라벨(`area:*`)은 이슈 폼에서 고른 값(선택 사항)과 변경 경로로, 심각도(`severity:*`)는 버그 이슈의 필수 선택값으로 자동으로 붙습니다.
> 수동 라벨은 `breaking`, `blocked`, `good first issue`, `skip-release-notes`뿐입니다. 라벨 목록은 `.github/labels.yml`에서만 관리합니다(여기 없는 라벨은 삭제됨).

📖 자세히: [작업 규칙 › 6. 라벨](./contributing.md#6-라벨-자동)

## 13. 로컬 실행

> [!TIP]
> 작업 브랜치에서 `./scripts/deploy.sh` 하나로 에뮬레이터(Firestore · Auth · Storage) + Mailpit + backend + ai + frontend를 모두 띄웁니다.
> DB와 로그인은 가짜 데이터, 메일은 실제로 나가지 않고, AI만 개인 `.env` 키로 실제 호출합니다. Docker 메모리 6GB 이상, Windows는 Git Bash 또는 WSL.

📖 자세히: [실행 · 배포 › 1. 실행 환경 세 가지](./local-and-deploy.md#1-실행-환경-세-가지) · [2. 로컬 전체 실행](./local-and-deploy.md#2-로컬-전체-실행)

## 14. 배포

> [!IMPORTANT]
> - **PR 미리보기**: PR마다 Vercel 미리보기가 자동으로 생깁니다 (UI 확인용, 로그인 불가)
> - **staging**: develop에 머지돼도 자동 배포되지 않습니다. `develop`에서 `./scripts/deploy.sh`를 실행합니다 (Write 이상 누구나)
> - **production**: main 머지 → Lead 승인 후 배포. `main`에서는 `deploy.sh`가 실행을 거부합니다.

📖 자세히: [실행 · 배포 › 3. scripts/deploy.sh](./local-and-deploy.md#3-scriptsdeploysh) · [4. 배포 workflow](./local-and-deploy.md#4-배포-workflow)

## 15. 파트별 CI

> [!NOTE]
> CI는 파트별 파일을 각 파트가 작성 · 관리합니다: frontend `ci-frontend.yml`(Homepage-FE) · backend `ci-backend.yml`(Homepage-BE) · ai `ci-ai.yml`(Homepage-AI)
> 파트별 CI는 필수 체크가 아닙니다. 새 액션을 쓰면 Actions 허용 목록에 추가해야 합니다(관리자).

📖 자세히: [레포 설정 › 파트별 CI](./repo-settings.md#파트별-ci)

## 16. 자동으로 일어나는 일

> [!NOTE]
> - 이슈 템플릿 선택 → 종류 · 영역 · 심각도 라벨 / PR 생성 → 영역 · 종류 · 릴리스 라벨
> - PR 제목 형식 검사, 릴리스 노트 자동 분류
> - Dependabot: 매주 월요일 09:00 GitHub 액션 업데이트 PR
> - 줄바꿈은 모두 LF로 통일 (`.gitattributes`)

📖 자세히: [레포 설정 › 3. 자동화 파일](./repo-settings.md#3-자동화-파일)

## 17. 레포 설정 (Lead/PM용)

> [!NOTE]
> - 팀: `Homepage-FE` · `BE` · `AI`는 Write, `Homepage-Lead/PM`은 Admin. **권한은 팀으로만** 주고, 기수가 바뀌면 팀 멤버와 production 승인자만 바꿉니다.
> - Rulesets: `protect-develop` · `protect-main` · `branch-naming`. 우회는 Repository admin만.
> - Environments: `preview`(모든 브랜치) · `staging`(develop만) · `production`(main만, Lead 개인 계정 승인)

📖 자세히: [레포 설정 › 1. 팀과 권한](./repo-settings.md#1-팀과-권한) · [4. Rulesets](./repo-settings.md#4-rulesets) · [5. Environments](./repo-settings.md#5-environments)
