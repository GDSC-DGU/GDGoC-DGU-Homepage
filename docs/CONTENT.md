# 콘텐츠 고치기 (운영진용)

사이트에 나오는 행사 · 프로젝트 · 기수 연혁 · 자주 묻는 질문은 모두 `src/content/` 의 JSON 파일에서 옵니다.
화면 코드는 고칠 필요가 없습니다. JSON 을 고치고 테스트를 돌린 뒤 올리면 됩니다.

## 1. 가장 중요한 규칙: 출처

- **모든 줄에 `source` 를 적습니다.** 공개 페이지 주소(https://…)이거나, 아직 공개 페이지가 없는 내부 계획이면 그 이름(`4기 운영 계획`)입니다.
- 직접 열어 본 공개 페이지에 있는 사실만 씁니다. 기억이나 '아마 그랬을 것'은 넣지 않습니다. 확인이 안 되면 빼 둡니다.
- 오해가 생길 수 있는 숫자에만 기준을 붙입니다 (`gdg.community.dev, 2026.10 기준`). 나머지 근거는 JSON `source` 에만 둡니다.
- 화면 문장 안에서는 가운뎃점(' · ') 대신 쉼표나 '와/과'를 씁니다. ' · '는 '날짜 · 장소' 같은 메타 줄에만 씁니다.
- '~을 모았습니다', '~을 안내합니다' 처럼 페이지가 자기를 설명하는 문장, '실제', '직접' 같은 강조, '정해지면 인스타그램에 가장 먼저 알립니다' 반복을 쓰지 않습니다.
- 모르면 비워 둡니다. 화면은 빈 칸을 숨기도록 만들어져 있습니다.
- 지어낸 예시 글(모집 글 · 후기 등)은 넣지 않습니다. 아직 열지 않은 게시판(팀원 찾기)은 예시 글 대신 '열리면 생길 것' 세 줄로 보여 줍니다 (`src/features/common/joinData.ts` 의 `TEAMS_WILL_HAVE`).

## 1-1. 문구 쓰는 법 (content.test.ts 가 검사)

- **조사는 붙여 씁니다**: `G-Sprint는`, `Camping Seminar를`, `TTS로`, `AI가`, `gdsc.dgu@gmail.com이나`, `@gdg.donggukuniv로`.
- **화면에 보이는 날짜는 점으로** 씁니다: `2026.08.18`, `2026.09.08–09.10`. `2026-08-18` 모양은 `date` · `start` 같은 날짜 필드에만 씁니다.
- **한 가지를 한 이름으로**: `Google 기술`(구글 X), `코어 멤버`(Core Member X), `Solution Challenge 2024`, `Solution Challenge 2025`, `Solution Challenge 2026`, `동국대 Dev Conference 2025`, 10.13 은 `킥오프`.
- 기수 연혁의 숫자는 센 만큼만: `Camping Seminar 공개 기록 8건`(events.json 의 그 기수 · 시리즈 줄 수), `Solution Challenge 2026 프로젝트 6개`(projects.json 의 그 기수 · 프로그램 줄 수).

## 2. 파일별 안내

| 파일 | 내용 | 주로 고치는 때 |
|---|---|---|
| `events.json` | 지난 행사 + 다가오는 일정 | 행사가 끝났을 때, 새 일정이 정해졌을 때 (`sync-events` 로 자동) |
| `projects.json` | 프로젝트 목록 | 데모데이 뒤, GitHub 저장소가 생겼을 때 |
| `seminars.json` | 세미나 발표 목록 (아카이브 '세미나' 보기) | 세미나가 끝났을 때, 백엔드가 발표 자료(PDF)를 올렸을 때 |
| `generations.json` | 기수 연혁 (1기 ~ 지금) | 기수가 바뀔 때 |
| `faq.json` | 자주 묻는 질문 | 모집 전 |
| `recruiting.json` | 다음 모집 날짜 · 지원서 주소 · 지난 모집 기록 | 모집 공지를 올릴 때 (날짜 세 칸) |
| `chapter.json` | 멤버 수, 오거나이저, 이메일, G-Sprint 숫자 | 학기마다 |

파일마다 맨 위에 `updatedAt` 이 있습니다. 고친 날짜(YYYY-MM-DD)로 바꿔 주세요. `events.json` 의 날짜는 사이트 아래쪽 '갱신' 표시에도 쓰입니다.

### events.json

한 줄에 행사 하나, **날짜순**으로 씁니다.

| 필드 | 뜻 | 예 |
|---|---|---|
| `id` | 바뀌지 않는 이름 (영어 소문자 · 숫자 · `-`) | `3rd-camping-12` |
| `date` | 한국 날짜 | `2026-03-20` |
| `endDate` | 여러 날 행사의 마지막 날 (하루면 안 씀) | `2027-01-31` |
| `title` | 화면에 보이는 짧은 한글 제목 | `Camping Seminar 12회`, `2기 데모데이` |
| `originalTitle` | 게시된 원래 제목 그대로 | `GDG on Campus DGU 12th Camping Seminar` |
| `kind` | 종류 (아래 표) | `session` |
| `place` | 눌렀을 때 열 장소 (아래 표) | `community` |
| `generation` | 몇 기 활동인지 (9월 시작 학년 기준) | `3` |
| `series` | 이어지는 행사 이름 | `Camping Seminar` |
| `venue` | 장소 (건물 + 호실) | `정보문화관 P404` |
| `url` | 자세히 보기 주소 | gdg.community.dev 행사 상세 페이지 |
| `source` | 출처 | 상세 페이지 주소 또는 `4기 운영 계획` |

| kind | 언제 | place |
|---|---|---|
| `recruit` | 모집 · OT | `recruits` |
| `session` | 세미나 · 스터디 · 파트 세션 | `community` |
| `event` | 연합 행사 · 컨퍼런스 · 피크닉 · 해커톤 | `community` (팀원 모집 게시판을 열기 전까지는 해커톤도 여기) |
| `sprint` | G-Sprint 단계 (킥오프 · 중간 발표 · 데모데이) | `projects` |
| `project` | G-Sprint 밖 프로젝트 발표 · 데모데이 | `projects` |
| `notice` | 공지 | 알맞은 곳 |
| `rest` | 휴회 (시험 기간) | `community` |

제목 쓰는 법

- 이름은 영어 그대로 둡니다 (Camping Seminar, Open Seminar, Alumni Seminar, Solution Challenge).
- 회차는 게시된 제목의 숫자를 그대로 따릅니다. 2기 제목은 `2st · 3st …` 처럼 적혀 있지만 `2회 · 3회` 로 씁니다. 원래 제목은 `originalTitle` 에 남깁니다.
- Demo Day 는 한글 제목에서 `데모데이` 로 씁니다.
- 운영 계획 일정은 공개 페이지가 생기면 `url` · `source` 를 그 주소로 바꿉니다 (`sync-events` 가 같은 날 · 같은 장소면 자동으로 합칩니다).

### projects.json

| 필드 | 뜻 |
|---|---|
| `id` | 바뀌지 않는 이름 |
| `name` | 프로젝트 이름 (README 의 이름) |
| `summary` | 짧은 ~습니다체 한두 문장. **README 에 있는 내용만.** README 에 설명이 없으면 비웁니다 |
| `program` | 어떤 프로그램에서 만들었는지 (`Solution Challenge 2024`, `Solution Challenge 2025`, `Solution Challenge 2026`, `G-Sprint` …) |
| `year` | 연도 |
| `generation` | 몇 기 (아래 규칙) |
| `stack` | 기술 4개까지 (README 나 GitHub 언어 표시 기준) |
| `repo` | GitHub GDSC-DGU 저장소 (팀 저장소가 여럿이면 대표 하나). 개인 저장소 주소는 적지 않습니다 |
| `url` | 실제로 열리는 서비스 주소만 (웹 · 스토어). 시연 영상 · APK 파일 링크는 넣지 않습니다 |
| `status` | `done` 또는 `in-progress` |
| `source` | 확인한 저장소 주소 (또는 `4기 G-Sprint`) |

GitHub 숫자와 그림 (모두 선택. 없으면 화면이 알아서 줄입니다)

| 필드 | 뜻 |
|---|---|
| `members` | 팀원 이름 목록 (자세히 보기 창 '팀원' 줄). 본인이 고른 표기 그대로, 공개해도 된다고 확인한 것만 |
| `contributors` · `commits` | 대표 저장소(`repo`)의 기여자 수 · 커밋 수 (기록용, 화면에는 쓰지 않는다) |
| `firstCommit` · `lastCommit` | 대표 저장소의 첫 · 마지막 커밋 날짜 `YYYY-MM-DD` (표지의 기간) |
| `languages` | GitHub 언어 비율 `[{ "name": "Dart", "share": 90.5 }]` (표지 아래 막대) |
| `statsAsOf` | 위 숫자를 확인한 날 |
| `demo` | README 에 걸린 시연 영상 주소 |
| `cover` | 표지 그림 한 장. 없으면 이름 · 기간 · 언어 비율로 '글자 표지'를 그립니다 |
| `images` | 자세히 보기 창에 더 보여 줄 그림 (화면 캡처 · 구조도) |

그림 한 장(`cover` · `images` 의 한 줄)은 `{ src, alt, caption?, kind, width, height, source, teamCleared }` 입니다.

- 파일은 **팀 저장소(GDSC-DGU 조직)나 챕터 노션 '전 기수 데이터 모음집'에 있는 그림만** 줄여서(가로 960px 이하, webp) `public/project-images/` 에 둡니다. `src` 는 앞에 `/` 없이 `project-images/이름.webp`.
- `source` 는 원본 그림의 GitHub 주소, 노션 모음집에서 가져왔으면 그 줄의 노션 주소(`https://app.notion.com/p/...`). 바깥 서버(S3, 스토어 등)에 있는 그림, 사람 얼굴 · 이메일이 보이는 그림은 넣지 않습니다.
- `kind`: `screen`(화면) · `mobile`(폰 화면) · `promo`(팀 소개 이미지) · `diagram`(구조도 · ERD) · `logo`.
- `teamCleared`: 팀이 게시를 확인했는지. 지금은 모두 `false` 지만 화면에는 보입니다 (`src/features/pages/projects/exhibit.ts` 의 `SHOW_UNCLEARED_IMAGES = true`). 확인된 그림만 보이게 하려면 이 값을 `false` 로 바꿉니다.

끝난 프로젝트는 `repo` 나 `url` 중 하나가 꼭 있어야 합니다. 진행 중인 프로젝트는 공개 주소가 없으면 비워 둡니다 (예: 개인 저장소에서 만드는 홈페이지 리뉴얼).
빈 저장소(README · 파일 없음)는 넣지 않습니다.

**공개 프로젝트 숫자**는 `src/content/index.ts` 의 도우미로 셉니다. 화면에서 직접 거르지 마세요.

| 이름 | 뜻 |
|---|---|
| `PUBLIC_PROJECTS` | `repo` 가 `https://github.com/GDSC-DGU/` 아래인 프로젝트 (진행 중 · 개인 저장소 제외) |
| `isPublicProject(p)` | 같은 기준의 판별 함수 (서버에서 받은 목록을 셀 때) |
| `projectsBasis` | 숫자 옆 기준 문구 `GitHub GDSC-DGU 기준` |

**기수 정하는 규칙**: 프로그램이 열린 시기로 정합니다. 기수는 9월에 시작해 다음 해 7월에 끝납니다 (1기 2023.09–2024.07, 2기 2024.09–2025.07, 3기 2025.09–2026.07, 4기 Organizer 확인). Solution Challenge는 해마다 초에 열려서, 그해 1–7월에 활동하는 기수가 참여합니다.

| 프로그램 | 시기 | 기수 |
|---|---|---|
| Solution Challenge 2024 (`2024-SolutionChallenge-*`) | 2024년 상반기 | 1기 (GDSC) |
| GDSC DGU 웹사이트 (`gdsc-dgu`, README 2024.03) | 2024년 3월 | 1기 |
| Solution Challenge 2025 (`2025-APAC-SolutionChallenge-*`, 화면에는 APAC 를 쓰지 않는다: 4기 Organizer 2026-11) | 2025년 상반기 | 2기 |
| 2025 동국대 봄 축제 웹사이트 (`DGU-2025-Festival-*`) | 2025년 봄 | 2기 |
| Solution Challenge 2026 (`2026-SDGs-Project-*`, 저장소 이름은 SDGs Project. `ecofont` · `artrun-be` 도 3기 SDGs 프로젝트: 4기 Organizer 확인 2026-11-05) | 2026년 상반기 | 3기 |
| 하투-시그널 (`heart-signal-server`, 노션 '팀 프로젝트') | 2023.10–2024.01 | 1기 |
| G-Sprint (홈페이지 리뉴얼) | 2026년 가을 | 4기 |

`GDGoC-DGU-Website` 는 마지막 수정이 2025.09 라는 것만 확인돼서 기수를 비워 두었습니다.

### generations.json

| 필드 | 뜻 |
|---|---|
| `n` | 기수 번호. 1부터 빠짐없이 |
| `name` | 그때 이름. 1기 `GDSC DGU` (GitHub 저장소가 'GDSC Solution Challenge'), 2기부터 `GDGoC DGU` (gdg.community.dev 2기 행사가 'GDG on Campus DGU') |
| `start` | 첫 공개 행사(OT)가 있던 달 `YYYY-MM`. 공개 기록이 없으면 비움 (1기) |
| `end` | 마지막으로 확인된 공개 행사의 달. 지금 기수는 비움 |
| `summary` | 한 줄 (~습니다체) |
| `highlights` | 대표 기록 2~4개. events · projects 에 있는 것만 |
| `current` | 지금 기수에만 `true` (딱 하나) |
| `source` | 출처 주소 목록 |

새 기수가 시작되면: 이전 기수의 `current` 를 지우고 `end` 를 채운 뒤, 새 기수를 맨 아래에 `current: true` 로 더합니다.

### faq.json

`id`, `q`(물음표로 끝남), `a`(짧은 ~습니다체, `니다.` 로 끝남), `source`. 5~7개가 알맞습니다.
`id` 는 바꾸지 않습니다. 홈 · 다른 페이지가 `/recruits#faq-who` 처럼 질문 하나를 바로 가리킵니다 (그 질문이 든 탭이 열리고 답이 펼쳐집니다).
지원 자격 · 정기 모임 시간은 Linktree 의 4기 일반 멤버 지원서(`https://forms.gle/LmwqYrdkyrtuvAmX6`, 마감 뒤에도 안내문이 열림) 기준입니다. 시험 기간 휴회는 4기 운영 계획 기준입니다.

### recruiting.json

**5기 모집이 정해지면: `opensAt` · `deadline` · `applyUrl` 세 칸만 채우면 홈 · 머리말 · 지원 안내가 같이 바뀝니다.**
모집 상태는 손으로 바꾸지 않습니다. 날짜를 보고 화면이 알아서 정합니다 (`src/content/recruitingStatus.ts` 의 `recruitStatus(today)`).

```json
"current": {
  "generation": 5,
  "opensAt": "2027-08-20",
  "deadline": "2027-09-05",
  "applyUrl": "https://forms.gle/…",
  "channel": "https://www.instagram.com/gdg.donggukuniv/"
}
```

| 필드 | 뜻 | 비워 두면 |
|---|---|---|
| `generation` | 모집하는 기수 | (꼭 적음) |
| `opensAt` | 지원서를 받기 시작하는 날 `YYYY-MM-DD` (한국 날짜, 그날부터 '모집 중') | 일정 미정 |
| `deadline` | 마지막 날 `YYYY-MM-DD` (그날 밤까지 '모집 중', 다음 날부터 '마감') | 마감 없이 계속 '모집 중' |
| `applyUrl` | 지원서 주소 (`https://`). 모집 중일 때 주 버튼 '지원서 쓰기' 가 이 주소로 갑니다 | 주 버튼은 '5기 소식 받기'(인스타그램), 리드에 '지원 방법은 모집 공지에' |
| `channel` | 소식 채널 (인스타그램). '5기 소식 받기' 버튼 · 폰 메뉴가 이 주소로 갑니다 | (꼭 적음) |

비운 칸은 `null` 로 둡니다. 날짜에 따라 화면은 네 가지로 바뀝니다.

| 상태 | 언제 | 지원 안내 머리 | 주 버튼 |
|---|---|---|---|
| 일정 미정 | `opensAt` · `deadline` 모두 비어 있음 | 5기 모집은 아직 열리지 않았습니다 + 지난 4기 모집 시기 | 5기 소식 받기 |
| 곧 열림 | 오늘 < `opensAt` | 5기 모집은 08.20에 열립니다 + D-n | 5기 소식 받기 |
| 모집 중 | `opensAt` ≤ 오늘 ≤ `deadline` | 5기 모집 중 · 09.05 마감 + D-n | 지원서 쓰기 (`applyUrl`) |
| 마감 | 오늘 > `deadline` | 5기 모집이 마감됐습니다 | 5기 소식 받기 |

- 날짜 모양이 틀리면(없는 날, `deadline` 이 `opensAt` 보다 앞) 그 칸은 없는 것으로 보고, `npm test` 가 `recruitingProblems` 로 알려 줍니다.
- `status` · `message` 는 예전 필드입니다. 아직 읽는 곳(지도 미리보기 문장 · 건물 장면의 문 기본값 · 스냅샷 데이터)이 있어 남겨 두었고, 날짜 세 칸이 우선입니다. 모집을 열 때는 `status` 도 `open` 으로 바꿔 두면 안전합니다.
- 모집을 열 때 `faq.json` 의 `when-recruit` · `how-to-apply` 답도 5기 내용으로 고쳐 주세요 (답은 날짜로 바뀌지 않습니다).
- 모집과 OT가 끝나면: `current` 의 날짜 세 칸을 `history` 의 새 기수 단계로 옮기고, `generation` 을 하나 올린 뒤 세 칸을 `null` 로 비웁니다.

`history[].steps` 는 시작한 날 순서로 씁니다. 한 단계: `id`, `label`(한글, 예: `마케팅 코어 모집`), `start`, `end`(여러 날이면), `source`, `note`(선택, 예: `면접 2026.09.11 · 최종 발표 2026.09.12`).
가장 최근 기수의 단계(OT 제외)가 '지난 4기는 2026.08–09에 모집했습니다' 의 기간이 됩니다.

### photos.json (행사 사진)

**얼굴이 보이는 사람 모두에게 웹 공개 동의를 받은 사진만** 넣습니다. `consent` 가 없거나 비어 있으면 화면에 나오지 않고 `npm test` 가 실패합니다.
사진이 한 장도 없으면 사진 자리는 그리지 않습니다. 지금은 챕터 드라이브의 1기(2023–24) 행사 사진 14장이 있습니다 (공개 확인: 4기 Organizer 2026-11-06).
슬라이드나 화면에 이름 · 연락처 · 생일 같은 개인 정보가 보이는 사진은 넣지 않습니다 (1기 웰컴세션 자기소개 슬라이드 사진 한 장을 이 이유로 뺐습니다).

```json
{ "id": "2026-09-ot", "src": "photos/2026-09-ot.webp", "alt": "4기 OT에서 조별로 자기소개하는 멤버들", "width": 1600, "height": 1067,
  "date": "2026-09-15", "event": "4기 OT", "generation": 4, "consent": { "date": "2026-09-20", "by": "4기 Organizer 이도윤" } }
```

- 파일은 `public/photos/` 에 1600px 폭 webp 로 둡니다 (`src` 는 `photos/파일.webp`). 외부 주소면 `https://`.
- `alt` 는 사진에 무엇이 있는지 한 문장 (읽기 프로그램용). `event` · `date` 는 사진 아래 한 줄이 됩니다.
- 쓰는 곳
  - 하위 페이지 첫 화면 큰 사진: 페이지마다 `PageHero` 의 `photoId` 로 한 장씩 고른다 (소개 · 아카이브 · 지원하기 · 팀원 찾기 · 준비 중 페이지).
  - 홈 지도 미리보기 맨 위 세 장: `features/home/placePhotos.ts` 에서 장소마다 id 를 고른다.
  - 홈 '행사 사진': 최근 사진부터 4장.
  - 소개 '기수별 기록': 고른 기수의 사진 6장까지 (사진이 있는 기수만).
  - 아카이브 세미나: 같은 기수 · 같은 날 사진이 있으면 그 날짜 칸에 한 장 (`date` 가 발표 날과 정확히 같을 때만).

### 계획 일정이 지나면

`events.json` 의 `4기 운영 계획` 일정(공개 행사 페이지 없음)은 날짜가 지나도 공개 페이지가 생기지 않으면 **화면에서 빠집니다** (`src/content/plan.ts` 의 `isStalePlan`).
열렸는지 확인되지 않은 일정을 '지난 일정' 이나 '계획' 으로 남기지 않기 위해서입니다. 실제로 열렸다면 공개 페이지 주소를 `url` · `source` 에 적어 주세요 (`sync-events` 가 같은 날 · 같은 장소면 자동으로 합칩니다).

### 출처를 화면에 보이는 곳

출처는 JSON 의 줄마다 적고, 화면에는 보이지 않습니다 (2026-11-05 AI 티 점검: 페이지 끝 '출처 … 4기 Organizer 확인 · 갱신' 줄은 보고서처럼 읽혀 지웠습니다). 오해가 생길 수 있는 숫자(챕터 페이지 가입자 수 같은)에만 짧은 기준을 붙입니다.

## 3. 확인하기

```bash
npx vitest run src/content          # 콘텐츠 검사만 (몇 초)
npm test                            # 전체
```

검사하는 것: id 중복, 날짜 모양(없는 날짜 포함), `endDate ≥ date`, 날짜순, 모든 줄의 출처, 기수와 날짜가 맞는지,
종류와 장소가 맞는지, 기수 1..N 연속 · 지금 기수 하나, 끝난 프로젝트의 repo/url, 기술 4개 이하, FAQ 말투,
조사 띄어쓰기 · 날짜 표기 · 한 이름 규칙(1-1), 연혁 숫자와 실제 줄 수, 공개 프로젝트 기준, 예시 글이 없는지.
틀린 줄은 화면에서 빠지고, 테스트가 `파일 · 몇 번째 줄 · 무엇이 틀렸는지` 를 보여 줍니다.

## 4. gdg.community.dev 행사 받아오기

`scripts/sync-events.mjs` 가 챕터 페이지의 지난 행사 · 다가오는 행사를 받아 `events.json` 에 합칩니다 (Node 20 이상, 운영진 컴퓨터나 CI 에서).

`package.json` 의 `scripts` 에 한 줄을 더해 두면 편합니다.

```json
"sync:events": "node scripts/sync-events.mjs"
```

```bash
npm run sync:events -- --dry-run   # 무엇이 바뀌는지만 보기 (파일 그대로)
npm run sync:events                # events.json 고치기
npm run sync:events -- --prune     # 챕터 페이지에서 사라진 행사도 지우기
npx vitest run src/content         # 받은 뒤 꼭 검사
```

합치는 규칙

1. 출처가 gdg.community.dev 가 아닌 줄(`4기 운영 계획` 등)은 그대로 둡니다.
2. 이미 있는 행사(같은 상세 페이지 주소)는 사람이 다듬은 값(id · 한글 제목 · 종류 · 장소 · 기수 · 시리즈 · 장소명)을 지키고, 날짜와 원래 제목만 새로 받습니다.
3. 운영 계획 일정과 같은 날 · 같은 장소인 공개 행사가 생기면 한 줄로 합칩니다 (id · 한글 제목은 계획 쪽, 주소 · 출처는 공개 페이지).
4. 새 행사는 제목으로 종류 · 장소를 어림하고, 기수는 날짜로 정합니다. **받은 뒤 새 줄의 `title` · `kind` · `place` · `venue` 를 한 번 확인해 주세요.**
   스크립트는 해커톤을 아직 `teams` 로 어림합니다. `community` 로 고쳐 주세요. 같은 이유로 운영 계획의 `동지톤`(community)과 공개 페이지(teams)가 자동으로 합쳐지지 않을 수 있으니, 두 줄이 생기면 한 줄로 합쳐 주세요.
5. 응답에 없는 공개 행사는 기본으로 남깁니다 (다른 챕터가 연 공동 행사 등). 지우려면 `--prune`.

주의: gdg.community.dev 의 `/api/` 는 검색 로봇에게 막혀 있는 주소라, 사람이 직접 돌리는 이 스크립트에서만 씁니다. 사이트(브라우저)는 이 주소를 부르지 않고 저장소의 JSON 만 읽습니다.

## 5. 지금 스냅샷 (2026-10-17 확인)

- 행사: 2기 17개 · 3기 24개 · 4기 13개 (지난 4개 + 운영 계획 9개). 모두 gdg.community.dev 행사 상세 페이지를 열어 확인했습니다.
- 프로젝트: 24개 = 공개 23개(GitHub GDSC-DGU 저장소 README 확인) + 진행 중 1개(홈페이지 리뉴얼, 개인 저장소라 주소 없음).
- 빈 저장소라 뺀 것: `2026-SDGs-Project-healthgotchi` (2026.10.17 확인).
- 확인하지 못해 뺀 것: 2기 2024-09-26 OT · 2024-11-21 Open Seminar · 2024-11-28 Bonfire, 3기 2025-11-28 Bonfire · 2026-01-29 건국대 · 동국대 · 숙명여대 Inter-Chapter Session · 2026-02-06~07 GDGoC 연합해커톤 ONE WAVE(동국대 참여 여부) · 2026-05-08 한강 피크닉 · 2026-05-29 SDGs 중간발표 · 2026-06-26 3기 데모데이 · 수료식.
  상세 페이지 주소를 찾으면 그 주소를 `url` · `source` 로 적어 더해 주세요.
- 2026-11-04: 노션 '전 기수 데이터 모음집'(4기 백엔드 팀 정리)을 보고 `ecofont`, `artrun-be`, `heart-signal-server` 를 더했습니다 (프로젝트 27개). Eco-Font · RunSketch 는 3기 SDGs 프로젝트라 `Solution Challenge 2026`(4기 Organizer 확인 2026-11-05), 하투-시그널은 노션에 'project' 로만 적혀 있어 '팀 프로젝트'. `ecofont` 의 서비스 주소(ecofont.vercel.app)는 2026-11-04 에 404 라 `url` 을 비웠습니다.
- 2026-11-04: 1기 E&I · 하랑 · sMiLe · SmileLens 의 소개 이미지, Circulo 발표 자료 첫 장을 노션 모음집에서 표지로 넣었습니다.
- 세미나: 1–3기 104개 (`seminars.json`, 노션 '전 기수 데이터 모음집'). 발표 자료 주소 `fileUrl` 은 백엔드가 R2 에 올리면 채웁니다. 비어 있으면 '자료 보기'를 걸지 않습니다.
