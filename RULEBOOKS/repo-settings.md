# 레포 설정

[`GDSC-DGU/GDGoC-DGU-Homepage`](https://github.com/GDSC-DGU/GDGoC-DGU-Homepage)의 GitHub 설정값입니다. GitHub Free 플랜의 Organization 소유 **Public** 레포입니다.

- 이슈와 PR의 종류는 GitHub Issue type이 아니라 라벨(`feature`, `design`, `bug`, `task`, `docs`)로 구분합니다.
- 레포 설정은 레포 Admin(`Homepage-Lead/PM` 팀)이, Organization 설정은 Org Owner가 바꿉니다.

## 1. 팀과 권한

| 팀 (slug) | 화면 이름 | 멤버 | 담당 경로 | 레포 권한 |
|---|---|---|---|---|
| `homepage-fe` | Homepage-FE | Lead, FE 담당 | `frontend/`, `openapi.yaml` | Write |
| `homepage-be` | Homepage-BE | BE 담당 | `backend/`, `openapi.yaml`, `ai-internal.yaml`, `infra/`, `scripts/`, `docker-compose.yml`(Lead/PM과 공동) | Write |
| `homepage-ai` | Homepage-AI | AI 담당 | `ai/`, `ai-internal.yaml` | Write |
| `homepage-lead-pm` | Homepage-Lead/PM | Lead, PM(인프라 · 레포 구성 담당) | `infra/`, `scripts/`, `docker-compose.yml`(BE와 공동), `.github/`, `RULEBOOKS/` | **Admin** |

- 팀은 모두 **Visible**이고 Parent team이 없습니다.
- 팀은 화면 이름이 아니라 slug로 가리킵니다. 화면 이름의 `/`는 slug에서 `-`가 됩니다. (CODEOWNERS도 slug를 씁니다)
- 레포 권한은 **팀으로만** 줍니다. 팀에 들어간 사람에게는 개인 권한(Direct access의 개인 항목)을 두지 않습니다.
- 팀에는 조직 멤버만 넣을 수 있습니다. 조직 멤버가 아닌 사람은 조직에 들어올 때까지 레포에 개인(Write)으로 초대하고, 조직에 들어오면 팀에 넣고 개인 권한을 지웁니다.
- production 배포 승인자는 팀이 아니라 **Lead 개인 계정**입니다 (5번).
- 기수가 바뀌면 **팀 멤버**와 `production` 환경 승인자를 바꿉니다. CODEOWNERS는 고치지 않습니다.

## 2. 레포 설정

### 2-1. Settings → General

| 항목 | 값 |
|---|---|
| Default branch | **`develop`** |
| Wikis | 끔 |
| Issues | 켬 |
| Discussions | 끔 |
| Projects | 켬 |
| Allow merge commits | 켬, 기본 메시지 "Pull request title" |
| Allow squash merging | 켬, 기본 메시지 "**Pull request title and commit details**" |
| Allow rebase merging | **끔** |
| Always suggest updating pull request branches | 켬 |
| Allow auto-merge | 켬 |
| Automatically delete head branches | **켬** |

### 2-2. Settings → Actions → General

- **Actions permissions**: "Allow GDSC-DGU, and select non-GDSC-DGU, actions and reusable workflows"
  - ✅ Allow actions created by GitHub
  - ✅ Allow actions by Marketplace verified creators
  - **Allow or block specified actions**:
    ```
    crazy-max/ghaction-github-labeler@*,
    amannn/action-semantic-pull-request@*
    ```
    GitHub 제작 · 인증 제작자가 아닌 액션을 쓰는 워크플로우를 추가할 때 이 목록에도 함께 추가합니다.
  - ✅ **Require actions to be pinned to a full-length commit SHA**. SHA 갱신은 Dependabot이 합니다.
- **Fork pull request workflows from outside collaborators**: "Require approval for all external contributors"
- **Workflow permissions**: "Read repository contents and packages permissions". 필요한 잡에서만 `permissions:`로 올립니다.
- **Allow GitHub Actions to create and approve pull requests**: 켬

### 2-3. Settings → Advanced Security

| 기능 | 설정 |
|---|---|
| Private vulnerability reporting | 켬 |
| Dependency graph | 켬 |
| Dependabot alerts | 켬 |
| Dependabot security updates | 켬 |
| Secret Protection | 켬 |
| └ Push protection | **켬** (시크릿이 포함된 push를 차단) |
| Code scanning (CodeQL) | Default setup |

## 3. 자동화 파일

| 파일 | 자동으로 하는 일 |
|---|---|
| `ISSUE_TEMPLATE/*.yml` | 이슈 양식 5종. 종류 라벨 부착, 입력 필수 항목 강제 |
| `ISSUE_TEMPLATE/config.yml` | 템플릿 없는 빈 이슈 금지 |
| `labels.yml` + `workflows/labels-sync.yml` | 레포 라벨을 파일 내용과 동일하게 유지 (파일에 없는 라벨은 삭제) |
| `workflows/issue-labeler.yml` | 이슈 폼 선택값 → `area:*`, `severity:*` 라벨 |
| `labeler.yml` + `workflows/pr-labeler.yml` | PR 경로 → `area:*`, 브랜치 헤드 → 종류 라벨, 흐름 → `release`/`back-merge` |
| `workflows/pr-title.yml` | PR 제목 형식 검사 |
| `CODEOWNERS` | 경로별 담당 팀 정리 (리뷰 자동 요청 규칙은 주석 처리돼 있어 동작하지 않음) |
| `pull_request_template.md` | PR 본문 양식 |
| `release.yml` | 릴리스 노트 자동 분류 |
| `dependabot.yml` | 매주 월요일 09:00 GitHub 액션 업데이트 PR (새 버전은 7일 대기) |

### 파트별 CI

CI는 파트별 파일로 둡니다. 각 파트가 작성 · 관리하며, 전체를 묶는 집계 체크는 두지 않습니다.

| 파트 | 파일 | 담당 팀 |
|---|---|---|
| frontend | `workflows/ci-frontend.yml` | Homepage-FE |
| backend | `workflows/ci-backend.yml` | Homepage-BE |
| ai | `workflows/ci-ai.yml` | Homepage-AI |

- 파트별 CI는 필수 체크에 넣지 않습니다.
- 새 액션을 쓰면 Actions 허용 목록에 추가해야 합니다 (관리자, 2-2번).

## 4. Rulesets

Settings → Rules → Rulesets에 branch ruleset 3개를 둡니다. 우회 대상(Bypass list)은 모두 **Repository admin** 역할입니다.

### 4-1. `protect-develop`

- Target: `develop`
- Bypass list: Repository admin → **For pull requests only**

| 규칙 | 설정 |
|---|---|
| Restrict deletions | ✅ |
| Block force pushes | ✅ |
| Require a pull request before merging | ✅ |
| └ Required approvals | **0** |
| └ Dismiss stale approvals when new commits are pushed | ❌ |
| └ Require review from Code Owners | ❌ |
| └ Require approval of the most recent reviewable push | ❌ |
| └ Require conversation resolution before merging | ✅ |
| └ Required reviewers | ❌ |
| └ Allowed merge methods | **Squash만** |
| Require status checks to pass | ✅ `pr-title` |
| └ Require branches to be up to date before merging | ❌ |

### 4-2. `protect-main`

- Target: `main` (이름으로 지정)
- Bypass list: Repository admin → **For pull requests only**

| 규칙 | 설정 |
|---|---|
| Restrict deletions | ✅ |
| Block force pushes | ✅ |
| Require a pull request before merging | ✅ |
| └ Required approvals | 0 |
| └ Require conversation resolution | ✅ |
| └ Allowed merge methods | **Merge만** |
| Require status checks to pass | ✅ `pr-title` |
| └ Require branches to be up to date before merging | ✅ |

Lead 승인은 ruleset이 아니라 5번 `production` 환경의 승인자로 강제합니다.

### 4-3. `branch-naming`

허용된 접두사 외의 브랜치 생성을 막습니다.

- Target: **Include all branches**
- Exclude by pattern:
  - `main`, `develop`
  - `feature/**`, `design/**`, `fix/**`, `hotfix/**`, `task/**`, `docs/**`
  - `dependabot/**`
  - `gh-readonly-queue/**`
- Rules: **Restrict creations**만 체크 (Restrict deletions, Block force pushes는 해제)
- Bypass list: Repository admin → **Always**

접두사 뒤의 형식(소문자, 하이픈, 길이)은 설정으로 강제되지 않습니다 (약속: [작업 규칙](./contributing.md) 2번).

### 사용하지 않는 규칙

Required reviewers, Require merge queue, Require signed commits, Require linear history, Require deployments to succeed, Metadata restrictions.

## 5. Environments

| 환경 | Deployment branches | 보호 규칙 | 시크릿 · 변수 |
|---|---|---|---|
| `preview` | All branches | 없음 | Vercel 토큰 · Org ID · Project ID, dev Firebase 웹 설정 |
| `staging` | `develop`만 | 없음 | dev GCP WIF provider · 서비스 계정, Vercel 값 |
| `production` | `main`만 | **Required reviewers: Lead 개인 계정**, Allow administrators to bypass **해제**, Prevent self-review 끔 | prod GCP WIF provider · 서비스 계정, Vercel 값 |

- 시크릿은 **레포 레벨이 아니라 환경 레벨**에 넣습니다. production 시크릿은 승인 전 잡에서 읽을 수 없습니다.
- GCP 인증은 서비스 계정 키(JSON) 없이 Workload Identity Federation으로 합니다.
- Vercel은 Git 연동 없이 GitHub Actions가 Vercel CLI로 배포합니다.

## 6. 알아둘 동작

- **`GITHUB_TOKEN`으로 만든 PR에는 워크플로우가 실행되지 않습니다.** 그런 PR은 필수 체크(`pr-title`)가 돌지 않아 대기 상태로 남습니다.
- **`pull_request_target` 워크플로우**(pr-title, pr-labeler)는 PR 대상 브랜치에 있는 파일로 실행됩니다. `main`과 `develop` 양쪽에 같은 `.github/`가 있어야 합니다.
- **이슈의 "Create a branch" 버튼**이 제안하는 `42-issue-title` 같은 이름은 `branch-naming`에 막힙니다. `feature/f-hom-001-...`처럼 고쳐서 만듭니다.
- **허용 액션 목록에 없는 액션**을 쓰는 워크플로우는 실행되지 않습니다.
- **ruleset 이름**은 Rule Insights와 에러 메시지에 그대로 표시됩니다.
- **기본 브랜치가 develop**이라 레포 첫 화면도 develop 기준입니다. README의 배포 배지는 main 기준입니다.
- **팀을 만든 사람은 자동으로 그 팀의 maintainer**가 됩니다.
