import { describe, expect, it } from 'vitest'
import type { ScheduleEvent } from '@/domain/types'
import { EVENTS } from './index'
import { isPlanOnly, isStalePlan, withoutStalePlans } from './plan'

const PLAN = '4기 운영 계획'
const PAGE = 'https://gdg.community.dev/events/details/x/'
const ev = (id: string, date: string, extra: Partial<ScheduleEvent> = {}): ScheduleEvent => ({ id, date, title: id, kind: 'session', place: 'community', source: PLAN, ...extra })

describe('isPlanOnly: 운영 계획에만 있는 일정', () => {
  it('출처가 운영 계획이고 공개 페이지가 없으면 계획', () => {
    expect(isPlanOnly(ev('a', '2026-10-27'))).toBe(true)
  })
  it('공개 페이지가 생기면 계획이 아니다 (출처 글이 그대로여도)', () => {
    expect(isPlanOnly(ev('a', '2026-10-27', { url: PAGE }))).toBe(false)
    expect(isPlanOnly(ev('a', '2026-10-27', { url: PAGE, source: PAGE }))).toBe(false)
  })
  it('출처가 없거나 다른 글이면 계획이 아니다', () => {
    expect(isPlanOnly(ev('a', '2026-10-27', { source: undefined }))).toBe(false)
    expect(isPlanOnly(ev('a', '2026-10-27', { source: '인스타그램 게시물' }))).toBe(false)
  })
})

describe('isStalePlan: 날짜가 지난 계획 일정', () => {
  const plan = ev('mid', '2026-10-27')
  it('그날까지는 남기고, 다음 날부터 지난 계획', () => {
    expect(isStalePlan(plan, '2026-10-26')).toBe(false)
    expect(isStalePlan(plan, '2026-10-27')).toBe(false)
    expect(isStalePlan(plan, '2026-10-28')).toBe(true)
  })
  it('여러 날 일정은 마지막 날 기준', () => {
    const thon = ev('thon', '2027-01-30', { endDate: '2027-01-31' })
    expect(isStalePlan(thon, '2027-01-31')).toBe(false)
    expect(isStalePlan(thon, '2027-02-01')).toBe(true)
  })
  it('공개 페이지가 있는 지난 행사는 기록이라 남긴다', () => {
    expect(isStalePlan(ev('ot', '2026-09-15', { url: PAGE, source: PAGE }), '2026-10-18')).toBe(false)
  })
})

describe('withoutStalePlans', () => {
  it('지난 계획만 빼고 순서는 그대로', () => {
    const list = [ev('old-plan', '2026-10-20'), ev('ot', '2026-09-15', { url: PAGE, source: PAGE }), ev('next-plan', '2026-11-02')]
    expect(withoutStalePlans(list, '2026-10-28').map((e) => e.id)).toEqual(['ot', 'next-plan'])
  })
  it('뺄 것이 없으면 같은 배열 (useMemo 의존성이 흔들리지 않게)', () => {
    const list = [ev('next-plan', '2026-11-02')]
    expect(withoutStalePlans(list, '2026-10-28')).toBe(list)
  })
  it('실제 콘텐츠: 4기 계획 일정은 날짜가 지나면 하나씩 빠진다', () => {
    const plans = EVENTS.filter((e) => isPlanOnly(e))
    expect(plans.length).toBeGreaterThan(0)
    const lastDay = plans.map((e) => e.endDate ?? e.date).sort().at(-1)!
    const after = withoutStalePlans(EVENTS, `${+lastDay.slice(0, 4) + 1}-01-01`)
    expect(after.some((e) => isPlanOnly(e))).toBe(false)
    expect(after.length).toBe(EVENTS.length - plans.length)
  })
})
