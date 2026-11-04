import type { ArchiveDoc, EventKind, PlaceId, PreviewItem, Project, Review, ScheduleEvent, SearchHit, Seminar, Stat } from '@/domain/types'

/**
 * 서버 응답 → 화면 데이터 모양(domain/types) 으로 바꾸는 곳 (Adapter).
 * 서버 응답을 `as T` 로 믿고 넘기지 않는다. 모양이 다르면 화면 곳곳이 아니라 여기서 한 번에 고친다.
 *
 * Spring Boot 에서 자주 나오는 차이를 미리 받아 둔다.
 * - 목록이 { content: [...] } (Page) 나 { data: [...] } 로 감싸져 옴
 * - enum 이 대문자 (SPRINT, COMMUNITY)
 * - 날짜가 2026-10-27T18:00:00 이나 2026.10.27 형태
 * - 화면이 모르는 장소 · 종류가 섞여 옴 → 그 줄만 버린다
 */

type Raw = Record<string, unknown>

const PLACE_IDS: readonly PlaceId[] = ['about', 'projects', 'teams', 'community', 'recruits']
const KINDS: readonly EventKind[] = ['session', 'event', 'sprint', 'project', 'recruit', 'notice', 'rest']

const isObject = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v)
const text = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : typeof v === 'number' ? String(v) : undefined)

/** 배열 그대로, { content }, { data }, { items } 모두 배열로 */
export function unwrapList(json: unknown): unknown[] {
  if (Array.isArray(json)) return json
  if (isObject(json)) {
    for (const key of ['content', 'data', 'items', 'results']) {
      if (Array.isArray(json[key])) return json[key] as unknown[]
    }
  }
  return []
}

/** '2026-10-27', '2026-10-27T18:00:00', '2026.10.27', '2026/10/27' → '2026-10-27'. 못 읽으면 undefined */
export function toYmd(v: unknown): string | undefined {
  const s = text(v)
  const m = s?.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})/)
  if (!m) return undefined
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
}

function toEnum<T extends string>(v: unknown, allowed: readonly T[]): T | undefined {
  const s = text(v)?.toLowerCase()
  return allowed.find((a) => a === s)
}

export const toPlace = (v: unknown) => toEnum(v, PLACE_IDS)

/** 버리는 줄은 null. 목록에서 filter 로 걸러낸다 */
export function toScheduleEvent(raw: unknown): ScheduleEvent | null {
  if (!isObject(raw)) return null
  const date = toYmd(raw.date ?? raw.startDate ?? raw.startAt)
  const title = text(raw.title ?? raw.name)
  const kind = toEnum(raw.kind ?? raw.type ?? raw.category, KINDS)
  const place = toPlace(raw.place ?? raw.placeId) ?? 'community'
  if (!date || !title || !kind) return null
  const endDate = toYmd(raw.endDate ?? raw.endAt)
  const extra: Partial<ScheduleEvent> = {}
  const generation = Number(raw.generation)
  if (Number.isInteger(generation) && generation > 0) extra.generation = generation
  for (const key of ['series', 'venue', 'originalTitle', 'url', 'source'] as const) {
    const v = text(raw[key])
    if (v) extra[key] = v
  }
  return { id: text(raw.id) ?? `${date}-${title}`, date, ...(endDate && endDate !== date ? { endDate } : {}), title, kind, place, ...extra }
}

export function toProject(raw: unknown): Project | null {
  if (!isObject(raw)) return null
  const name = text(raw.name ?? raw.title)
  const program = text(raw.program)
  const year = Number(raw.year)
  if (!name || !program || !Number.isInteger(year)) return null
  const status = text(raw.status)?.toLowerCase() === 'in-progress' ? 'in-progress' : 'done'
  const generation = Number(raw.generation)
  const stack = Array.isArray(raw.stack) ? raw.stack.map(text).filter((s): s is string => Boolean(s)) : undefined
  const p: Project = { id: text(raw.id) ?? name, name, program, year, status }
  if (Number.isInteger(generation) && generation > 0) p.generation = generation
  if (stack?.length) p.stack = stack
  for (const key of ['summary', 'repo', 'url', 'source'] as const) {
    const v = text(raw[key])
    if (v) p[key] = v
  }
  return p
}

/** 세미나 한 줄: { id, title, speaker, date, generation, fileUrl } (백엔드 응답 제안 2026-11-04) */
export function toSeminar(raw: unknown): Seminar | null {
  if (!isObject(raw)) return null
  const title = text(raw.title)
  const date = text(raw.date)?.slice(0, 10)
  const generation = Number(raw.generation)
  if (!title || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(generation) || generation < 1) return null
  const fileUrl = text(raw.fileUrl ?? raw.file_url)
  const format = text(raw.format)?.toLowerCase()
  return {
    id: text(raw.id) ?? `${date}-${title}`,
    date,
    generation,
    title,
    speaker: text(raw.speaker) ?? '',
    format: format === 'pdf' || format === 'pptx' ? format : fileUrl?.toLowerCase().endsWith('.pdf') ? 'pdf' : null,
    fileUrl: fileUrl && /^https:\/\//.test(fileUrl) ? fileUrl : null,
  }
}

export function toStat(raw: unknown): Stat | null {
  if (!isObject(raw)) return null
  const id = text(raw.id ?? raw.key)
  const label = text(raw.label ?? raw.name)
  const value = Number(raw.value ?? raw.count)
  if (!id || !label || !Number.isFinite(value)) return null
  const note = text(raw.note)
  return { id, label, value, ...(note ? { note } : {}) }
}

export function toPreviewItem(raw: unknown): PreviewItem | null {
  if (!isObject(raw)) return null
  const title = text(raw.title)
  if (!title) return null
  const date = toYmd(raw.date ?? raw.createdAt)
  const label = text(raw.label ?? raw.status)
  const tag = text(raw.tag ?? raw.category)
  return { id: text(raw.id) ?? title, title, ...(date ? { date } : {}), ...(label ? { label } : {}), ...(tag ? { tag } : {}) }
}

export function toReview(raw: unknown): Review | null {
  if (!isObject(raw)) return null
  const body = text(raw.body ?? raw.content)
  const author = text(raw.author ?? raw.name)
  if (!body || !author) return null
  const part = text(raw.part)
  return { id: text(raw.id) ?? `${author}-${body.slice(0, 12)}`, body, author, ...(part ? { part } : {}) }
}

export function toSearchHit(raw: unknown): SearchHit | null {
  if (!isObject(raw)) return null
  const src = isObject(raw.doc) ? raw.doc : raw
  const place = toPlace(src.place)
  const title = text(src.title)
  if (!place || !title) return null
  const doc: ArchiveDoc = { id: text(src.id) ?? `${place}-${title}`, place, title, meta: text(src.meta) ?? '', keywords: text(src.keywords) ?? '' }
  const score = Number(raw.score ?? 1)
  return { doc, score: Number.isFinite(score) ? score : 1 }
}

/** 목록 전체 바꾸기: 감싼 것 벗기기 → 줄마다 바꾸기 → 못 읽은 줄 버리기 */
export function adaptList<T>(json: unknown, adapt: (raw: unknown) => T | null): T[] {
  return unwrapList(json)
    .map(adapt)
    .filter((x): x is T => x !== null)
}
