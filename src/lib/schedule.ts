import type { ScheduleEvent } from '@/domain/types'
import { monthDay, weekday } from './date'

/**
 * 일정 목록 계산. 서버가 순서를 안 맞춰 보내도 화면은 날짜순으로 보여준다.
 */

/** 오늘 이후(오늘 포함, 여러 날 행사는 끝나는 날 기준) 일정을 날짜순으로. 휴회는 기본으로 뺀다 */
export function upcomingEvents(
  events: readonly ScheduleEvent[],
  today: string,
  { includeRest = false, limit = Infinity }: { includeRest?: boolean; limit?: number } = {},
): ScheduleEvent[] {
  return events
    .filter((e) => (e.endDate ?? e.date) >= today && (includeRest || e.kind !== 'rest'))
    .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))
    .slice(0, limit)
}

/** 그 달에 걸친 일정 (여러 날 행사가 달을 넘어가도 포함) */
export function eventsInMonth(events: readonly ScheduleEvent[], year: number, month: number): ScheduleEvent[] {
  const first = `${year}-${String(month).padStart(2, '0')}-01`
  const last = `${year}-${String(month).padStart(2, '0')}-31`
  return events.filter((e) => e.date <= last && (e.endDate ?? e.date) >= first).sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * 날짜 표시.
 * 하루: '10.27 (화)' · 같은 달: '01.30~31' · 달이 다름: '10.31~11.02' · 해가 다름: '2026.12.31~2027.01.01'
 */
export function rangeLabel(e: Pick<ScheduleEvent, 'date' | 'endDate'>): string {
  const { date, endDate } = e
  if (!endDate || endDate === date) return `${monthDay(date)} (${weekday(date)})`
  if (date.slice(0, 4) !== endDate.slice(0, 4)) return `${date.slice(0, 4)}.${monthDay(date)}~${endDate.slice(0, 4)}.${monthDay(endDate)}`
  if (date.slice(0, 7) !== endDate.slice(0, 7)) return `${monthDay(date)}~${monthDay(endDate)}`
  return `${monthDay(date)}~${endDate.slice(8, 10)}`
}
