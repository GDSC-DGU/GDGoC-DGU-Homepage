import type { EventKind, ScheduleEvent } from '@/domain/types'
import { weekday } from '@/lib/date'

/**
 * 행사 기록 한 기수를 세 갈래로 나눈다 (커뮤니티 '행사 기록'). archive.test.ts 에 테스트.
 *
 * - 대표 행사: 연합 행사 · 컨퍼런스 · 데모데이 · G-Sprint 단계 (큰 줄)
 * - 연속 세션: 같은 시리즈가 ROUTE_MIN 번 이상이면 노선 하나로 (역 = 회차)
 * - 그 밖의 기록: 나머지 (작은 줄)
 *
 * Camping Seminar 14건이 같은 무게의 줄 14개로 늘어서지 않게 하려는 것이다.
 */

export const SIGNATURE_KINDS: readonly EventKind[] = ['event', 'project', 'sprint']

/** 노선으로 묶는 최소 회차 */
export const ROUTE_MIN = 3

export interface SeriesRun {
  series: string
  /** 오래된 것부터 (노선은 왼쪽에서 오른쪽으로 달린다) */
  events: ScheduleEvent[]
}

export interface GenerationArchive {
  /** 받은 순서 그대로 (최근 것부터) */
  signature: ScheduleEvent[]
  /** 마지막 회차가 최근인 노선부터 */
  routes: SeriesRun[]
  /** 받은 순서 그대로 (최근 것부터) */
  rows: ScheduleEvent[]
}

export function partitionGeneration(events: readonly ScheduleEvent[]): GenerationArchive {
  const signature = events.filter((e) => SIGNATURE_KINDS.includes(e.kind))
  const others = events.filter((e) => !SIGNATURE_KINDS.includes(e.kind))
  const bySeries = new Map<string, ScheduleEvent[]>()
  for (const e of others) if (e.series) bySeries.set(e.series, [...(bySeries.get(e.series) ?? []), e])
  const routes: SeriesRun[] = [...bySeries.entries()]
    .filter(([, list]) => list.length >= ROUTE_MIN)
    .map(([series, list]) => ({ series, events: [...list].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, 'ko')) }))
    .sort((a, b) => (b.events.at(-1)?.date ?? '').localeCompare(a.events.at(-1)?.date ?? ''))
  const routed = new Set(routes.flatMap((r) => r.events.map((e) => e.id)))
  return { signature, routes, rows: others.filter((e) => !routed.has(e.id)) }
}

/**
 * 가장 많이 열린 요일 ('목'). 절반 이상을 차지할 때만 돌려준다 (요일이 들쭉날쭉하면 null).
 * 2기 Camping Seminar 는 목요일, 3기는 금요일, 4기 세션은 화요일이다.
 */
export function mainWeekday(events: readonly Pick<ScheduleEvent, 'date'>[]): string | null {
  if (events.length === 0) return null
  const count = new Map<string, number>()
  for (const e of events) count.set(weekday(e.date), (count.get(weekday(e.date)) ?? 0) + 1)
  const [best, n] = [...count.entries()].sort((a, b) => b[1] - a[1])[0]
  return n * 2 >= events.length ? best : null
}

/** 가장 자주 쓴 장소. 회차의 절반 이상에서 썼을 때만 ('주로 정보문화관 P404') */
export function mainVenue(events: readonly Pick<ScheduleEvent, 'venue'>[]): string | null {
  const count = new Map<string, number>()
  for (const e of events) if (e.venue) count.set(e.venue, (count.get(e.venue) ?? 0) + 1)
  const top = [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
  return top && top[1] * 2 >= events.length ? top[0] : null
}

/** 역 이름: 제목의 회차 ('Camping Seminar 12회' → '12회', 'Gemini Study Jams 2주차' → '2주차'). 없으면 순번 */
export function stationLabel(e: Pick<ScheduleEvent, 'title'>, index: number): string {
  const m = e.title.match(/(\d+)\s*(회|주차|차)/)
  return m ? `${m[1]}${m[2]}` : `${index + 1}`
}
