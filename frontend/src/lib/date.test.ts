import { describe, expect, it } from 'vitest'
import { daysUntil, ddayLabel, kstToday, monthGrid, shiftMonth, shortDate, weekday } from './date'

describe('date', () => {
  it('한국 시간으로 오늘 날짜를 만든다 (UTC 15시는 한국 다음 날 0시)', () => {
    expect(kstToday(new Date('2026-10-16T14:59:00Z'))).toBe('2026-10-16')
    expect(kstToday(new Date('2026-10-16T15:00:00Z'))).toBe('2026-10-17')
  })

  it('남은 날 수와 D-day 표기', () => {
    expect(daysUntil('2026-10-27', '2026-10-16')).toBe(11)
    expect(ddayLabel('2026-12-29', '2026-10-16')).toBe('D-74')
    expect(ddayLabel('2026-10-16', '2026-10-16')).toBe('D-day')
    expect(ddayLabel('2026-10-01', '2026-10-16')).toBe('종료')
  })

  it('요일과 짧은 날짜', () => {
    expect(weekday('2026-12-01')).toBe('화')
    expect(weekday('2027-01-30')).toBe('토')
    expect(shortDate('2026-10-27', '2026-10-16')).toBe('10.27')
    expect(shortDate('2027-01-30', '2026-10-16')).toBe('2027.01.30')
  })

  it('월 달력은 일요일부터 6주', () => {
    const cells = monthGrid(2026, 10)
    expect(cells).toHaveLength(42)
    expect(cells[0]).toEqual({ ymd: '2026-09-27', inMonth: false })
    expect(cells.find((c) => c.ymd === '2026-10-01')?.inMonth).toBe(true)
  })

  it('달을 넘긴다', () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 })
    expect(shiftMonth(2027, 1, -1)).toEqual({ year: 2026, month: 12 })
  })
})
