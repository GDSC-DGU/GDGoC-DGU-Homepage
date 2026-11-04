# GDGoC DGU 홈페이지 프로토타입

Google Developer Groups on Campus Dongguk University 홈페이지를 React로 만든 시안 레포입니다.
4기 G-Sprint 팀 본 레포가 아닙니다. 폴더 구조와 패턴은 **제안**이고, 실제 규칙은 팀(FE 이도윤 · 박정은)이 정합니다.

- 메뉴: 배범서 기획(노션 '기획 구체화')의 Home · Projects · Teams · Community · Recruits 를 한글로 표기 (홈 · 프로젝트 · 커뮤니티 · 팀원 찾기, 오른쪽 끝 '지원 안내' 버튼). 주소는 영어 그대로 (/projects …)
- 첫 화면: 3D 캠퍼스 지도가 배경(넓은 화면)이고, 오른쪽에 이름 GDGoC DGU · 짧은 소개 · 버튼 · 5기 모집 상태 (폰은 글자 → 지도). 건물 하나가 메뉴 하나입니다 (지도 = 메뉴 = 사이트맵)
- 디자인: [docs/DESIGN.md](docs/DESIGN.md) '캠퍼스 안내판' · 시안 E '지도는 표지, 나머지는 전시장'. 흰 종이 + 먹색 글자, 장소색은 '어디'에만, 주황은 '지금 기수'에만
- 내용: 지어낸 숫자 · 후기 · 사진 없이 **실제 기록**만 씁니다 (gdg.community.dev 행사, GitHub GDSC-DGU 프로젝트, 4기 일정). [docs/CONTENT.md](docs/CONTENT.md)
- 문구: 되도록 한글. 이름(GDGoC DGU, G-Sprint, 행사 정식 명칭)과 기술 이름만 영어

## 실행

Node.js 20.19 이상이 필요합니다.

```bash
npm install
npm run dev          # http://localhost:5173  (/api 는 localhost:8080 으로 넘김)
npm test             # 순수 로직 · 내용 검사 · 서버 응답 변환 테스트 (vitest)
npm run lint         # oxlint
npm run build        # 타입 검사 + 배포용 빌드 (dist/)
npm run sync:events  # gdg.community.dev 행사 목록을 src/content/events.json 에 반영 (운영진이 직접 실행)
```

## 화면

| 주소 | 내용 |
|---|---|
| `/` | 첫 화면: 3D 캠퍼스 지도를 배경으로 오른쪽에 이름 GDGoC DGU · 짧은 소개 · 지원 안내 버튼 · 5기 모집 상태 (건물을 누르면 그 자리에서 장소 미리보기, 폰은 글자 → 지도) → 팀으로 만들어 공개한 서비스(실제 화면 큰 타일 2장 + 나머지 전부 목록, 폰은 6개 먼저) → 어떻게 하나요(먹색 띠: 화요일 세션 · G-Sprint · 합동 세미나 + 다음 모임 표) → 5기에서 만나요(자주 묻는 질문 3개) |
| `/archive` | 아카이브 (예전 `/projects`, 그 주소는 여기로 옮김): 건물 앞 장면(안내판 = 목차) → 보기 탭 프로젝트 · 세미나. 프로젝트 = 기수 탭 → 전시실(대표 작품 크게 + 나머지 목록, 누르면 자세히 보기 창, `?p=<id>` 로 공유) → 4기 G-Sprint 띠. 세미나(`?view=seminars`) = 기수 거르기 · 찾기 → 기수별 발표 목록(최근 6개 + 더 보기) |
| `/about` | 소개 (예전 `/community`, 그 주소는 여기로 옮김): 소개 건물(지붕 화면에 다음 일정) → 우리는(1기부터 지금 기수까지 · 정기 세션 · G-Sprint · 연합 행사 · 그룹 멤버) → 이번 주(먹색) → 다가오는 일정 → 세 기수가 연 공개 행사(1년 달력) → 기수별 기록 |
| `/recruits` | 지원 안내 건물(모집 상태 · 5기 소식 받기 · 친구에게 알려 주기) → 지원 자격 → 들어오면 이런 한 해(달별 일정) → 네 파트(지난 프로젝트 로고) → 자주 묻는 질문 |
| `/teams` | 공사 중인 팀원 찾기 건물 → 팀원 찾기는 준비하고 있습니다(열리면 생길 것 세 줄) |
| `/admin` | 준비 중 (운영진 로그인 자리) |

