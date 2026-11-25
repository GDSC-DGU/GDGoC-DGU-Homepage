# 로그인 (F-AUTH-001) · 관리자 입구 정리

> 2026-11-18. 기준: 노션 기능 명세서 F-AUTH-001 · 002 · 003 · 007, F-COM-001 · 002 · 003 (11-18 판), 백엔드 `feature/f-auth-001-google-login` · `docs/api/openapi.yaml` API-AUTH-001 ~ 003.

## 문제

- 회원 · 운영진 모두 Google 로 로그인하고 관리 유형(ADMIN · GENERAL)만 다르게 받기로 했는데, 프론트에는 공개 로그인이 없고 관리자 화면에만 아이디 · 비밀번호 로그인(F-AUTH-004 ~ 006, 명세에서 삭제됨)이 있었다.
- 꼬리말에 숨긴 '운영진 로그인' 링크는 명세(F-COM-002)와 맞지 않는다.

## 해결

1. 공개 로그인 화면 `/login` (P-COM-010): Google 로그인 버튼(Google Identity Services) → Google ID 토큰을 `POST /api/v1/auth/google` 로 → 끝나면 `?next=` 의 보던 페이지로.
2. 머리말 오른쪽: 로그인 전 [로그인] / 로그인 뒤 이름 버튼 → 펼침(이름 · 관리 유형 · 운영진이면 [관리자 페이지] · [로그아웃]). 전체 메뉴 아래에도 같은 줄.
3. 로그인 유지 (`src/features/auth/AuthProvider.tsx`)
   - access token 은 메모리에만. 새로고침하면 다른 탭에서 받고, 없으면 refresh token 쿠키로 `POST /api/v1/auth/refresh`.
   - access 끝나기 1분 전에 갱신 (Web Locks 로 한 탭만, BroadcastChannel 로 다른 탭에 건넴). 로그인 · 로그아웃도 탭끼리 함께.
   - 로그인 55분 '5분 뒤 로그아웃돼요.', 1시간에 로그아웃하고 `/login?reason=expired`.
   - 작성 중(`useHoldOnExpiry`, 관리자 글쓰기 화면의 `useLeaveGuard`)이면 화면에 남고 '새 탭에서 다시 로그인' 안내. 새 탭에서 로그인하면 이 탭도 다시 로그인된다.
   - 서버가 로그인을 무효로 하면(비활성화 · 관리 유형 변경, 갱신 401) 바로 로그아웃.
4. 앱 안 브라우저(카카오톡 · 인스타그램 · 네이버 앱 · 안드로이드 WebView)는 Google 버튼 대신 외부 브라우저 안내 (P-COM-011). 카카오톡은 '외부 브라우저로 열기' 버튼.
5. 관리자 화면: 따로 로그인하지 않는다. 로그인 전 → `/login?next=/admin…`, GENERAL → '운영진만 쓸 수 있는 페이지예요.' 후 홈, ADMIN → 관리자 화면. 예전 `/admin/login` 은 `/login?next=/admin` 으로 넘긴다. 관리자 아이디 · 비밀번호 화면과 비밀번호 변경 팝업은 지웠다.
6. 꼬리말의 관리자 로그인 링크를 지웠다.

## 구현 결정

- `VITE_AUTH=google` 이면 실제 API, `example` 이면 예시 로그인 (예시 운영진 = 관리자 예시 데이터의 운영진A, 예시 회원). 비우면 `VITE_DATA_SOURCE` 를 따름(http → google). 공개 데이터는 예시로 두고 로그인만 켤 수 있게 따로 둠 (2026-11-24). 예시 로그인도 access 15분 · 로그인 1시간 · 연장 없음을 흉내 낸다.
- Google 클라이언트 ID 는 `VITE_GOOGLE_CLIENT_ID` (공개 값, 백엔드 `GOOGLE_CLIENT_ID` 와 같은 값). 비어 있으면 버튼 대신 안내.
- CSP(`vercel.json`)에 Google 로그인 주소 (`script-src …/gsi/client`, `style-src …/gsi/style`, `connect-src` · `frame-src …/gsi/`).
- 관리자 데이터는 아직 예시다. 운영진은 예시 데이터의 운영진A(Lead 권한)로 들어간다. 명세상 운영진은 모두 같은 권한이라 지금 동작과 맞는다.
- 머리말 폭: 가운데 메뉴가 벌어져도 겹치지 않게 로그인 뒤에는 한 칸만 (1440 미만은 사람 그림만). 1024 · 1200 · 1300 · 1440 · 1600 에서 메뉴와 52px 이상 떨어짐을 쟀다.

## 테스트

- `src/features/auth/auth.test.ts`: 응답 읽기, 55분 · 60분 · 갱신 시각, 돌아갈 주소(바깥 주소 막기), 앱 안 브라우저 판별, http API(주소 · 쿠키 · Authorization · 오류 코드 · 연결 실패), 예시 로그인(새로고침 · 1시간 만료 · 로그아웃).
- 브라우저(Playwright, 예시 데이터): 로그인 → 보던 페이지, 새로고침 유지, 다른 탭 로그인 · 로그아웃, 관리자 입구 · 옛 주소, GENERAL 막기, 55분 · 60분(시계 빨리 감기), 작성 중 만료 → 새 탭 로그인 → 그대로 저장 가능, 390 폭, 카카오톡 UA. axe 위반 0, 가로 넘침 0.
- http 모드 빌드: Google 버튼이 그려지고, refresh 401 이면 로그인 전.

## 범위 밖 (다음 작업)

- 초대 링크로 Google 계정 연결 (F-AUTH-003, P-COM-006 · 007) — 첫 로그인 전에 필요하다 (`GOOGLE_ACCOUNT_NOT_LINKED`).
- 관리자 사용자 관리의 Lead · Core · General → ADMIN · GENERAL, 아이디 · 비밀번호 칸 · 비밀번호 초기화 지우기, 연결 상태 · 초대 재발송 (F-AUTH-007 · 008).
- 팀원 찾기 글 수정 · 삭제를 학번 + PIN 대신 로그인한 작성자로 (F-AUTH-002), 다른 API 호출에 `Authorization` 붙이기 (`useAuth().getAccessToken()`).
- 백엔드와 맞출 것: 프론트에서 부를 API 주소(같은 사이트여야 refresh 쿠키가 붙음), 로컬 개발의 토큰(문서는 Firebase Auth 에뮬레이터, 코드는 Google ID 토큰 검증).
