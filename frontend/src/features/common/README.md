# 공통 부품 (시안 E)

규칙은 `docs/DESIGN.md` (특히 4 · 5 · 7 · 9-2장). 여기는 쓰는 법만 적습니다.
부품 파일은 고치지 말고, 바꿀 점이 있으면 자기 모듈 CSS 로 덮거나 NOTES.md 에 적어 주세요.

```tsx
import { IconRow, JoinStrip, StorySection, Ticket, projectIcon } from '@/features/common'
```

## StorySection: 이야기 섹션

주장 제목 → 한 줄 | 오른쪽 행동 하나 → 내용(12칸 전체). 제목 위 이름표(eyebrow)는 없습니다 (AI 티 점검 2026-11-05).

```tsx
<StorySection
  id="projects"                         // 섹션 id. h2 id 는 'projects-title' (aria-labelledby 자동)
  tone="paper"                          // 'paper'(기본) | 'field'(옅은 회색) | 'dark'(먹색)
  title={<>팀으로 만들어 공개한 서비스 <span className="num">{done}</span>개</>}  // 질문형 금지, 숫자는 계산
  sub="20개는 Google Solution Challenge에서 만들었습니다."
  action={<Link className="link-go" to="/projects">프로젝트 모두 보기</Link>}
  // titleSize="section" | "display"    // 기본: dark 는 display(64), 나머지 section(48)
>
  {/* 내용 */}
</StorySection>
```

- 페이지 틀(`<div className="container">`) 안에 넣어도, `main` 바로 아래(홈)에 넣어도 됩니다. field · dark 바탕은 화면 끝까지 칠해집니다.
- 간격은 알아서 맞습니다: 흰 → 흰은 여백 하나, 면이 바뀌면 바깥 여백 0, 페이지 머리(PlaceHero) 바로 다음 field · dark 는 24px.
- 홈 첫 화면 바로 다음 섹션처럼 위 · 아래 여백만 바꾸려면 `className` 을 넘기고 자기 모듈에서 변수만 정하세요: `.projects { --story-top: calc(var(--story-pad) - 40px); }` (`padding` 을 직접 덮으면 CSS 순서에 따라 지는 수가 있습니다).
- 머리 → 내용 간격은 같은 방식으로 `--story-head-gap` 을 정합니다 (기본 `--head-gap` 56 / 44 / 28).
- 보이는 머리 없이 그림부터 시작하는 섹션(/projects 전시실)은 `<section className="story paper" aria-labelledby="x-title">` + `visually-hidden` h2 로 직접 짭니다 (StorySection 은 머리가 있는 섹션용).
- 머리 옆에 다른 것을 나란히 두는 등 틀을 직접 짜야 하면 `StoryHead` 만 쓸 수 있습니다 (JoinStrip · 커뮤니티 '이번 주'가 그 예): `<section className="story field" aria-labelledby="x-title">` 안에 `<StoryHead titleId="x-title" tone="field" … />`. 면 class 는 `story paper` · `story field` · `story dark on-dark` 중 하나. 페이지 틀(.container) 안에서는 안쪽에 또 `.container` 를 두지 마세요 (StorySection 은 이것을 알아서 처리합니다).

## JoinStrip: 페이지 끝 '{gen}기에서 만나요'

`<main>` 맨 끝(페이지 컴포넌트의 마지막 요소)에 직접 넣습니다. 바로 아래 먹색 꼬리말이 여백 없이 붙습니다.

```tsx
<JoinStrip />                    // 홈 · /projects · /community
<JoinStrip variant="teams" />    // /teams: 질문 자리에 '열리면 생길 것' 세 줄, 제목 '팀원 찾기는 준비하고 있습니다'
// /recruits 에는 넣지 않습니다
```

- 주 버튼: 모집 중이고 지원서 주소가 있으면 '지원서 쓰기', 아니면 '{gen}기 소식 받기' (홈 첫 화면 두 번째 버튼과 같은 링크). 두 번째 버튼 '지원 안내 보기' → /recruits.
  꼬리말에는 이 행동을 다시 두지 않습니다 (꼬리말 '연락'에는 '인스타그램 @…' 처럼 채널 이름만).
- 모집 상태 문장 · 자주 묻는 질문은 홈과 같은 것: `content/story.ts` 의 `CLOSING`, `features/home/homeData.ts` 의 `closingStatusLine` · `pickFaqs` 를 import 합니다. **홈 담당은 이 셋의 이름 · 모양을 유지해 주세요.**
- 문구를 바꿀 때만 `eyebrow` · `title` · `sub` 를 넘깁니다. id 는 기본 `join`.
- JoinStrip 뒤에 다른 것을 두면(개발 화면의 '팀 기획 메모' 등) 꼬리말 위에 흰 여백이 생깁니다. 그런 것은 JoinStrip 앞에 두세요.
- 창(`<dialog>`) · 숨은 요소도 JoinStrip 앞, 그리고 이야기 섹션 **사이가 아니라 섹션 안**에 둡니다. 먹색 띠 → JoinStrip 사이 여백 0 은 `.story + .story.field` 인접 선택자에 기대므로, 그 사이에 무엇이 끼면 여백이 생깁니다 (/projects 자세히 보기 창은 전시실 섹션 안 끝에 있음).

## Ticket: 다음 모임 표

```tsx
<Ticket kicker="다음 모임" date={next.date} endDate={next.endDate} title={next.title} to="/community#upcoming" />
// 커뮤니티 '이번 주' 큰 판 (먹색 이야기 섹션 안)
<Ticket size="large" kicker="이번 주" date={e.date} title={e.title} meta="18:00 · 장소 미정" to="/community#upcoming" />
// 흰 · 옅은 회색 면 위에서는 surface 를 알려 주면 1px 선이 생깁니다
<Ticket surface="paper" … />
```

