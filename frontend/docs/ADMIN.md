# 관리자 화면 (/admin)

> 2026-11-01 1단계(기초). 기준: 팀 명세서 v1.2 (화면 P-ACM · ABD · APJ · ACT · AMB · ARC, 기능 F-ACM~F-ARC, API-ACM~API-ARC).
> 만들 때 쓰는 쪽지(부품 사용 예 · 폴더 약속): [`src/features/admin/README.md`](../src/features/admin/README.md).

관리자 화면은 **서버 없이 예시 데이터로만 동작하는 예시 화면**입니다. 공개 사이트(gdghomepage.vercel.app/admin)에서도 열리므로 모든 화면에 '예시 화면 · 예시 데이터'가 보이고, 로그인 화면은 실제 계정을 받지 않습니다.
나중에 서버가 생기면 화면은 그대로 두고 데이터 창구(Repository)만 http 구현으로 바꿉니다.

## 1. 구조

```
src/app/router.tsx            '/admin/*' 하나 → AdminApp (lazy, 공개 사이트 틀 밖)
src/features/admin/
  AdminRoot.tsx               입구: 데이터 → 로그인 상태 → 토스트 · 확인 팝업 → 오류 안내 → 하위 라우트
  routes.tsx                  하위 주소 표 (useRoutes)
  screens.ts                  화면 목록 = 명세 화면 ID · 주소 · 제목 · 기능 · 팝업 · 구역 페이지 이름 (adminPath)
  shell/                      틀: 사이드바(메뉴 · 계정 · 로그아웃 · 예시 표시) · 1024 미만 안내 · 본문 바로가기 · 권한 확인 · 오류 안내
  auth/                       로그인(P-ACM-01) · 비밀번호 변경 팝업(P-ACM-04) · 로그인 상태(AdminAuthProvider)
  dashboard/                  대시보드(P-ACM-03)
  ui/                         관리자 부품 (페이지 머리 · 툴바 · 표 · 팝업 · 토스트 · 폼 · 배지 · 탭 …)
  data/                       타입 · store · seed · Repository(인터페이스 + 예시 구현) · 권한
  boards/ projects/ contents/ users/ recruit/   구역 화면 (2단계)
```

| 주소 | 화면 | 상태 |
|---|---|---|
| `/admin/login` | P-ACM-01 관리자 로그인 (+ P-ACM-04 비밀번호 변경 팝업) | 완료 |
| `/admin` | P-ACM-03 대시보드 | 완료 |
| `/admin/boards/teams` · `/community` · `/community/write` | P-ABD-01 · 02 · 03 | 자리 표시 (2단계) |
| `/admin/projects` · `/projects/write?id=` | P-APJ-01 · 02 | 자리 표시 (2단계) |
| `/admin/contents` | P-ACT-01 (+ P-ACT-02 팝업) | 자리 표시 (2단계) |
| `/admin/users` · `/users/history` | P-AMB-01 · 03 (+ P-AMB-02 · 04 · 05 팝업) | 자리 표시 (2단계) |
| `/admin/recruit/form` · `/form/criteria` · `/applicants` · `/applicants/:applicantId` · `/templates` | P-ARC-01 · 07 · 02 · 03 · 06 (+ P-ARC-04 · 05 · 08 · 09 · 10 팝업) | 자리 표시 (2단계) |
| `/admin/boards` · `/admin/recruit` | 메뉴 묶음 주소 → 첫 화면으로 | |
| 그 밖 `/admin/…` | 관리자 틀 안의 '없는 주소' | |

- 로그인하지 않고 `/admin/*` 에 들어오면 `/admin/login` 으로 가고, 로그인하면 **원래 가려던 주소**로 돌아갑니다 (관리자 주소만, `auth/returnPath.ts`).
- 로그인한 채 `/admin/login` 에 오면 대시보드로 (P-ACM-01).
- 권한 없는 주소에 직접 들어오면 대시보드로 + 안내 토스트 (F-ACM-003 4).
- 관리자 화면끼리는 페이지 전환(View Transitions) 없이 바로 바뀌고, 주소가 바뀌면 본문(`#admin-main`)으로 초점이 갑니다.
- 공개 사이트 꼬리말의 '운영진 로그인'은 `/admin/login`. 사이드바의 '홈페이지로 이동'은 로그인을 유지한 채 홈으로 (F-ACM-004 2).
- 관리자 화면에는 `<meta name="robots" content="noindex">` 를 붙입니다.

### 화면 모양

