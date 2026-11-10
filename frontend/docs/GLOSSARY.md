# GDGoC DGU 홈페이지 단어장

이 저장소에서 쓰는 말을 한곳에 모았습니다. 문서 · 일감(issue) · 커밋 · 코드 주석 · 리뷰는 이 말을 씁니다.
같은 것을 부르는 다른 말은 _피함_ 에 적었습니다. 화면에 보이는 용어 풀이는 `src/content/glossary.ts` 가 따로 맡습니다 (이 문서는 만드는 사람용).

## 동아리

**GDGoC DGU**:
동국대학교 Google Developer Groups on Campus 챕터. 2기부터 이 이름을 쓰고, 1기는 GDSC DGU 였습니다.
_피함_: GDSC (1기를 말할 때만), 구글 동아리

**기수**:
9월에 시작해 다음 해 7월에 끝나는 한 해의 활동 단위. 프로그램이 열린 시기로 정합니다 (docs/CONTENT.md 4장).
_피함_: 학기 (기수와 다름), 연도

**Organizer**:
그 기수의 챕터를 이끄는 사람. 4기 Organizer 의 확인은 문서에 '4기 Organizer 확인 (날짜)'로 남깁니다.
_피함_: 회장, 리드

**코어 멤버**:
파트마다 세션을 맡아 이끄는 멤버. 일반 멤버보다 먼저 뽑습니다.
_피함_: Core Member, 운영진

**파트**:
Frontend, Backend, AI/ML, Product Design 같은 공부 묶음. 정기 세션은 파트별로 나뉩니다.
_피함_: 트랙, 분과

**정기 세션**:
매주 화요일 18:00 에 파트별로 모이는 실습 모임 (4기).
_피함_: 정기 모임, 스터디 (스터디는 팀원 찾기의 글 종류)

## 프로그램

**G-Sprint**:
4기의 한 학기 팀 프로젝트. 킥오프에서 시작해 데모데이에서 끝납니다.
_피함_: 스프린트, 해커톤

**킥오프**:
G-Sprint 를 여는 날 (10.13).
_피함_: 발대식, 시작일

**데모데이**:
팀이 만든 서비스를 시연하는 날 (4기는 12.29). 성과공유회를 겸합니다.
_피함_: 발표회, 최종 발표

**세미나**:
멤버가 주제를 정해 발표하는 한 꼭지. 1~3기 기록은 `content/seminars.json`.
_피함_: 세션 (세션은 그날 모임 전체)

**Camping Seminar · Study Jam · Solution Challenge · 동홍동락 · 동지톤**:
지난 기수의 행사 · 프로그램 이름. 풀이는 `content/glossary.ts`, 이름은 docs/CONTENT.md 1-1 의 '한 가지를 한 이름으로'를 따릅니다.

## 사이트 구조

**장소 (place)**:
`config/places.ts` 의 한 줄. 메뉴 하나 · 지도 건물 하나 · 이름표 하나 · 미리보기 하나가 됩니다.
코드 이름과 화면 이름이 다르니 주의합니다.

| 코드 `PlaceId` | 화면 이름 | 주소 |
|---|---|---|
| `about` | 홈 (GDGoC DGU) | `/` |
| `community` | 소개 | `/about` |
| `projects` | 아카이브 | `/archive` |
| `recruits` | 지원하기 | `/recruits` |
| `teams` | 팀원 찾기 | `/teams` |

_피함_: 페이지 id 와 주소를 섞어 부르기 ('about 페이지'는 홈인지 소개인지 모호합니다. 화면 이름으로 부릅니다)

**지도**:
홈 첫 화면의 캠퍼스 그림. 건물이 곧 메뉴입니다 (`features/campus`, `features/home/HeroSection.tsx`).
_피함_: 3D 맵, 히어로 이미지

**미리보기**:
지도 건물을 누르면 열리는 작은 창 (`features/home/PlacePopover.tsx`). 넓은 화면은 떠 있는 창, 폰은 아래에서 올라오는 시트.
_피함_: 팝업, 팝오버 (코드 이름은 popover 그대로 둔다)

**자세히 보기 창**:
아카이브에서 프로젝트를 누르면 열리는 창 (`?p=<id>`, `features/pages/projects/ProjectSheet.tsx`).
_피함_: 모달, 상세 페이지

**회고**:
멤버가 남긴 한마디 카드 (`content/story.ts` 의 voices). 공개 동의가 있는 것만 보입니다.
_피함_: 후기, 리뷰, testimonial

**검정 띠**:
페이지 사이에 섹션 단위로 칠하는 먹색 면 (`--band-bg`, `data-band="dark"`). 머리말이 그 위에 있으면 머리말도 검정으로 바뀝니다.
_피함_: 다크 섹션, 배너 (배너는 아래 '검정 띠 카드')