- 날짜는 '10.27' + 요일(해가 다르면 '2027.01.30'), D-day 는 `ticketDday`(lib/date `ddayLabel`)로 계산합니다. 손으로 적지 마세요.
- `to`(사이트 안) 또는 `href`(사이트 밖, 새 창). 둘 다 없으면 링크 없는 판. 표 전체가 링크라 화살표는 없습니다 (hallmark 63).
- 폰(≤767)은 세 줄(작은 글자 / 날짜 · D-day / 제목). 표는 늘 흰 판(`.on-light`)이라 먹색 면 안에서도 글자가 먹색입니다.
- 큰 판(`size="large"`)은 날짜 · 제목 · D-day 뿐이라 12칸 전체에 두면 가운데가 비어 보입니다. 7–8칸 폭이 알맞습니다 (커뮤니티 '이번 주'는 넓은 화면에서 머리 5칸 | 표 7칸).
- 다음 모임 찾기는 `homeNextEvent`(홈) 등 페이지 쪽에서 합니다. 휴회(rest)는 표에 올리지 않습니다.

## IconTile · IconRow: 실제 로고 아이콘

```tsx
const icons = ['agriguard', 'todai', 'clarity'].map((id) => byId.get(id)).map((p) => (p ? projectIcon(p) : null))
<IconRow label="그 밖의 프로젝트" items={icons} />              // 8칸(폰 ≤767 은 4칸), 정사각 흰 판 · radius 24% · 로고 62%
<IconRow label="지난 프로젝트" items={icons} size="small" />   // 40px 아이콘 + 이름, 줄바꿈 목록 (/recruits 네 파트). 가로로 긴 글자 로고는 64 × 40 판
<IconTile {...projectIcon(p)!} />                              // 한 장만
```

- `projectIcon(p)` 는 표지 그림이 없으면 `null`(IconRow 가 건너뜀), 이름 뒤 괄호 설명을 빼고, 누르면 `/projects?p=id`(자세히 보기 창).
- 화면 캡처 · 소개 그림(cover.kind 가 screen · promo)은 아이콘 크기에서 알아볼 수 없으니 줄에 넣지 않습니다 (`cover.kind === 'logo'` 만).
- 작은 크기에서 가로 : 세로가 2 이상인 로고(InGlo · Bravication · Wave)는 `width` · `height` 를 보고 판을 가로로 늘립니다. 그래서 `projectIcon` 이 넘기는 `width` · `height` 를 지우지 마세요.
- 그림은 `alt=""`, 링크 이름 = 보이는 프로젝트 이름. 타일 전체가 링크(44px 이상).
- 로고를 회색 면 위에 두지 마세요 (흰 판 위에서만).

## PageParts (features/pages/PageParts.tsx)

- `Section`: **참고 섹션**(FAQ · 일정 목록 · 지원 과정 · 기록). 1px 괘선 + 제목 28 + 한 줄. `head="top"`(기본, 내용 12칸) | `head="side"`(머리 왼쪽 3칸, 내용 4–12칸). `aside` · `quiet` 는 예전과 같습니다. 흰 이야기 섹션 바로 다음이면 위 여백 0.
- `PageHead` · `ExternalLink` · `StateLine` · `ToggleGroup` · `Mark` 는 그대로입니다.
- 먹색 이야기 섹션은 `StorySection tone="dark"` 를 직접 쓰고 안에 내용(Ticket · 단계 줄 등)을 넣습니다 (예전 FactBand · FactGrid · StepRail 은 지웠습니다).
- 페이지 끝 '여기서 갈 수 있는 곳'(예전 Signposts)은 지웠습니다. 페이지 끝은 JoinStrip → 꼬리말 둘러보기가 맡습니다.
- 장소 글자 · 길 돌림 한 줄 · 출처 한 줄은 `pages/community/Signage.tsx` 의 `RoomPlate` · `DetourLink` · `PageSources`.

## 전역 class (styles/global.css)

| class | 뜻 |
|---|---|
| `.btn-primary` | 주 버튼 (52 · r12, 한 화면에 하나). 먹색 면 위에서는 흰 바탕 |
| `.btn-secondary` | 두 번째 버튼 (옅은 면). field 위 흰 바탕 + 선, 먹색 위 #2B2E34 |
| `.btn-sm` | 작은 크기 (40 · r10, 누르는 자리 44) |
| `.btn-row` | 버튼 줄. 폰에서 버튼이 한 줄 가득 |
| `.link-go` | 사이트 안 이동. 동사 하나 + 1px 밑줄, hover 에 밑줄이 진해진다 (화살표 없음, 높이 44) |
| `.link` | 밑줄 링크. 문장 · 표 · 각주 안에서만 |
| `.on-dark` / `.on-light` | 먹색 면 단계로 / 밝은 면 단계로 되돌리기 (글자 · 선 · 버튼 · 포커스) |
| `.story` + `.paper` · `.field` · `.dark` | 이야기 섹션 면 (StorySection 이 붙임) |

바깥 링크는 글자 뒤에 `<span className="visually-hidden"> (새 창)</span>` 만 붙입니다. 글자 뒤 ↗ · → 는 쓰지 않습니다 (hallmark 63 · 30a). 글자 대신 그림이 필요하면 `common/Glyphs.tsx`.
hover 규칙은 `@media (hover: hover)` 안에 쓰고, 움직임은 `prefers-reduced-motion: reduce` 에서 끕니다.
데이터에서 온 글자에 'G-Sprint' 같은 하이픈 낱말이 있으면 `lib/text.ts` 의 `keepHyphenated` 를 거쳐 그립니다 (하이픈에서 줄이 꺾이지 않게).
