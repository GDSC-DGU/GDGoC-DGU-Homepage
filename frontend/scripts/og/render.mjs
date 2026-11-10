#!/usr/bin/env node
/**
 * 공유 카드 그림(og:image) 다시 만들기 → public/og.png (1200×630, 300KB 이하)
 *
 *   npm run build && npx vite preview --port 4173      # 빌드한 사이트를 띄운다 (다른 창)
 *   NODE_PATH=$(npm root -g) node scripts/og/render.mjs http://localhost:4173/
 *
 * 1) 빌드한 홈을 1440×900(2배 해상도)으로 열어 첫 화면 지도(실제 CampusScene)만 찍는다
 * 2) scripts/og/og.html 에 그 그림을 끼워 1200×630 으로 찍는다 (글꼴은 사이트와 같은 CDN)
 * 3) sharp 가 있으면 256색 PNG 로 줄인다
 *
 * playwright · sharp 는 이 저장소 의존성이 아니다 (전역 설치를 NODE_PATH 로 찾는다).
 * 홈 지도나 첫 화면 문장(src/content/story.ts HERO)이 바뀌면 다시 찍고, og.html 문구도 함께 고친다.
 * 프록시 뒤라면 HTTPS_PROXY 를 그대로 쓴다 (localhost 는 거치지 않음).
 */
import { readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const SITE = process.argv[2] ?? 'http://localhost:4173/'
const HTML = fileURLToPath(new URL('./og.html', import.meta.url))
const OUT = fileURLToPath(new URL('../../public/og.png', import.meta.url))
const LOGO = fileURLToPath(new URL('../../public/brand/gdg-dgu-logo.png', import.meta.url))
const MAX_BYTES = 300 * 1024

const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } : undefined
const browser = await chromium.launch({ proxy })
try {
  // 1) 첫 화면 지도: h1(#hero-title) 이 든 section 의 첫 svg 를 감싼 틀
  const site = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'ko-KR', timezoneId: 'Asia/Seoul' })
  await site.goto(SITE, { waitUntil: 'networkidle' })
  await site.evaluate(() => document.fonts.ready)
  await site.waitForTimeout(800)
  // 날짜가 지나면 틀려지는 손글씨(G-Sprint 'n팀 만드는 중 · 데모데이')는 공유 카드에서 뺀다. 매주 화요일 메모는 둔다
  await site.addStyleTag({ content: "[data-pen='sprint']{display:none!important}" })
  const frame = site.locator('#hero-title').locator('xpath=ancestor::section[1]').locator('svg').first().locator('xpath=..')
  const campus = await frame.screenshot({ animations: 'disabled' })

  // 2) 카드
  const card = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
  const logo = await readFile(LOGO)
  const html = (await readFile(HTML, 'utf8'))
    .replace('src="campus.png"', `src="data:image/png;base64,${campus.toString('base64')}"`)
    .replace('src="logo.png"', `src="data:image/png;base64,${logo.toString('base64')}"`)
  await card.setContent(html, { waitUntil: 'networkidle' })
  await card.evaluate(() => document.fonts.ready)
  let png = await card.screenshot({ type: 'png' })

  // 3) 줄이기
  try {
    const sharp = require('sharp')
    for (const quality of [90, 75, 60]) {
      const small = await sharp(png).png({ palette: true, quality, effort: 10, compressionLevel: 9 }).toBuffer()
      png = small
      if (small.length <= MAX_BYTES) break
    }
  } catch {
    console.warn('sharp 를 찾지 못해 줄이지 않고 저장합니다')
  }
  await writeFile(OUT, png)
  console.log(`${OUT} ${(png.length / 1024).toFixed(0)}KB${png.length > MAX_BYTES ? ' (300KB 넘음)' : ''}`)
} finally {
  await browser.close()
}
