import { describe, expect, it } from 'vitest'
import type { ScheduleEvent } from '@/domain/types'
import { generationRange, generationsIn, groupByGeneration, isKindFilter, kindCounts, matchesKind, pastEvents } from './records'

const ev = (id: string, date: string, kind: ScheduleEvent['kind'], generation?: number, endDate?: string): ScheduleEvent => ({
  id,
  date,
  endDate,
  title: id,
  kind,
  place: 'community',
  generation,
})

describe('pastEvents', () => {
  const list = [
    ev('a', '2025-11-06', 'session', 3),
    ev('rest', '2025-10-20', 'rest', 3),
    ev('future', '2026-10-27', 'sprint', 4),
    ev('multi', '2026-10-15', 'event', 4, '2026-10-17'),
    ev('b', '2026-09-15', 'recruit', 4),
  ]

  it('끝난 행사만 최근 것부터, 휴회는 뺀다', () => {
    expect(pastEvents(list, '2026-10-17').map((e) => e.id)).toEqual(['b', 'a'])
  })

  it('여러 날 행사는 끝난 다음 날부터 기록이 된다', () => {
    expect(pastEvents(list, '2026-10-18').map((e) => e.id)).toEqual(['multi', 'b', 'a'])
  })

  it('빈 목록도 그대로 다룬다', () => {
    expect(pastEvents([], '2026-10-17')).toEqual([])
  })
})

describe('groupByGeneration', () => {
  it('큰 기수부터, 기수 없는 행사는 맨 뒤', () => {
    const groups = groupByGeneration([ev('x', '2024-01-01', 'event'), ev('a', '2025-11-06', 'session', 3), ev('b', '2026-09-15', 'recruit', 4), ev('c', '2025-10-01', 'event', 3)])
    expect(groups.map((g) => g.gen)).toEqual([4, 3, null])
    expect(groups[1].events.map((e) => e.id)).toEqual(['a', 'c'])
  })

  it('기록에 있는 기수 목록', () => {
    expect(generationsIn([ev('a', '2025-01-01', 'event', 2), ev('b', '2025-01-01', 'event'), ev('c', '2025-01-01', 'event', 3), ev('d', '2025-01-01', 'event', 2)])).toEqual([3, 2])
  })
})

describe('종류 거르기', () => {
  it('G-Sprint 단계는 프로젝트로, 공지는 전체에만', () => {
    expect(matchesKind({ kind: 'sprint' }, 'project')).toBe(true)
    expect(matchesKind({ kind: 'notice' }, 'event')).toBe(false)
    expect(matchesKind({ kind: 'notice' }, 'all')).toBe(true)
  })

  it('종류별 개수', () => {
    const counts = kindCounts([ev('a', '2025-01-01', 'session'), ev('b', '2025-01-01', 'sprint'), ev('c', '2025-01-01', 'project'), ev('d', '2025-01-01', 'notice')])
    expect(counts).toEqual({ all: 4, session: 1, event: 0, project: 2, recruit: 0 })
  })

  it('주소의 값이 맞는 종류인지 확인한다', () => {
    expect(isKindFilter('session')).toBe(true)
    expect(isKindFilter('rest')).toBe(false)
    expect(isKindFilter(null)).toBe(false)
  })
})

describe('generationRange', () => {
  it('기수 기간 표기', () => {
    expect(generationRange({ start: '2025-09', end: '2026-06' })).toBe('2025.09~2026.06')
    expect(generationRange({ start: '2026-09', current: true })).toBe('2026.09~지금')
    expect(generationRange({ start: '2023-09' })).toBe('2023.09~')
    expect(generationRange({ end: '2024-06' })).toBeNull()
    expect(generationRange({})).toBeNull()
  })
})