- 시안 E 토큰 · 글꼴 · 버튼(`.btn-primary` · `.btn-secondary` · `.btn-sm`)을 그대로 쓰고, 도구 화면이라 밀도를 높였습니다: 본문 15, 페이지 제목 28, 표 줄 높이 48, 큰 숫자 · 큰 장면 없음.
- 틀: 왼쪽 사이드바 248(옅은 회색 `--field`) + 흰 본문(최대 1360). 지금 메뉴는 흰 판 + 먹색 글자.
- 관리자 전용 값은 `shell/admin.module.css` 의 `.root` 에만: 위험 · 실패 `--adm-danger #C5221F`(장소색 빨강과 다른 어두운 빨강), 주의 `--adm-warn`, 고른 행 `--adm-select`. 장소색(구글 4색)은 관리자 화면에 쓰지 않습니다.
- 상태는 글자 + 모양(`StatusBadge`: 체크 · 엑스 · 세모 · 점선 원 · 자물쇠 · 빼기). 색만으로 말하지 않습니다.
- 데스크톱 전용(명세). 1024 미만이면 사이드바가 위 띠로 접히고(메뉴 버튼) 본문 위에 '관리자 화면은 넓은 화면(1024px 이상)에 맞춰져 있습니다' 안내. 페이지 가로 넘침은 0, 넓은 표는 표 상자 안에서만 넘깁니다. 로그인 화면은 폰까지 맞춥니다.

## 2. 예시 데이터 · 저장 방식

```
화면 ──useQuery/useMutation──▶ repos (AdminRepositories, 구역별 인터페이스)
                                  └─ 예시 구현(mock): 200–400ms 지연 · 복사본 · 권한 · 기록
                                        └─ store (메모리 + sessionStorage, 구역 slice)
                                              └─ seed (구역별 seed.ts, '처음으로' 때 다시 만듦)
```

- **store** (`data/store.ts`): 구역(boards · projects · contents · users · recruit)마다 한 칸. 바뀌면 sessionStorage(`gdgoc-admin-example-data`)에 쓰고 구독자에게 알립니다.
  - 새로고침해도 같은 탭에서는 남고, 탭을 닫으면 처음으로. 다른 탭 · 다른 사람과 나누지 않습니다.
  - 저장소를 못 쓰면(사생활 보호 창 등) 메모리에만 둡니다.
  - 바뀌면 `AdminDataProvider` 가 `['admin']` 쿼리를 모두 다시 부릅니다 → 저장 · 삭제 뒤 목록 · 대시보드가 저절로 새로 그려집니다.
- **'예시 데이터 처음으로'** (사이드바 · 로그인 화면): seed 를 지금 시각 기준으로 다시 만듭니다. 로그인은 유지되고, 계정 상태(임시 비밀번호 · 잠김 · 실패 횟수)도 처음으로 돌아갑니다.
- **seed**: 시각은 '처음 만든 때'에서 거꾸로 셉니다 ('3시간 전' · '최근 24시간'이 언제 열어도 그럴듯하게). 구역 seed 모양을 바꾸면 그 파일의 `*_SEED_VERSION` 을 올립니다 → 탭에 남은 옛 데이터 중 그 구역만 새 seed 로.
  - 공통 seed: 예시 관리자 계정 4개(`data/common/accounts.ts`), 게시판 글 13 · 댓글 10(대시보드용), 프로젝트는 **저장소의 실제 프로젝트**(`src/content/projects.json`, 공개 정보), 메일 템플릿 기본 4종, 지원폼은 고정 질문만(게시본 없음).
  - 이름 규칙: 사람은 `운영진A` · `예시 멤버 01` · `예시 지원자 01`, 학번 `2026000101`(화면에서는 `2026****01`), 이메일 `@example.com`, 글 · 리뷰 · 답변에 '예시'. 테스트(`screens.test.ts`)가 확인합니다.
- **로그인 흉내** (`data/auth/`): sessionStorage(`gdgoc-admin-example-session`)에 **누가 로그인했는지(사용자 id)만** 둡니다. 입력한 비밀번호는 예시 비밀번호와 비교만 하고 저장 · 전송하지 않습니다. 비밀번호를 바꿔도 새 비밀번호는 두지 않고 '바꿨다'는 표시만 남깁니다.
- **서버 일 흉내**: 메일 발송 · 파일 업로드 · AI 채점은 진행 표시 → 결과만. 실제 네트워크 요청은 없습니다. 업로드 그림은 object URL 이라 **새로고침하면 그림만 사라집니다**(기록은 남고 `AdminImage` 가 안내를 보여 줌).
- **실패 흉내**: 기본은 꺼짐. 실패 화면을 보고 싶으면 개발 도구에서 `setMockOptions({ failureRate: 0.3 })` (`data/common/mockContext.ts`).
- 공개 사이트(홈 · 프로젝트 …)는 이 store 를 읽지 않습니다. 관리자 화면에서 바꾼 것은 공개 화면에 나타나지 않습니다 (서로 독립).

### 예시 계정 (로그인 화면)

