import { describe, expect, it } from 'vitest'
import { PLACE_BY_ID } from '@/config/places'
import { SITE } from '@/config/site'
import { CHAPTER } from '@/content'
import type { PlaceId } from '@/domain/types'
import { pageTitle, SITE_TITLE } from '@/hooks/usePageTitle'
import { routeFile, routeHtml, routeUrl, type SeoRoute } from '../../scripts/route-html.mjs'
import INDEX from '../../index.html?raw'
import ROBOTS from '../../public/robots.txt?raw'
import SITEMAP from '../../public/sitemap.xml?raw'
import seo from './seo.json'

const ROUTES = seo.routes as SeoRoute[]

const attr = (html: string, sel: RegExp) => html.match(sel)?.[1]

describe('주소별 HTML (scripts/route-html.mjs)', () => {
  it('파일 이름: / 는 index.html, 나머지는 <주소>.html', () => {
    expect(routeFile('/')).toBe('index.html')
    expect(routeFile('/about')).toBe('about.html')
    expect(routeFile('/archive/')).toBe('archive.html')
    expect(routeUrl('https://x.dev/', '/about')).toBe('https://x.dev/about')
  })

  it('다섯 주소: 홈 · 소개 · 아카이브 · 지원하기 · 팀원 찾기', () => {
    expect(ROUTES.map((r) => r.path)).toEqual(['/', '/about', '/archive', '/recruits', '/teams'])
  })

  it('제목은 화면이 탭에 다는 제목(usePageTitle)과 같다', () => {
    for (const r of ROUTES) {
      const expected = r.path === '/' ? SITE_TITLE : pageTitle(PLACE_BY_ID[r.place as PlaceId].label)
      expect(r.title, r.path).toBe(expected)
    }
  })

  it('설명은 검색 결과에 다 보일 만큼 짧다 (160자 이하)', () => {
    for (const r of ROUTES) expect(r.description.length, r.path).toBeLessThanOrEqual(160)
  })

  it('주소마다 title · description · og · canonical · noscript 가 그 주소 것이다', () => {
    for (const r of ROUTES) {
      const html = routeHtml(INDEX, r, seo.origin, ROUTES)
      const url = routeUrl(seo.origin, r.path)
      expect(attr(html, /<title>([^<]*)<\/title>/), r.path).toBe(r.title)
      expect(attr(html, /<meta name="description" content="([^"]*)"/), r.path).toBe(r.description)
      expect(attr(html, /<meta property="og:title" content="([^"]*)"/), r.path).toBe(r.title)
      expect(attr(html, /<meta property="og:description" content="([^"]*)"/), r.path).toBe(r.ogDescription ?? r.description)
      expect(attr(html, /<meta property="og:url" content="([^"]*)"/), r.path).toBe(url)
      expect(attr(html, /<link rel="canonical" href="([^"]*)"/), r.path).toBe(url)
      expect(html.match(/<link rel="canonical"/g)?.length, r.path).toBe(1)
      expect(html, r.path).toMatch(/<div id="root"><\/div>\s*<noscript><h1>/)
      // 같은 바탕을 두 번 거쳐도 canonical · noscript 가 겹치지 않는다
      const twice = routeHtml(html, r, seo.origin, ROUTES)
      expect(twice.match(/<noscript>/g)?.length, r.path).toBe(1)
      expect(twice.match(/<link rel="canonical"/g)?.length, r.path).toBe(1)
    }
  })

  it('글자 속 따옴표 · 꺾쇠는 HTML 로 바꿔 넣는다', () => {
    const html = routeHtml(INDEX, { path: '/x', title: 'A "B" <C>', description: 'd & e' }, seo.origin)
    expect(html).toContain('<title>A &quot;B&quot; &lt;C&gt;</title>')
    expect(html).toContain('content="d &amp; e"')
  })

  it('바탕 meta 가 없으면 조용히 넘어가지 않고 멈춘다', () => {
    expect(() => routeHtml('<html><head><title>x</title></head><body><div id="root"></div></body></html>', ROUTES[0], seo.origin)).toThrow()
  })
})

describe('사이트맵 · robots · 구조화 데이터', () => {
  it('sitemap.xml 의 주소는 seo.json 의 주소와 같다', () => {
    const locs = [...SITEMAP.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
    expect(locs).toEqual(ROUTES.map((r) => routeUrl(seo.origin, r.path)))
  })

  it('robots.txt 가 사이트맵을 알린다', () => {
    expect(ROBOTS).toContain(`Sitemap: ${seo.origin}/sitemap.xml`)
  })

  it('index.html 의 JSON-LD 는 읽히는 JSON 이고, WebSite · Organization 을 저장소에 있는 사실로만 적는다', () => {
    const raw = INDEX.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1]
    expect(raw).toBeTruthy()
    const data = JSON.parse(raw!) as { '@graph': Array<Record<string, unknown>> }
    const types = data['@graph'].map((n) => n['@type'])
    expect(types).toEqual(['WebSite', 'Organization'])
    const org = data['@graph'][1]
    expect(org.url).toBe(`${seo.origin}/`)
    // 바깥 주소는 사이트가 이미 쓰는 것만 (지어내지 않는다)
    const known = [...Object.values(SITE.links), CHAPTER.chapterPage, CHAPTER.github].filter((x): x is string => typeof x === 'string' && x.startsWith('https://'))
    for (const u of org.sameAs as string[]) expect(known, u).toContain(u)
    expect(String((org.address as { streetAddress: string }).streetAddress)).toBe(SITE.address.replace(/^서울시 중구 /, ''))
  })
})
