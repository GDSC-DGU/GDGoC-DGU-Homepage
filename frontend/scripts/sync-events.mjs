#!/usr/bin/env node
/**
 * gdg.community.dev 챕터 행사 → src/content/events.json 동기화 (Node 20 이상)
 *
 *   node scripts/sync-events.mjs            # 받아서 events.json 을 고쳐 쓴다
 *   node scripts/sync-events.mjs --dry-run  # 무엇이 바뀌는지만 보여 준다 (파일은 그대로)
 *   node scripts/sync-events.mjs --prune    # 챕터 페이지에서 사라진 행사도 지운다
 *
 * 규칙
 * - source 가 gdg.community.dev 가 아닌 줄(예: '4기 운영 계획')은 사람이 쓴 일정이라 그대로 둔다.
 * - 이미 있는 행사(같은 url)는 사람이 다듬은 값(id · 한글 제목 · 종류 · 장소 · 기수 · 시리즈 · 장소명)을 지키고,
 *   날짜와 원래 제목만 새로 받는다.
 * - 새 행사는 제목으로 종류 · 장소를 어림하고, 기수는 날짜(9월 시작 학년, 2기 = 2024-09)로 정한다. 받은 뒤 한 번 훑어보고 고친다.
 * - 운영 계획에만 있던 일정이 챕터 페이지에 올라오면(같은 날 · 같은 장소) 한 줄로 합친다.
 *
 * 브라우저가 아니라 운영진 컴퓨터나 CI 에서 돌린다. 사이트는 이 스크립트가 만든 JSON 만 읽는다.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const CHAPTER_ID = 2122
export const API_BASE = `https://gdg.community.dev/api/event_slim/for_chapter/${CHAPTER_ID}/`
/** 지난 행사(Completed) + 공개된 다가오는 행사(Live) */
export const STATUSES = ['Completed', 'Live']

const EVENTS_PATH = fileURLToPath(new URL('../src/content/events.json', import.meta.url))
const SLUG_PREFIX = /^google-gdg-on-campus-dongguk-university-seoul-south-korea-presents-/
const KST_OFFSET_MS = 9 * 60 * 60 * 1000

const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)

/** '2026-10-13T18:00:00+09:00' · '2026-10-13T09:00:00Z' · '2026-10-13' → 한국 날짜 '2026-10-13' */
export function toKstDate(value) {
  const s = str(value)
  if (!s) return undefined
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  if (/(Z|[+-]\d{2}:?\d{2})$/i.test(s)) {
    const t = Date.parse(s)
    if (Number.isNaN(t)) return undefined
    return new Date(t + KST_OFFSET_MS).toISOString().slice(0, 10)
  }
  // 시간대 표시가 없으면 이미 한국 시간이라고 본다
  return s.match(/^(\d{4}-\d{2}-\d{2})/)?.[1]
}

/** 한국 오늘 날짜 */
export function kstToday(now = new Date()) {
  return new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10)
}

/**
 * 날짜로 기수 어림하기. 학년은 9월에 시작하고 8월에 끝난다 (2기 = 2024-09 ~ 2025-08).
 * 1기보다 앞이면 undefined.
 */
export function guessGeneration(ymd) {
  const year = Number(ymd.slice(0, 4))
  const month = Number(ymd.slice(5, 7))
  const n = (month >= 9 ? year : year - 1) - 2022
  return n >= 1 ? n : undefined
}

/** 제목으로 종류 · 장소 어림하기. 위에서부터 처음 맞는 규칙을 쓴다 */
const KIND_RULES = [
  [/\b(ot|orientation)\b|오리엔테이션/i, 'recruit', 'recruits'],
  [/g-?sprint/i, 'sprint', 'projects'],
  [/demo\s?day|데모\s?데이/i, 'project', 'projects'],
  [/hackathon|ideathon|해커톤/i, 'event', 'teams'],
  [/conference|컨퍼런스|joint|합동|교류|연합|picnic|피크닉|festival|devfest/i, 'event', 'community'],
]

export function classify(title) {
  for (const [re, kind, place] of KIND_RULES) if (re.test(title)) return { kind, place }
  return { kind: 'session', place: 'community' }
}