| 버튼 | 아이디 · 비밀번호 | 계정 | 보여 주는 것 |
|---|---|---|---|
| Lead 예시 계정으로 들어가기 | `lead-a` · `example1234` | 운영진A · Lead | 모든 기능 |
| Core 예시 계정으로 들어가기 | `core-b` · `example1234` | 운영진B · Core | General 만 관리, 결과 잠금 해제 비활성 |
| 임시 비밀번호 예시 계정으로 들어가기 | `core-c` · `temp1234` | 운영진C · Core | 닫을 수 없는 비밀번호 변경 팝업 (F-ACM-002) |
| (버튼 없음) | `core-d` · `example1234` | 운영진D · Core · 비활성 | '비활성화된 계정입니다. 관리자에게 문의하세요.' |

- 아이디 · 비밀번호 입력도 명세 흐름대로: 틀리면 '아이디 또는 비밀번호가 올바르지 않습니다.', 5회 연속 틀리면 15분 제한, 그 뒤 다시 5회 틀리면 잠김(사용자 관리에 '잠김'으로 보이고 다른 Lead 가 잠금 해제). 예시 화면에서는 '예시 데이터 처음으로'로 바로 풀립니다.
- 미정(명세): 로그인 유지 방식 · 만료(F-ACM-001 8), 일정 시간 미사용 자동 로그아웃(F-ACM-004 1) — 흉내 내지 않았습니다.

### 대시보드 (P-ACM-03)

- 운영 지표: 오늘 · 이번 주 접속자(집계 방식 미정 F-COM-002 → **예시 값**으로 표시), 새로운 게시글(Teams · Community), 새로운 댓글. '새로운'은 **최근 24시간**(명세 '확정 필요' → 임시).
- 새로운 게시글 · 댓글 5개: 게시판 구역 store 를 그대로 읽습니다 (게시판 관리에서 지우면 바로 빠짐). 누르면 그 게시판 관리로 (`?post=` · `?comment=`). [전체 보기] → Teams 게시판 관리.
- 행사 일정 4개 (F-HOM-004 기준): 실제 일정 `src/content/events.json`(휴회 제외) + 관리자가 쓴 Community 세션 · 행사 글의 기간 + 게시한 지원폼의 지원 마감('마감'). [캘린더 보기] → 홈 `#now`.

## 3. 나중에 API 붙이는 법

1. `data/<구역>/repository.ts` 의 인터페이스가 명세 API 와 한 줄씩 맞습니다 (주석에 API ID · 주소). 같은 모양으로 `data/<구역>/httpRepository.ts` 를 만듭니다.
   - `fetch('/api/admin/…', { credentials: 'include' })` → 응답을 화면 모양으로 바꿈(공개 사이트 `data/http/adapters.ts` 처럼 한 줄씩 읽기)
   - 상태 코드 → `AdminRepoError`: 400 `VALIDATION`(fields) · 401 `UNAUTHORIZED` · 403 `FORBIDDEN` · 404 `NOT_FOUND` · 409 `CONFLICT` · 423 `LOCKED` · 429 `RATE_LIMITED`
2. `data/repositories.ts` 에 `createHttpAdminRepositories(base)` 를 만들고, `data/AdminDataProvider.tsx` 에서 `import.meta.env.VITE_DATA_SOURCE === 'http'` 이면 그것을 씁니다 (공개 사이트 `RepositoryProvider` 와 같은 방식).
3. http 에서는 store 변경 알림이 없으니 mutation 의 `onSuccess` 에서 `queryClient.invalidateQueries({ queryKey: adminKeys.section('<구역>') })`.
4. '예시 화면 · 예시 데이터' 표시 · 예시 계정 버튼 · '처음으로'는 http 일 때 숨깁니다 (`SampleData`, `LoginPage`).
5. 권한은 서버가 최종 판단합니다. 화면의 `permissions.ts` 는 버튼 · 메뉴를 미리 막는 용도로 그대로 둡니다.

## 4. 구역 폴더 약속 (2단계)

| 담당 | 화면 폴더 | 데이터 폴더 |
|---|---|---|
| 게시판 · 프로젝트 · 콘텐츠 | `boards/` `projects/` `contents/` | `data/boards/` `data/projects/` `data/contents/` |
| 사용자 | `users/` | `data/users/` |
| 모집 | `recruit/` | `data/recruit/` |

- `<구역>/index.ts` 는 `screens.ts` 의 `page` 이름으로 페이지 컴포넌트를 내보냅니다 (`routes.tsx` 가 연결, 타입이 이름을 확인).
- 데이터 폴더의 파일 이름 · 내보내는 이름(`create<구역>Seed` · `<구역>_SEED_VERSION` · `<구역>Repository` · `createMock<구역>Repository`)은 유지합니다 (`data/seed.ts` · `data/repositories.ts` 가 모읍니다).
- 다른 구역이 읽는 필드는 이름을 유지합니다: 게시판 글 · 댓글의 기본 필드(대시보드), `UserCore`(인증 · 권한), `recruit.form.published.endDate`(대시보드 마감).
- 공통(`ui/` · `shell/` · `auth/` · `data/common/` · `data/*.ts` · `screens.ts` · `routes.tsx`)은 고치지 않고, 바랄 점은 자기 폴더 `NOTES.md` 에.