**검정 띠 카드**:
아카이브 · 팀원 찾기 머리 아래의 링크 한 장 (`PageHero` 의 `banner`). 한 줄 문장 + 오른쪽 끝 꺾쇠.
_피함_: 히어로 배너, 공지 카드

**dcamp 부품**:
dcamp.kr 구성을 따라 만든 부품 (`src/features/dcamp/`). `DarkHero`(소개 맨 위 검정 머리) · `Evolution`(Our Evolution 기수 줄) · `MissionBand`(사진 한 면 + Mission) · `WorkCards`(How We Work 카드) · `ProgramHero`(지원하기 머리 + 정보 카드 셋) · `DarkProgram`(지원하기 검정 띠 + 주요 활동) · `QuoteRow`(지원하기 회고 줄) · `Process`(지원 절차 01~04) · `StickyCta`(아래 고정 띠). 공통 부품은 `src/features/common/` (`StorySection` · `JoinStrip` · `PhotoStrip`, README.md).

**스냅샷**:
서버가 없을 때 쓰는 저장소 안 JSON (`content/*.json`, `data/snapshot`). 서버가 생기면 `data/http` 로 바뀝니다.
_피함_: 목업 (목업은 `data/mock`, 개발용)

## 디자인 · 움직임

**토큰**:
`src/styles/tokens.css` 의 이름 붙은 값 (색 · 크기 · 시간 · 곡선). 화면 CSS 는 색 · 시간을 토큰으로만 씁니다.
_피함_: 변수, 테마값

**움직임 9가지**:
이즈 아웃 · 이즈 인 · 스프링 · 바운스 · 순차 등장 · 페이드 · 슬라이드 · 확대 전환 · 공유 요소 전환. 어디에 썼는지는 아래 표.

| 이름 | 토큰 | 쓰는 곳 |
|---|---|---|
| 이즈 아웃 | `--ease-out` | 열림 · 나타남 (미리보기, 검색 창, 폰 메뉴, 자세히 보기 창) |
| 이즈 인 | `--ease-in` | 닫힘 · 사라짐. 열림보다 짧게 (`--dur-short-exit` 150ms, `--dur-long-exit` 280ms) |
| 스프링 | `--ease-spring` | 팀원 찾기 '모집 중만 보기' 손잡이, 지도 미리보기 열림 (0.96 → 1) |
| 바운스 | `--ease-bounce` | 홈 '4기의 1년' 의 '지금' 이름표 (보일 때 한 번, 마우스를 올리면 한 번) |
| 순차 등장 | `--stagger` 40ms | 페이지마다 한 곳: 홈 멤버 세미나 · 소개 How We Work · 지원하기 주요 활동 · 아카이브 G-Sprint 단계 (`hooks/useStaggerReveal.ts`) |
| 페이드 | `.fade-in` | 탭 패널 (FAQ · 아카이브 보기 · 기수), 링크 복사 알림, 검색 결과 |
| 슬라이드 | `--dur-long` | 폰 메뉴가 오른쪽에서 들어오고 오른쪽으로 나간다 |
| 확대 전환 | View Transition `sheet-box` | 목록의 프로젝트 줄 → 자세히 보기 창 |
| 공유 요소 전환 | View Transition `sheet-media` | 대표 프로젝트 그림 → 창 맨 위 그림 |

그 밖에 전부터 있던 움직임: 페이지를 옮길 때의 좌우 밀기(`app/viewTransitions.ts`), 홈 스크롤 이야기(`features/motion`, GSAP), 로고 글자 열림, 지도 손글씨 메모 긋기(rough-notation), 카드 · 그림 hover. 모두 transform · opacity 이고 튕기지 않습니다.
_피함_: 애니메이션 (어느 것인지 이름으로 부른다)

**이름표 (eyebrow)**:
제목 위에 얹는 작은 분류 글자. 이 사이트는 쓰지 않습니다 (hallmark 54, impeccable).
_피함_: 키커, 라벨

## 작업

**일감**:
`docs/work/<날짜-주제>/issues/NN-*.md` 의 한 파일. 끝까지 만들어 확인할 수 있는 얇은 한 조각이고, `Blocked by` 로 순서를 적습니다.
_피함_: 티켓, 태스크

**스펙 (기획서)**:
`docs/work/<날짜-주제>/spec.md`. 문제 · 해결 · 사용자 이야기 · 결정 · 범위 밖을 적은 한 장. 두 말은 같은 것을 가리킵니다.
_피함_: PRD

작업 순서는 [WORKFLOW.md](WORKFLOW.md).
