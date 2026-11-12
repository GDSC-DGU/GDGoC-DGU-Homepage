# 작업 규칙

GDGoC DGU 홈페이지 레포에서 작업할 때 지키는 규칙입니다. 머지 조건은 [머지 규칙](./merge-rules.md)에 따로 정리했습니다.

## 한눈에 보기

```
(선택) 이슈 생성 → develop에서 브랜치 생성 → 작업·커밋 → PR(→ develop) → `pr-title` · 파트별 CI 통과 → 작성자가 squash merge → staging 확인
```

| 브랜치 | 역할 | 직접 push | 들어오는 경로 |
|---|---|---|---|
| `main` | production(gdgoc-dgu.com) 배포 기준 | 금지 | `develop` 릴리스 PR, `hotfix/*` PR |
| `develop` | staging(dev.gdgoc-dgu.com) 배포 기준, **기본 브랜치** | 금지 | 작업 브랜치 PR |
| 작업 브랜치 | 작업 하나 단위 | 본인만 | — |

`develop`이 기본 브랜치이므로 PR을 열면 대상이 자동으로 `develop`으로 잡힙니다.

---

## 1. 작업 종류와 브랜치 헤드

작업 종류는 GitHub Issue type이 아니라 **종류 라벨**(`feature`, `design`, `bug`, `task`, `docs`)로 구분합니다. PR에는 브랜치 헤드에 따라 종류 라벨이 자동으로 붙습니다. 이슈를 만들 때는 아래 템플릿 중 하나를 고르며, 템플릿이 같은 라벨을 자동으로 붙입니다.

**원칙: 브랜치 헤드는 작업 종류에서 정해집니다.** 작업이 어떤 종류인지만 보면 브랜치 이름의 앞부분이 결정됩니다.

| 작업 종류 (이슈 템플릿) | 종류 라벨            | 무엇을 하나                                                 | 브랜치 헤드     | 출발        | PR 제목 type                            |
| ------ | ---------------- | ------------------------------------------------------ | ---------- | --------- | ------------------------------------- |
| ✨ 기능   | `feature`        | 동작이 바뀌는 기능 구현 (데이터, API, 권한)                           | `feature/` | `develop` | `feat`                                |
| 🎨 디자인 | `design`         | 보이는 것만 바뀌는 작업 (퍼블리싱, 스타일, 공통 컴포넌트 외형, 디자인 토큰, 에셋, 반응형) | `design/`  | `develop` | `design`                              |
| 🐞 버그  | `bug`            | 버그 수정                                                  | `fix/`     | `develop` | `fix`                                 |
|        | `bug` + `hotfix` | production 긴급 수정                                       | `hotfix/`  | `main`    | `fix`                                 |
| 🔧 작업  | `task`           | 설정, CI/CD, 리팩터링, 테스트, 의존성, 인프라                         | `task/`    | `develop` | `chore` `ci` `refactor` `test` `perf` |
| 📝 문서  | `docs`           | 문서                                                     | `docs/`    | `develop` | `docs`                                |

종류 라벨은 **하나의 이슈·PR에 하나만** 붙습니다. 라벨은 손으로 추가하거나 떼지 않습니다. 이슈 없이 PR만 열어도 브랜치 헤드로 종류 라벨이 붙습니다.

### Feature와 Design의 경계

같은 화면을 만들더라도 **"새로고침해도 결과가 남는가"**로 나눕니다.

| 예시 | 종류 |
|---|---|
| Teams 목록 카드의 여백·색·호버 효과를 Figma대로 맞춤 | Design |
| 공통 `Button` 컴포넌트에 `variant="ghost"` 외형 추가 | Design |
| 다크모드 색 토큰 추가 | Design |
| Teams 목록에 카테고리 필터 추가 (API 쿼리 파라미터 사용) | Feature |
| 지원서 폼 입력값 검증 추가 | Feature |

한 화면이 둘 다 필요하면 **Design 먼저, Feature 나중**으로 작업을 나눕니다. 이슈를 쓸 때는 기능 이슈의 "참고" 칸에 디자인 이슈 번호를 적어 연결합니다.

## 2. 브랜치 명명 규칙

### 형식

```
<헤드>/<ID>-<짧은-설명>   # ID는 없으면 생략: <헤드>/<짧은-설명>
```

| 요소 | 규칙 |
|---|---|
| `헤드` | 위 표의 `feature`, `design`, `fix`, `hotfix`, `task`, `docs` 중 하나 |
| `ID` | 노션 ID 또는 GitHub 이슈 번호. 둘 다 없으면 생략합니다. **노션 ID는 소문자로 바꿔 씁니다** (`F-HOM-001` → `f-hom-001`) |
| `짧은-설명` | 영어 소문자, 숫자, 하이픈(`-`)만. 2~5단어 |
| 전체 길이 | 50자 이내 |

