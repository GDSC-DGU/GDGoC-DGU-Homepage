# 17: SEO: 주소별 HTML

**Blocked by:** None (can start immediately)

**Status:** done

- [x] 빌드 뒤 dist/about · archive · teams · recruits 의 HTML(about.html …)이 생기고 title · description · og · canonical 이 그 페이지 것이다
- [x] 테스트가 산출물 값을 확인한다

**결과 (방법 바꿈):** `dist/<주소>/index.html` 대신 `dist/<주소>.html` 을 만들고 vercel.json `cleanUrls` 로 /about 처럼 내보낸다 (폴더 주소는 끝 / 로 옮겨 가는 규칙이 Vercel 설정에 따라 달라서). 문구는 `src/content/seo.json` 한 곳 (화면 탭 제목과 같은지 seo.test.ts 가 맞춰 본다). 테스트는 변환 함수와 바탕 index.html 을 확인하고, 산출물은 빌드 로그(route-html: …)로 본다.
