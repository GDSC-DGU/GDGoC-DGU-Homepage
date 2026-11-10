# 회고: 디자인 스킬 · 움직임 9가지 · SEO · 보안 (2026-11-06)

일감 24개 (spec.md, issues/01~24). 4기 Organizer 결정: 스킬 규칙이 dcamp 모양보다 먼저, 일감은 잘게.

## 한 것

- **색 · 움직임 토큰** (01 · 02): 공개 CSS 의 색을 모두 `tokens.css` 이름으로. 시간 120 / 220 / 420ms, 닫힘 150 / 280ms, 곡선 ease-out · ease-in · ease-in-out · spring · bounce, 순차 간격 40ms. `transition: all` 없음, `html, body` 가로 넘침은 clip.
- **스킬 금지 항목** (03~08): 제목 위 이름표, 가운뎃점으로 이은 정보 줄, 링크 뒤 → · ↗, 글자 아이콘(“ → SVG), 행사 사진 밑 설명, 줄표 범위(– → ~), 흐림만 쓰는 비활성 버튼. 문구 규칙은 content.test.ts 가 콘텐츠 JSON · config · mock 에서 잡는다.
- **움직임 9가지** (09~16): 자리는 GLOSSARY.md 표. 열림 ease-out, 닫힘 ease-in 으로 더 짧게. 스프링(토글 · 지도 미리보기), 바운스('지금' 이름표), 순차 등장(페이지마다 한 곳, 0.5초 안), 페이드(탭 · 복사 알림 · 검색 결과, 바꿨을 때만), 슬라이드(폰 메뉴), 확대 · 공유 요소 전환(View Transitions, 없으면 FLIP 확대).
- **SEO · 보안** (17~21): 주소별 HTML(제목 · 설명 · og · canonical · noscript), sitemap · robots · JSON-LD, /projects · /community 영구 이동, 관리자 · 글 · 첨부 noindex, CSP · nosniff · Referrer-Policy, Pretendard 고정 판 + integrity.
- **문서** (22 · 23): GLOSSARY.md, WORKFLOW.md. DESIGN.md · CONTENT.md · common/README.md 를 새 규칙에 맞췄다.

## 리뷰 두 번에서 나온 것과 처리

기준 리뷰 15건, 스펙 리뷰(일감 23개 대조) 결과를 보고 고쳤다.

- 고침: 섹션 머리 '전체 보기' 알약에 밑줄이 붙던 것, 소개 '달력으로 보기'의 CSS 가운뎃점(`now.module.css`), 검정 띠 두 색(#000 · #0A0909)이 섞이던 것, 카드 hover 6px → 2px(taste-skill), 자세히 보기 창 그림 밑 설명, 검정 띠 카드의 동작 줄이기, 버튼 공통 비활성 모양, 탭 패널이 처음 열 때도 페이드되던 것, `route-html.mjs` 의 `$` 치환 기호, 순차 등장이 0.5초를 넘던 것(이동도 220ms, 7칸, 8px), View Transitions 없는 브라우저의 확대 전환, 낡은 주석 · 쓰지 않는 CSS · 토큰.
- 판단해서 둔 것: 빵 부스러기 `›` · 목록 점 `•`(문장 부호 · 목록 표지라 아이콘이 아님), 팀원 찾기 이름표 '김민준 · 4기'(이름표의 가운뎃점 하나는 허용), 장소색 네모(지도 범례), 검색 Enter 안내 · `data-reveal='wait'`(sloplint 오탐), 쓰지 않는 `Ticket` · `LedTicket` 부품(지우는 것은 따로).
- 4기 Organizer 확인이 필요한 것: (1) 흰 · 검정을 아주 살짝 데운 것(hallmark 7a: #FFFDFB · #0A0909), (2) 카드가 떠오르는 높이 6px → 2px, (3) 팀원 찾기(/teams)를 사이트맵에 넣을지 (지금은 예시 글이 보이는 프로토타입).

## 잘된 것

- 일감을 잘게 나눠 하나씩 끝낼 때마다 tsc · oxlint · vitest 를 돌려 틀린 곳을 바로 찾았다 (CSS 정리 정규식이 ticket.module.css 를 깨뜨린 것을 빌드에서 바로 잡음).
- 움직임은 거의 CSS 로만 (`@starting-style` + `allow-discrete`, hidden · dialog 그대로). React 쪽 바뀜이 작다.
- CSP 를 로컬 서버에서 먼저 켜 보아 rough-notation 의 `<style>` 을 배포 전에 찾았다.

## 막힌 것

- 처음 열 때 미리보기의 스프링이 안 보였다: 자리를 재는 동안 이미 스타일이 계산돼 `@starting-style` 이 쓰이지 않았다 → 재기 전 모양을 시작 모양으로.
- FLIP 시간이 0.42ms 로 돌았다: 빌드가 `420ms` 를 `.42s` 로 줄여 써서 → `cssMs()` 로 단위를 읽는다.
- 정규식으로 CSS 규칙을 지우다 쉼표 목록을 깨뜨렸다 → 원본에서 되살리고 손으로 고쳤다. 큰 CSS 정리는 정확한 문자열 바꾸기로만.

## 다음에 바꿀 것

- TSX · CSS 의 화면 글자(가운뎃점 · 화살표)도 테스트가 잡게 한다 (지금은 JSON · config · mock 만, CSS 의 `content:` 는 못 봄).
- sloplint 를 저장소 스크립트로 넣고 도장 규칙(20)을 끈 설정을 둔다.
- 화면 캡처 비교를 저장소에 남긴다 (지금은 작업 공간에만).

## 남은 일

- 위 Organizer 확인 세 가지.
- 백엔드가 생기면 `VITE_API_BASE` 주소를 CSP `connect-src` 에 더한다 (WORKFLOW.md).
- 쓰지 않는 부품(`Ticket`, `HowSection` · `LedTicket`, `placehero`) 정리는 따로 일감으로.