## 5. 권한 표 (Lead / Core / General)

General 은 관리자 화면에 들어오지 못합니다 (로그인 아이디가 없음). 규칙은 `data/permissions.ts` 한 곳에 함수로 있고(테스트 `permissions.test.ts`), 화면은 버튼을 막고 예시 저장소는 같은 함수로 한 번 더 막습니다.

| 행동 | 명세 | Lead | Core | 함수 |
|---|---|---|---|---|
| 관리자 화면 로그인 | F-ACM-001 | 가능 | 가능 | `canUseAdmin` |
| 메뉴(구역) 보기 · 주소 접근 | F-ACM-003 | 모두 | 모두 | `AREA_ACCESS` · `canAccessPath` · `shell/menu.ts visibleMenu` |
| 사용자 추가 | F-AMB-006 | 모든 유형 | General만 | `canAddUserOfType` |
| 사용자 수정 · 재활성화 | F-AMB-009 | 모든 유형 | General만 | `canEditUser` · `canReactivateUser` |
| 관리 유형 변경 | F-AMB-009 4 | 가능 | 불가 | `canChangeUserType` |
| 사용자 비활성화 | F-AMB-004 | 자기 자신 · 마지막 활성 Lead 제외 | General만 | `canDeactivateUser` |
| 관리자 비밀번호 초기화 | F-AMB-010 | Lead · Core 대상 | 불가 | `canResetPassword` |
| PIN 초기화 | F-AMB-012 | 모든 유형 | General만 | `canResetPin` |
| 계정 잠금 해제 | F-AMB-015 | 모든 유형 | General만 | `canUnlockUser` |
| 지원자 결과 잠금 해제 | F-ARC-017 | 가능 | 불가 (버튼 비활성) | `canUnlockApplicantResult` |
| 그 밖 (게시글 · 댓글 삭제, 관리자 글쓰기, 프로젝트 · 콘텐츠, 지원폼 · 평가 기준, 결과 처리 · 메일 · 면접 일정 · 합격자 등록) | | 가능 | 가능 | — |

명세 v1.2 에는 Core 가 들어갈 수 없는 **메뉴**가 없습니다 (모두 'Lead · Core 접근 가능'). 그래서 지금은 Core 에게도 모든 메뉴가 보이고, Core 를 막는 것은 구역 안의 행동입니다. 'Lead 만' 메뉴가 생기면 `AREA_ACCESS` 한 줄만 바꾸면 사이드바에서 사라지고 주소 접근도 막힙니다.

## 6. 번들 (공개 사이트를 무겁게 하지 않기)

- 관리자 코드는 `AdminRoot-*.js` · `AdminRoot-*.css` **한 덩어리**로, `/admin` 에 들어갈 때만 받습니다 (미리 받지 않음).
- 2026-11-01 기준 공개 페이지 첫 JS: `index` 355.7KB + 공통 178.1KB = 533.7KB (기초 작업 전 533.8KB). 관리자 덩어리 86KB(gzip 27KB) · CSS 26KB.
- 공개 페이지와 같이 받는 공통 파일에는 react-router 가 통째로 들어 있습니다. 공개 사이트가 쓰지 않는 react-router 부품(`Routes` · `Route` · `Navigate` · `Form` · `useBlocker` …)을 관리자에서 쓰면 그만큼 **공개 페이지 첫 JS 가 커집니다**. 그래서 하위 라우트는 `useRoutes`, 이동은 `useNavigate` · `shell/Redirect` 를 씁니다.
- 구역별로 파일을 나누지 않은 것도 같은 이유입니다 (나누면 공통 파일이 더 잘게 쪼개졌습니다). 바꿀 때는 `npx vite build` 결과에서 `index-*.js` 와 그 옆 공통 파일 크기를 확인합니다.

## 7. 확인

- `npx tsc -b` · `npx oxlint --deny-warnings` · `npx vitest run` · `npx vite build`
- 관리자 테스트: `src/features/admin/**/*.test.ts` (store · 권한 · 로그인 규칙 · 대시보드 · 예시 저장소 · 표기 · 화면 목록 · 예시 이름 규칙)
- 화면: 1440 · 1024 · 390 에서 axe 위반 0, 페이지 가로 넘침 0. 키보드만으로 로그인 → 메뉴 → 팝업(Esc · 초점 복귀)까지.