const ORDINAL = '(\\d+)(?:st|nd|rd|th)'
const PREFIX = /^(GDG on Campus DGU|GDGoC DGU|GDG DGU)\s*/i

/** 원래 제목 → 화면용 짧은 한글 제목. 모르는 모양은 앞의 챕터 이름만 뗀다 */
export function koreanTitle(original) {
  const t = original.replace(PREFIX, '').trim()
  let m = t.match(new RegExp(`^${ORDINAL}\\s+Camping Seminar$`, 'i'))
  if (m) return `Camping Seminar ${Number(m[1])}회`
  m = t.match(new RegExp(`^${ORDINAL}\\s+Part Study$`, 'i'))
  if (m) return `파트 스터디 ${Number(m[1])}회`
  m = t.match(new RegExp(`^${ORDINAL}\\s+(OT|Orientation)$`, 'i'))
  if (m) return `${Number(m[1])}기 OT`
  m = t.match(new RegExp(`^${ORDINAL}\\s+Demo\\s?Day$`, 'i'))
  if (m) return `${Number(m[1])}기 데모데이`
  return t || original
}

const SERIES = ['Camping Seminar', 'Part Study', 'Alumni Seminar', 'Open Seminar', 'Winter Gemini Study Jams', 'G-Sprint']

export function seriesOf(title) {
  const lower = title.toLowerCase()
  return SERIES.find((s) => lower.includes(s.toLowerCase()))
}

/** 행사 주소 끝부분(slug)에서 챕터 이름을 뗀 것을 id 로 쓴다 */
export function idFromUrl(url) {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean)
    const slug = parts[0] === 'events' && parts[1] === 'details' ? parts[2] : parts.at(-1)
    return slug ? slug.replace(SLUG_PREFIX, '') : undefined
  } catch {
    return undefined
  }
}

/** 비교용 주소: 끝 / 와 쿼리를 떼고 소문자로 */
export function normUrl(url) {
  try {
    const u = new URL(url)
    return `${u.host}${u.pathname.replace(/\/+$/, '')}`.toLowerCase()
  } catch {
    return String(url).trim().replace(/\/+$/, '').toLowerCase()
  }
}

/**
 * gdg.community.dev(Bevy) event_slim 한 줄 → ScheduleEvent JSON 한 줄.
 * 못 읽는 줄은 null.
 */
