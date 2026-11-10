/**
 * 빌드 뒤 주소별 HTML 만들기 (SEO, 일감 17). `npm run build` 가 vite build 다음에 부른다.
 *
 * 이 사이트는 화면을 브라우저에서 그리는 SPA 라, 검색 · 공유 로봇이 받는 HTML 은 어느 주소든 같은 index.html 이었다.
 * dist/index.html 을 바탕으로 src/content/seo.json 의 주소마다 제목 · 설명 · og · canonical 을 바꾼 파일을 만든다.
 *   /          → dist/index.html (덮어쓴다)
 *   /about     → dist/about.html  (vercel.json cleanUrls 가 /about 으로 내보낸다)
 * 자바스크립트가 꺼져 있으면 보이는 <noscript> 안내도 넣는다 (페이지 이름 · 설명 · 다른 주소 링크).
 *
 * 함수는 src/content/seo.test.ts 가 가져다 확인한다 (타입은 route-html.d.mts).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const esc = (s) => String(s).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

/** '/' → 'index.html', '/about' → 'about.html' */
export function routeFile(path) {
  if (path === '/') return 'index.html'
  return `${path.replace(/^\/+|\/+$/g, '')}.html`
}

/** 주소의 절대 주소 (canonical · og:url) */
export function routeUrl(origin, path) {
  return `${origin.replace(/\/+$/, '')}${path}`
}

function setMeta(html, attr, key, value) {
  const re = new RegExp(`<meta\\s+${attr}="${key}"\\s+content="[^"]*"\\s*/?>`)
  const tag = `<meta ${attr}="${key}" content="${esc(value)}" />`
  if (!re.test(html)) throw new Error(`index.html 에 ${attr}="${key}" meta 가 없습니다`)
  return html.replace(re, () => tag)
}

/** index.html 하나를 한 주소용으로 바꾼다. routes 는 <noscript> 의 다른 주소 링크용 */
export function routeHtml(html, route, origin, routes = []) {
  const url = routeUrl(origin, route.path)
  // 바꿀 글은 함수로 넘긴다: 글 속 '$&' · "$'" 같은 것이 정규식 치환 기호로 읽히지 않게
  let out = html.replace(/<title>[^<]*<\/title>/, () => `<title>${esc(route.title)}</title>`)
  out = setMeta(out, 'name', 'description', route.description)
  out = setMeta(out, 'property', 'og:title', route.title)
  out = setMeta(out, 'property', 'og:description', route.ogDescription ?? route.description)
  out = setMeta(out, 'property', 'og:url', url)
  out = out.replace(/\s*<link rel="canonical"[^>]*>/, '')
  out = out.replace('</head>', () => `  <link rel="canonical" href="${esc(url)}" />\n  </head>`)
  const links = routes
    .filter((r) => r.path !== route.path)
    .map((r) => `<a href="${esc(r.path)}">${esc(r.title.split(' · ')[0])}</a>`)
    .join(' ')
  const noscript = `<noscript><h1>${esc(route.title)}</h1><p>${esc(route.description)}</p><p>이 사이트는 자바스크립트를 켜야 볼 수 있습니다.</p>${links ? `<p>${links}</p>` : ''}</noscript>`
  out = out.replace(/\s*<noscript>[\s\S]*?<\/noscript>/, '')
  out = out.replace('<div id="root"></div>', () => `<div id="root"></div>\n    ${noscript}`)
  return out
}

function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..')
  const dist = join(root, 'dist')
  const seo = JSON.parse(readFileSync(join(root, 'src/content/seo.json'), 'utf8'))
  const template = readFileSync(join(dist, 'index.html'), 'utf8')
  // 바탕(index.html)을 덮어쓰기 전에 모두 만든다
  const files = seo.routes.map((r) => [routeFile(r.path), routeHtml(template, r, seo.origin, seo.routes)])
  for (const [file, html] of files) writeFileSync(join(dist, file), html)
  console.log(`route-html: ${files.map(([f]) => f).join(', ')}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
