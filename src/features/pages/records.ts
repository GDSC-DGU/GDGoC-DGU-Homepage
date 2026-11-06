import type { EventKind, Generation, ScheduleEvent } from '@/domain/types'
import { dotMonth } from './format'

/**
 * 커뮤니티 '행사 기록' 계산: 지난 행사 고르기, 기수별 묶기, 종류 거르기.
 * 행사가 0건이어도, 60건이 넘어도 같은 코드로 그린다. records.test.ts 에 테스트.
 */

export type KindFilterId = 'all' | 'session' | 'event' | 'project' | 'recruit'

/** 화면의 종류 칩. G-Sprint 단계는 '프로젝트'에 넣는다. 공지는 '전체'에서만 보인다 */
export const KIND_FILTERS: readonly { id: KindFilterId; label: string; kinds: readonly EventKind[] | null }[] = [
  { id: 'all', label: '전체', kinds: null },
  { id: 'session', label: '세션', kinds: ['session'] },
  { id: 'event', label: '행사', kinds: ['event'] },
  { id: 'project', label: '프로젝트', kinds: ['project', 'sprint'] },
  { id: 'recruit', label: '모집, OT', kinds: ['recruit'] },
]

export const isKindFilter = (v: string | null): v is KindFilterId => KIND_FILTERS.some((f) => f.id === v)

export function matchesKind(e: Pick<ScheduleEvent, 'kind'>, id: KindFilterId): boolean {
  const kinds = KIND_FILTERS.find((f) => f.id === id)?.kinds
  return !kinds || kinds.includes(e.kind)
}

/** 끝난 행사(여러 날 행사는 끝난 날 기준)를 최근 것부터. 휴회는 기록이 아니므로 뺀다 */
export function pastEvents(events: readonly ScheduleEvent[], today: string): ScheduleEvent[] {
  return events
    .filter((e) => (e.endDate ?? e.date) < today && e.kind !== 'rest')
    .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title, 'ko'))
}

export interface GenerationGroup {
  /** 기수가 적히지 않은 행사는 null (맨 뒤) */
  gen: number | null
  events: ScheduleEvent[]
}

/** 기수별로 묶는다: 4기 → 3기 → … → 기수 없음. 묶음 안의 순서는 받은 순서 그대로 */
export function groupByGeneration(events: readonly ScheduleEvent[]): GenerationGroup[] {
  const map = new Map<number | null, ScheduleEvent[]>()
  for (const e of events) {
    const key = e.generation ?? null
    map.set(key, [...(map.get(key) ?? []), e])
  }
  return [...map.entries()]
    .map(([gen, list]) => ({ gen, events: list }))
    .sort((a, b) => (b.gen ?? -1) - (a.gen ?? -1))
}

/** 기록에 있는 기수 (큰 것부터) */
export const generationsIn = (events: readonly ScheduleEvent[]): number[] =>
  [...new Set(events.map((e) => e.generation).filter((g): g is number => typeof g === 'number'))].sort((a, b) => b - a)

export function kindCounts(events: readonly ScheduleEvent[]): Record<KindFilterId, number> {
  const counts = { all: 0, session: 0, event: 0, project: 0, recruit: 0 } satisfies Record<KindFilterId, number>
  for (const e of events) {
    for (const f of KIND_FILTERS) if (matchesKind(e, f.id)) counts[f.id] += 1
  }
  return counts
}

/**
 * '2025.09~2026.06' · 지금 기수는 '2026.09~지금' · 끝을 모르면 '2023.09~'.
 * 시작을 모르면(공개 기록이 없는 기수) 기간을 지어내지 않고 null.
 */
export function generationRange(g: Pick<Generation, 'start' | 'end' | 'current'>): string | null {
  if (!g.start) return null
  if (g.end) return `${dotMonth(g.start)}~${dotMonth(g.end)}`
  return `${dotMonth(g.start)}~${g.current ? '지금' : ''}`
}

/** 접힌 목록에서 보일 개수 */
export const COLLAPSED_COUNT = 8
