/**
 * 날짜는 모두 한국 시간 기준 'YYYY-MM-DD' 문자열로 다룬다.
 * Date 객체를 바로 쓰면 보는 사람 컴퓨터의 시간대에 따라 하루씩 밀릴 수 있어서다.
 */

const WEEKDAYS = '일월화수목금토'

/** 지금 한국 날짜 */
export function kstToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(now)
}

/** 'YYYY-MM-DD' → 그날 0시(UTC) 밀리초. 날짜끼리 빼기용 */
export function dayValue(ymd: string): number {
  return Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10))
}

export const isYmd = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s)

/** 남은 날 수. 오늘이면 0, 지났으면 음수 */
export function daysUntil(target: string, today: string): number {
  return Math.round((dayValue(target) - dayValue(today)) / 86_400_000)
}

/** D-11, D-day, 지났으면 '종료' */
export function ddayLabel(target: string, today: string): string {
  const n = daysUntil(target, today)
  if (n > 0) return `D-${n}`
  if (n === 0) return 'D-day'
  return '종료'
}

/** '10.27' */
export const monthDay = (ymd: string) => `${ymd.slice(5, 7)}.${ymd.slice(8, 10)}`

/** '화' */
export const weekday = (ymd: string) => WEEKDAYS[new Date(dayValue(ymd)).getUTCDay()]

/** 올해가 아니면 연도를 붙인다: '10.27' / '2027.01.30' */
export function shortDate(ymd: string, today: string): string {
  return ymd.slice(0, 4) === today.slice(0, 4) ? monthDay(ymd) : `${ymd.slice(0, 4)}.${monthDay(ymd)}`
}

export interface CalendarCell {
  ymd: string
  inMonth: boolean
}

/** 월 달력 칸 (일요일 시작, 6주 고정) */
export function monthGrid(year: number, month: number): CalendarCell[] {
  const first = new Date(Date.UTC(year, month - 1, 1))
  const start = Date.UTC(year, month - 1, 1 - first.getUTCDay())
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start + i * 86_400_000)
    const ymd = d.toISOString().slice(0, 10)
    return { ymd, inMonth: d.getUTCMonth() === month - 1 }
  })
}

/** 한 달 앞뒤로 이동 */
export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const i = year * 12 + (month - 1) + delta
  return { year: Math.floor(i / 12), month: (i % 12) + 1 }
}
