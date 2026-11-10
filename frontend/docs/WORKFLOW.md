# 작업 순서

큰 변경은 아래 여섯 단계로 합니다 (Matt Pocock skills 의 흐름을 이 저장소에 맞춘 것). 작은 문구 수정은 5단계 검사만 하면 됩니다.
말은 [GLOSSARY.md](GLOSSARY.md) 의 말을 씁니다.

```
1 묻고 정하기 → 2 스펙 → 3 일감 나누기 → 4 만들기 → 5 리뷰 두 번 → 6 회고
```

## 1. 묻고 정하기 (grill)

- 바꾸려는 것을 한 문장으로 적고, 정해지지 않은 것을 하나씩 묻습니다. 답은 Organizer 가 합니다.
- 기존 문서(docs/DESIGN.md · CONTENT.md · ARCHITECTURE.md · GLOSSARY.md)와 부딪히는 답이 나오면 그 자리에서 문서를 고칩니다.
- 새 말이 생기면 GLOSSARY.md 에 더합니다.

## 2. 스펙 (to-spec)

`docs/work/<날짜-주제>/spec.md` 한 장에 씁니다.

- 문제 · 해결 · 사용자 이야기(번호) · 구현 결정 · 테스트 결정 · 범위 밖
- 지어낸 숫자 · 인용 · 성과는 쓰지 않습니다 (docs/CONTENT.md 1장).

## 3. 일감 나누기 (to-tickets)

`docs/work/<날짜-주제>/issues/NN-<짧은-이름>.md` 한 파일에 일감 하나.

- 일감은 끝까지 만들어 확인할 수 있는 얇은 조각입니다 (화면 하나를 층마다 나누지 않습니다).
- 맨 위에 `**Blocked by:**` (앞서야 하는 일감 번호, 없으면 None) 와 `**Status:**` 를 적고, 다 됐는지 볼 수 있는 `- [ ]` 를 답니다.
- 마지막 일감은 늘 '리뷰 두 번 + 회고' 입니다.

## 4. 만들기 (implement)

- Blocked by 가 풀린 일감부터 번호 순서로 합니다.
- 바뀌는 규칙은 테스트를 먼저 씁니다 (계산 · 문구 규칙 · 빌드 산출물). 화면 모양은 캡처로 확인합니다.
- 일감 하나가 끝날 때마다 5단계의 '빠른 검사'를 돌립니다.

## 5. 검사와 리뷰 두 번 (code-review)

### 빠른 검사 (일감마다)

```sh
npx tsc -b            # 타입
npx oxlint --deny-warnings src
npx vitest run        # 계산 · 문구 규칙 (content.test.ts 가 콘텐츠 JSON · config · mock 문구의 줄표 · 가운뎃점 · 날짜 표기를 잡는다. TSX · CSS 글자는 아래 sloplint 와 화면 검사로)
npm run build         # vite build + 주소별 HTML (scripts/route-html.mjs)
```

### 디자인 스킬 검사 (화면을 바꿨을 때)

화면 규칙은 세 스킬을 따릅니다. 서로 부딪히면 **스킬 규칙이 dcamp 모양보다 먼저**입니다 (4기 Organizer 2026-11-06).

| 스킬 | 보는 것 | 이 저장소에서 지키는 법 |
|---|---|---|
| hallmark | 바닥 규칙 (색은 토큰만, transition all 금지 · transform/opacity 만, 가로 넘침은 clip, :focus-visible, 동작 줄이기, 이름표 · 가운뎃점 줄 · 링크 뒤 화살표 · 글자 아이콘 · 줄표 금지) | `tokens.css` 의 이름만 쓴다. 빠지는 값은 토큰을 더한다 |
| impeccable | 이름표(eyebrow) 금지, 뜻 없는 섹션 번호 금지 | 순서가 있는 단계(01~04)에만 번호 |
| taste-skill | 사진 밑 설명 금지, 마우스를 올리면 카드 2px · 사진 1.02~1.03 | 행사 이름 · 날짜는 alt 에 |

hallmark 의 정적 검사는 스킬 저장소의 `scripts/sloplint.mjs` 로 돌립니다.

```sh
node <hallmark>/skills/hallmark/scripts/sloplint.mjs src --tier floor
```

관리자 화면(`features/admin`), 지도(`features/campus` · `world3d`), 들여온 코드(`vendor`)는 이 검사에서 뺍니다.
결과에서 보지 않는 것: 규칙 20(모든 CSS 첫 줄의 Hallmark 도장, 이 저장소는 쓰지 않음)과 알고 둔 예외 두 가지 — 순차 등장의 `data-reveal='wait'`(스크립트가 붙일 때만 숨김), 검색 창의 Enter 안내(고른 줄에만 보임). 이 셋 말고 FAIL 이 나오면 고칩니다.

새 움직임은 [GLOSSARY.md 의 '움직임 9가지' 표](GLOSSARY.md#디자인--움직임) 가운데 하나로 이름을 붙이고, 표에 자리를 더합니다. 튕김(스프링 · 바운스)은 표에 적힌 세 자리 말고는 쓰지 않습니다.

### 화면 검사

- 넓은 화면(1440) · 폰(390)에서 홈 · 소개 · 아카이브 · 지원하기 · 팀원 찾기를 캡처해 봅니다.
- axe 로 접근성(대비 · 이름 · 초점), 가로 넘침이 없는지 봅니다.
- 보안 헤더를 바꿨으면 vercel.json 과 같은 헤더로 띄운 서버에서 콘솔에 CSP 오류가 없는지 봅니다.

### 리뷰 두 번

같은 변경을 두 사람(또는 두 에이전트)이 따로 봅니다. 서로의 결과를 보지 않습니다.

1. **기준 리뷰**: 저장소 규칙(DESIGN · CONTENT · ARCHITECTURE · 위 스킬 바닥)과 코드 냄새(중복, 긴 함수, 이름이 뜻과 다름, 쓰지 않는 코드)를 봅니다.
2. **스펙 리뷰**: spec.md 와 일감의 `- [ ]` 를 하나씩 맞춰 봅니다. 빠진 것 · 스펙에 없는데 더한 것 · 잘못 만든 것.

나온 지적은 고치거나, 고치지 않는 까닭을 회고에 적습니다.

## 6. 회고 (retro)

`docs/work/<날짜-주제>/retro.md` 에 짧게: 잘된 것, 막힌 것, 다음에 바꿀 것, 남은 일.

## 보안 헤더 · SEO 를 바꿀 때

- `vercel.json` 의 Content-Security-Policy 는 바깥 주소를 막습니다. 글꼴(Google Fonts · jsDelivr) 말고 바깥 주소를 새로 쓰면 그 칸(`img-src` · `connect-src` …)에 더합니다.
  서버가 생겨 `VITE_API_BASE` 를 다른 주소로 두면 `connect-src` 에 그 주소를 더합니다.
- 라이브러리가 `<style>` 을 끼워 넣으면 CSP 가 막습니다 (rough-notation 은 `common/RoughMark.tsx` 에서 미리 막아 두었다).
- 주소를 더하면 `src/content/seo.json` · `public/sitemap.xml` 를 함께 고칩니다 (seo.test.ts 가 맞춰 본다).
