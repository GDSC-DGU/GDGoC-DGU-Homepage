import { describe, expect, it } from 'vitest'
import type { ScheduleEvent } from '@/domain/types'
import { eventsInMonth, rangeLabel, upcomingEvents } from './schedule'

const ev = (id: string, date: string, kind: ScheduleEvent['kind'] = 'event', endDate?: string): ScheduleEvent => ({
  id,
  date,
  endDate,
  title: id,
  kind,
  place: 'community',
})

describe('upcomingEvents', () => {
  const list = [ev('c', '2026-12-29'), ev('rest', '2026-10-20', 'rest'), ev('a', '2026-10-27'), ev('old', '2026-09-01'), ev('multi', '2026-10-10', 'event', '2026-10-16')]

  it('날짜순으로 정렬하고 지난 일정과 휴회를 뺀다', () => {
    expect(upcomingEvents(list, '2026-10-16').map((e) => e.id)).toEqual(['multi', 'a', 'c'])
  })

  it('여러 날 행사는 끝나는 날까지 남는다', () => {
    expect(upcomingEvents(list, '2026-10-17').map((e) => e.id)).toEqual(['a', 'c'])
  })

  it('휴회를 넣고 개수를 자를 수 있다', () => {
    expect(upcomingEvents(list, '2026-10-17', { includeRest: true, limit: 2 }).map((e) => e.id)).toEqual(['rest', 'a'])
  })
})

describe('eventsInMonth', () => {
  it('달을 넘는 행사도 두 달에 모두 나온다', () => {
    const e = ev('x', '2026-10-31', 'event', '2026-11-02')
    expect(eventsInMonth([e], 2026, 10)).toHaveLength(1)
    expect(eventsInMonth([e], 2026, 11)).toHaveLength(1)
    expect(eventsInMonth([e], 2026, 12)).toHaveLength(0)
  })
})

describe('rangeLabel', () => {
  it('하루짜리는 요일을 붙인다', () => {
    expect(rangeLabel({ date: '2026-10-27' })).toBe('10.27 (화)')
  })
  it('같은 달', () => {
    expect(rangeLabel({ date: '2027-01-30', endDate: '2027-01-31' })).toBe('01.30~31')
  })
  it('달이 다르면 달을 다시 쓴다 (10.31~02 처럼 헷갈리지 않게)', () => {
    expect(rangeLabel({ date: '2026-10-31', endDate: '2026-11-02' })).toBe('10.31~11.02')
  })
  it('해가 다르면 연도까지', () => {
    expect(rangeLabel({ date: '2026-12-31', endDate: '2027-01-01' })).toBe('2026.12.31~2027.01.01')
  })
})