**브랜치 이름 전체가 소문자입니다.** 이슈 제목, PR 본문, 커밋 메시지에서는 노션 ID를 원래대로 대문자(`F-HOM-001`)로 씁니다.

### 예시

```
feature/f-hom-001-hero-section  # 기능 ID F-HOM-001
design/p-hom-001-header         # 화면 ID P-HOM-001
fix/58-apply-duplicate-check    # 이슈 #58
hotfix/61-login-cookie-domain   # 이슈 #61, main에서 출발
task/42-ci-gradle-cache         # 이슈 #42
docs/17-local-setup-guide       # 이슈 #17
task/ci-frontend-cache               # ID 없음
```

### 참고

- 위 6개 이외의 헤드로는 브랜치를 만들 수 없습니다 (ruleset). 이슈 화면의 "Create a branch" 버튼은 `42-issue-title` 같은 이름을 제안하므로, 위 형식으로 고친 뒤 생성합니다.
- PR을 열면 헤드에 따라 종류 라벨(`feature`, `design`, `bug`…)이 자동으로 붙고, 릴리스 노트도 이 라벨로 분류됩니다.
- 자동 생성 브랜치(`dependabot/*` 등)는 예외입니다.

---

## 3. 커밋 · PR 제목 규칙

PR은 squash merge되므로 **PR 제목이 develop에 남는 커밋 메시지**가 됩니다. PR 제목 형식은 CI가 검사합니다. 작업 브랜치 안의 커밋 메시지는 자유이며, 같은 형식을 권장합니다.

### 형식 ([Conventional Commits](https://www.conventionalcommits.org/ko/v1.0.0/))

```
<type>(<scope>): <요약>
```