모든 페이지는 옅은 회색 '5기에서 만나요'(JoinStrip) → 먹색 꼬리말(둘러보기 · 현재 위치 작은 지도 · 연락)로 끝납니다. /recruits 는 페이지 자체가 같은 내용이라 JoinStrip 없이 꼬리말로 바로 갑니다.

- 검색: 머리말 돋보기 또는 `⌘K` / `Ctrl+K`. 행사 · 프로젝트 · 자주 묻는 질문을 같이 찾습니다.
- 팀 기획 메모(들어갈 기능, 정할 것, 와이어프레임 번호)는 `npm run dev` 에서만 보입니다. 배포본에서 보려면 `VITE_SHOW_PLAN=true`.

## 폴더 구조

```
src/
  app/           주소와 페이지 연결 (홈 말고는 들어갈 때 받는다) · 페이지 전환
  content/       실제 기록 JSON (행사 · 프로젝트 · 기수 · FAQ · 챕터 · 모집) + 검사(validate.ts) + 홈 문구(story.ts)
  config/        사이트 설정. 장소(=메뉴), 문구 · 링크, G-Sprint 단계, 준비 중 페이지 계획
  domain/        데이터 모양 (types.ts)
  data/          데이터 창구(Repository) + 서버 데이터 훅(queries.ts, TanStack Query)
    snapshot/    기본 구현: src/content JSON 을 읽는다
    http/        Spring Boot 구현 + 응답 변환(adapters.ts) + 테스트
    mock/        테스트용 예시 데이터
  services/      검색 (키워드 + 같은 뜻 낱말. 나중에 서버 → Gemini 로 교체 가능)
  state/         지도 · 범례 · 검색이 같이 보는 상태 (useReducer + Context)
  lib/           화면과 상관없는 계산 (날짜, 일정, 학기 줄, 아이소메트릭, 장면 맞추기, 글자 다듬기). 테스트 있음
  hooks/         여러 곳에서 쓰는 훅
  styles/        디자인 토큰(tokens.css) · 전역 class(global.css: 면 · 버튼 · 링크)
  features/
    campus/      지도 (건물, 지붕, 깃발, 안내판, 나무, 걷는 사람, 꼬리말 작은 지도)
    placehero/   하위 페이지 머리: 지도의 그 건물 앞 장면 + 건물 안내판
    common/      시안 E 공통 부품: 이야기 섹션(StorySection) · 페이지 끝(JoinStrip) · 다음 모임 표(Ticket) · 로고 아이콘(IconTile). 쓰는 법은 README.md
    home/        홈 섹션들 + 장소 미리보기(PlacePopover)
    now/         장소 미리보기 '지금 4기는' · 커뮤니티 '학기 한눈에 · 달력' (학기 줄, 달력)
    layout/      머리말 · 꼬리말 · 검색 창 · 폰 메뉴
    glossary/    처음 보는 낱말 풀이 (G-Sprint(한 학기 팀 프로젝트))
    pages/       프로젝트 · 커뮤니티 · 지원 안내 · 준비 중 · 오류 페이지 + 공통 조각(PageParts: 참고 섹션 · 바깥 링크 · 거르기)
      projects/  전시실 카드 · 표지 · 자세히 보기 창 · 4기 G-Sprint 띠
      community/ 이번 주 · 다가오는 일정 · 1년 달력 · 기수별 기록 · 안내판 조각(호실 · 출처 한 줄)
      recruits/  지원 자격 · 들어오면 이런 한 해 · 네 파트 · 자주 묻는 질문 · 공유
public/project-images/   프로젝트 표지 · 화면 (팀 저장소 그림을 줄인 것)
scripts/sync-events.mjs   행사 목록 갱신
docs/DESIGN.md            디자인 원칙 (먼저 읽기)
docs/CONTENT.md           내용을 고치는 법 · 출처 규칙
docs/ARCHITECTURE.md      왜 이렇게 나눴는지
```