export function mapBevyEvent(raw) {
  if (!raw || typeof raw !== 'object') return null
  const originalTitle = str(raw.title)
  const date = toKstDate(raw.start_date ?? raw.start_date_iso ?? raw.startDate)
  const url = str(raw.url)
  if (!originalTitle || !date || !url) return null
  const endDate = toKstDate(raw.end_date ?? raw.end_date_iso ?? raw.endDate)
  const { kind, place } = classify(originalTitle)
  const generation = guessGeneration(date)
  const series = seriesOf(originalTitle)
  const venue = str(raw.venue_name)

  const e = { id: idFromUrl(url) ?? `${date}-${originalTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, date }
  if (endDate && endDate > date) e.endDate = endDate
  e.title = koreanTitle(originalTitle)
  e.originalTitle = originalTitle
  e.kind = kind
  e.place = place
  if (generation) e.generation = generation
  if (series) e.series = series
  if (venue) e.venue = venue
  e.url = url
  e.source = url
  return e
}

export const isCommunityDevSource = (e) => typeof e.source === 'string' && e.source.includes('gdg.community.dev')

/** 날짜순 (같은 날은 들어온 순서 그대로) */
export const sortEvents = (events) => [...events].sort((a, b) => a.date.localeCompare(b.date))

/**
 * 받은 행사(fetched)와 지금 JSON(existing)을 합친다.
 * @returns {{ events: object[], added: string[], updated: string[], promoted: string[], removed: string[] }}
 */
export function mergeEvents(existing, fetched, { prune = false } = {}) {
  const byUrl = new Map(existing.filter((e) => e.url).map((e) => [normUrl(e.url), e]))
  // 운영 계획에만 있는 줄 (주소 없음, 출처가 gdg.community.dev 아님)
  const plans = existing.filter((e) => !e.url && !isCommunityDevSource(e))
  const usedPlans = new Set()
  const seen = new Set()
  const added = []
  const updated = []
  const promoted = []

  const merged = fetched.map((f) => {
    const key = normUrl(f.url)
    seen.add(key)
    const prev = byUrl.get(key)
    if (prev) {
      const next = { ...f, ...prev, date: f.date, originalTitle: f.originalTitle }
      if (f.endDate) next.endDate = f.endDate
      else delete next.endDate
      if (prev.date !== next.date || prev.endDate !== next.endDate || prev.originalTitle !== next.originalTitle) updated.push(next.id)
      return next
    }
    const plan = plans.find((p) => !usedPlans.has(p) && p.date === f.date && p.place === f.place)
    if (plan) {
      usedPlans.add(plan)
      promoted.push(plan.id)
      const next = { ...f, ...plan, originalTitle: f.originalTitle, url: f.url, source: f.source }
      if (f.endDate) next.endDate = f.endDate
      return next
    }
    added.push(f.id)
    return f
  })

  const removed = []
  const kept = existing.filter((e) => {
    if (usedPlans.has(e)) return false
    if (e.url && seen.has(normUrl(e.url))) return false
    if (!isCommunityDevSource(e)) return true
    if (prune) removed.push(e.id)
    return !prune
  })

  // id 가 겹치면 날짜를 붙여 구분한다
  const ids = new Set()
  const events = sortEvents([...kept, ...merged]).map((e) => {
    let id = e.id
    if (ids.has(id)) id = `${id}-${e.date}`
    ids.add(id)
    return id === e.id ? e : { ...e, id }
  })
  return { events, added, updated, promoted, removed }
}

/** 한 줄에 행사 하나. 사람이 diff 를 읽기 쉽게 */
export function formatEvent(e) {
  return `{ ${Object.entries(e)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`)
    .join(', ')} }`
}

export function formatEventsJson(doc) {
  const head = Object.entries(doc)
    .filter(([k]) => k !== 'events')
    .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`)
  const rows = (doc.events ?? []).map((e) => `    ${formatEvent(e)}`)
  return `{\n${head.join('\n')}\n  "events": [\n${rows.join(',\n')}\n  ]\n}\n`
}

async function fetchStatus(status, fetchImpl) {
  let url = `${API_BASE}?status=${encodeURIComponent(status)}&page_size=100`
  const out = []
  for (let page = 0; url && page < 30; page++) {
    const res = await fetchImpl(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`)
    const json = await res.json()
    out.push(...(Array.isArray(json) ? json : (json.results ?? json.data ?? [])))
    url = Array.isArray(json) ? null : (json.links?.next ?? json.next ?? null)
  }
  return out
}

export async function main(argv = process.argv.slice(2), fetchImpl = globalThis.fetch) {
  const dryRun = argv.includes('--dry-run')
  const prune = argv.includes('--prune')
  const doc = JSON.parse(await readFile(EVENTS_PATH, 'utf8'))

  const raw = (await Promise.all(STATUSES.map((s) => fetchStatus(s, fetchImpl)))).flat()
  const byUrl = new Map()
  for (const e of raw.map(mapBevyEvent)) if (e && !byUrl.has(normUrl(e.url))) byUrl.set(normUrl(e.url), e)
  const fetched = [...byUrl.values()]

  const result = mergeEvents(doc.events, fetched, { prune })
  const next = { ...doc, updatedAt: kstToday(), events: result.events }

  const line = (label, ids) => console.log(`${label} ${ids.length}${ids.length ? `: ${ids.join(', ')}` : ''}`)
  console.log(`gdg.community.dev 에서 ${fetched.length}개를 읽었습니다.`)
  line('새 행사', result.added)
  line('날짜 · 제목이 바뀐 행사', result.updated)
  line('운영 계획 → 공개 행사로 합친 일정', result.promoted)
  if (prune) line('지운 행사', result.removed)
  if (result.added.length) console.log('새 행사는 한글 제목 · 종류 · 장소를 한 번 확인해 주세요.')

  if (dryRun) {
    console.log('--dry-run: 파일은 바꾸지 않았습니다.')
    return next
  }
  await writeFile(EVENTS_PATH, formatEventsJson(next), 'utf8')
  console.log(`${EVENTS_PATH} 를 고쳤습니다. npm test 로 확인하세요.`)
  return next
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  })
}