| 요소 | 값 |
|---|---|
| `type` | `feat`, `design`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`, `perf`, `revert` (`release`는 릴리스 PR 전용) |
| `scope` | `frontend`, `backend`, `ai`, `infra`, `ci`, `repo`, `deps` 중 하나(생략 가능). 여러 영역이면 가장 핵심인 것 하나. (`deps-dev`도 허용되지만 Dependabot 자동 PR 전용) |
| `요약` | 한국어 가능. "~ 추가", "~ 수정"처럼 명사형으로 끝냄. 마침표 없음. 50자 이내 |
| `!` | 하위 호환이 깨지는 API 변경이면 `type(scope)!:` |

### 예시

```
feat(frontend): Teams 게시글 작성 기능 추가
design(frontend): Teams 목록 카드 스타일 Figma 반영
fix(backend): 지원서 중복 제출 검사 누락 수정
feat(backend)!: 지원서 응답에 status 필드 필수화
chore(ci): Gradle 캐시 적용
release: 2026-11-20          ← 릴리스 PR 전용
```

> `design`은 Conventional Commits 표준에는 없는 이 레포의 확장 type입니다. 표준의 `style`은 쓰지 않습니다.

---

## 4. 작업 순서

### 4-1. 시작 전

1. **(선택) 이슈를 만들 때는** 템플릿(기능 / 디자인 / 버그 / 작업 / 문서) 중 하나를 고릅니다. 빈 이슈는 만들 수 없습니다. 템플릿이 종류 라벨을 자동으로 붙입니다. "작업 영역"(버그는 "의심 영역")은 선택 사항이고, 고르면 영역 라벨이 붙습니다. 버그 템플릿의 "심각도"는 필수입니다.
2. **이슈가 있으면 본인을 Assignee로 지정합니다.**
3. **최신 develop에서 브랜치를 만듭니다.**

```bash
git switch develop
git pull
git switch -c feature/f-hom-001-hero-section
```

### 4-2. 작업 중

- **PR은 작게 만듭니다.** 변경 400줄 이하를 목표로 합니다(생성 코드, lock 파일, 이미지 에셋 제외). 이슈를 쓸 때는 기능이 크면 하위 이슈(sub-issue)로 나눕니다.
- **디자인 작업은 Vercel 프리뷰 링크를 PR에 남깁니다.**
- **일찍 Draft PR을 엽니다.**
- **develop 최신 내용 반영**: 리뷰가 시작되기 전에는 `git rebase develop` 후 force push해도 됩니다. **리뷰가 시작된 뒤에는** force push하지 않고 PR 화면의 "Update branch" 버튼이나 `git merge develop`을 씁니다.

### 4-3. PR 올리기

1. PR 템플릿을 채웁니다. 이슈가 있으면 `Closes #이슈번호`를 적습니다. develop이 기본 브랜치이므로 머지되면 이슈가 자동으로 닫힙니다.
2. Draft를 해제합니다. 리뷰 승인은 필요하지 않습니다.
3. `pr-title`이나 파트별 CI가 실패하면 머지 전에 먼저 고칩니다. 파트별 CI 파일과 담당: [레포 설정 › 파트별 CI](./repo-settings.md#파트별-ci)

### 4-4. 머지 후

1. **작성자가 직접 squash merge합니다.** `pr-title` 통과와 코멘트 스레드 해결이 조건입니다.
2. 원격 브랜치는 자동으로 삭제됩니다. 로컬 브랜치도 지웁니다.
3. **같은 브랜치에서 작업을 이어가지 않습니다.** 추가 작업은 최신 develop에서 새 브랜치를 만듭니다.
4. develop 머지는 staging에 자동 배포되지 않습니다. develop을 pull한 뒤 `./scripts/deploy.sh`를 실행하면 dev.gdgoc-dgu.com에 배포됩니다(Write 이상 누구나). 본인 기능이 staging에서 동작하는지 확인합니다. 진짜 구글 로그인은 여기서 처음 확인할 수 있습니다. 자세한 내용: [실행 · 배포](./local-and-deploy.md)

```bash
git switch develop
git pull
git branch -d feature/f-hom-001-hero-section
```

### 4-5. backend · ai 코드 구조 확인

`backend/`, `ai/` 작성자는 PR 전에 아래를 확인합니다.

- controller(backend)·router(ai)는 요청을 받는 층입니다. URL 연결, 요청 받기, 형식 검사(`@Valid` / pydantic), service 호출, 응답 반환만 합니다. 업무 규칙 판단, 계산, DB 접근(repository 호출)은 service에 둡니다.
- 호출 방향은 controller/router → service → repository 하나뿐입니다. 층을 건너뛰지 않고, service는 웹 프레임워크 객체(`HttpServletRequest`, FastAPI `Request` 등)를 받지 않습니다.
- 실패 응답(409, 400 등)은 controller의 if문으로 만들지 않습니다. service가 던진 예외를 공통 예외 처리기(Spring `@RestControllerAdvice`, FastAPI `exception_handler`)가 상태 코드로 바꿉니다. 데이터 하나에 딸린 규칙은 그 클래스(엔티티/모델)의 메서드로 둘 수 있습니다(예: `Recruit.isClosed()`).

---

## 5. 공개 레포에서 지킬 것

이 레포는 Public입니다. 아래는 커밋, 이슈, PR, 코멘트, 스크린샷 어디에도 올리지 않습니다.

| 금지 | 대신 |
|---|---|
| API 키, 서비스 계정 키, 토큰, 쿠키 값 | GitHub Environments 시크릿 / GCP Secret Manager |
| `.env` 파일 | `.env.example`에 키 이름만 |
| 실제 지원자·회원 정보 (이름, 학번, 이메일) | `scripts/`의 가짜 시드 데이터 |
| AI 채점 루브릭·프롬프트 본문 | Secret Manager 또는 관리자 전용 저장소, 코드에는 구조만 |
| 보안 취약점 상세 | Security 탭 → Report a vulnerability (비공개 제보) |

실수로 시크릿을 커밋했다면 **커밋을 지우는 것보다 키를 폐기(rotate)하는 것이 먼저**입니다. 공개 레포에 한 번 push된 값은 이미 노출된 것으로 간주합니다. 바로 Lead에게 알립니다.

---

## 6. 라벨 (자동)

라벨은 사람이 붙이지 않는 것이 원칙입니다. 목록은 `.github/labels.yml`에서만 관리합니다.

| 라벨 | 대상 | 붙는 방식 |
|---|---|---|
| `feature` `design` `bug` `task` `docs` (종류) | 이슈 (이슈를 쓸 때) | 고른 이슈 템플릿 |
| | PR | 브랜치 헤드 (`fix/`, `hotfix/` → `bug`) |
| `hotfix` | PR | `hotfix/` 브랜치 (`bug`와 함께) |
| `area:frontend` `backend` `ai` `infra` `ci` `docs` | 이슈 (이슈를 쓸 때) | 이슈 폼의 "작업 영역" · "의심 영역" 선택값 (선택 사항, 디자인 · 문서 템플릿은 `area:frontend` · `area:docs` 고정) |
| | PR | 변경된 파일 경로 |
| `severity:critical` `high` `medium` `low` | 버그 이슈 (이슈를 쓸 때) | 버그 폼의 "심각도" 선택값 (필수) |
| `release`, `back-merge` | PR | 브랜치 흐름 (develop→main, main→develop) |
| `breaking` | PR | **수동**. 하위 호환이 깨지는 API 변경 |
| `blocked`, `good first issue`, `skip-release-notes` | 이슈·PR | **수동** |

이 레포는 GitHub의 Issue type을 쓰지 않습니다. 이슈와 PR의 종류는 모두 위 **종류 라벨**로 구분하고, 릴리스 노트도 이 라벨로 분류됩니다.