## 자주 하는 일

| 하고 싶은 것 | 고칠 곳 |
|---|---|
| 행사 추가 · 수정 | `npm run sync:events` 또는 `src/content/events.json` (출처 주소 필수, [CONTENT.md](docs/CONTENT.md)) |
| 프로젝트 추가 | `src/content/projects.json` (GitHub GDSC-DGU 저장소 기준) |
| 프로젝트 그림 추가 | 팀 저장소 그림을 webp 로 줄여 `public/project-images/` 에 두고 `projects.json` 의 `cover` · `images` 에 적기 ([CONTENT.md](docs/CONTENT.md)) |
| 팀이 확인한 그림만 보이게 | `src/features/pages/projects/exhibit.ts` 의 `SHOW_UNCLEARED_IMAGES` 를 `false` 로 |
| 5기 모집 일정이 정해지면 | `src/content/recruiting.json` 의 `current` |
| 멤버 수 · 연락처 · 데모데이 | `src/content/chapter.json` |
| 장소 이름 · 설명 · 색 | `src/config/places.ts` |
| 소개 문구 · 링크 | `src/config/site.ts` (null 이면 화면에서 숨김) |
| 새 지붕 모양 | `features/campus/roofs/` 에 컴포넌트 추가 → `roofs/index.ts` 와 `roofs/heights.ts` 에 등록 |
| Spring Boot API 붙이기 | `.env.local` 에 `VITE_DATA_SOURCE=http` → 주소는 `data/http/httpRepositories.ts`, 응답 모양 차이는 `data/http/adapters.ts` 에서 맞춤 |
| 준비 중 페이지를 실제로 만들기 | `features/pages/` 에 새 페이지 → `app/lazyPages.tsx` 와 `app/router.tsx` 의 `BUILT_ROUTES` 에 추가 → `config/pages.ts` 에서 계획 지우기 |

## 실제 정보가 필요한 것

화면에 지어낸 정보를 넣지 않으려고 비워 둔 자리입니다.

- 공식 로고 SVG (`features/layout/BrandMark.tsx` 자리 표시)
- 활동 사진 (챕터 드라이브 `01_4기/마케팅/행사 사진` 이 아직 비어 있음, 얼굴이 나온 사진은 동의 받은 것만)
- 프로젝트 그림 30장의 팀 확인 (`teamCleared`, 지금은 확인 전이지만 보이게 해 둠)
- 5기 모집 일정 · 선발 절차
- 4기 운영 계획 날짜(휴회 주, MT, 동지톤 등)는 팀 계획 기준이라 공개 행사 페이지가 올라오면 맞춰 봐야 합니다

## 팀에서 정할 것

이 레포의 구조는 하나의 제안입니다. G-Sprint FE 결정 사항과 맞춰 보세요.

- 폴더 구조 (기능별 `features/` 로 나눌지)
- 서버 데이터 관리: 지금은 TanStack Query (`data/queries.ts`). 같은 데이터를 여러 곳에서 써도 한 번만 부름
- 내용 관리: 지금은 저장소 JSON + 검사 테스트. 운영진이 글을 올리게 되면 관리자 페이지 + API 로 옮김
- 스타일 방식: 지금은 CSS Modules + 디자인 토큰(`styles/tokens.css`)
- CI/CD: 노션에 'GitHub Actions + Vercel' 메모가 있지만, 정해 둔 스택은 Firebase Hosting 입니다. 하나로 정리가 필요합니다
