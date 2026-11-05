import { isPlanOnly } from '@/content/plan'
import type { ScheduleEvent } from '@/domain/types'
import { dayValue } from '@/lib/date'
import { addDays } from '@/lib/rail'

/**
 * 커뮤니티 '이번 주' 계산. 화면과 상관없는 날짜 계산만 둔다. thisWeek.test.ts 에 테스트.
 *
 * '이번 주' 는 모임 주기로 센다: 오늘부터 다가오는 모임 요일(화요일)까지.
 * 토요일에 보면 다음 화요일이, 화요일에 보면 오늘이 '이번 주 모임'이다.
 */

/**
 * 4기 정기 세션: 매주 화요일 저녁 6시. 출처는 faq.json 의 when-sessions (4기 지원서).
 * 이 시간은 4기 화요일의 세션 · G-Sprint 단계에만 붙인다. MT · 연합 행사처럼 따로 여는 행사에는 붙이지 않는다.
 * 그 FAQ 가 없어지면 시간도 화면에서 사라진다 (CommunityPage 가 FAQ 출처를 함께 확인한다).
 */
export const REGULAR_SESSION = {
  generation: 4,
  /** 0 = 일 … 6 = 토 */
  weekday: 2,
  time: '18:00',
  faqId: 'when-sessions',
} as const

/** 여러 날에 걸친 기간인지 (G-Sprint 팀별 개발 기간 · 동지톤 등) */
export const isPeriod = (e: Pick<ScheduleEvent, 'date' | 'endDate'>) => Boolean(e.endDate && e.endDate !== e.date)

const dow = (ymd: string) => new Date(dayValue(ymd)).getUTCDay()
const endOf = (e: Pick<ScheduleEvent, 'date' | 'endDate'>) => e.endDate ?? e.date
const covers = (e: Pick<ScheduleEvent, 'date' | 'endDate'>, ymd: string) => e.date <= ymd && endOf(e) >= ymd
const byDate = (a: ScheduleEvent, b: ScheduleEvent) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, 'ko')

/** 오늘부터 다가오는 모임 요일까지. 오늘이 그 요일이면 오늘 하루 */
export function meetingCycle(today: string, weekday: number = REGULAR_SESSION.weekday): { from: string; meet: string } {
  return { from: today, meet: addDays(today, (weekday - dow(today) + 7) % 7) }
}

/**
 * 정기 세션 시간이 붙는 일정인지: 그 기수 · 모임 요일 · 세션이나 G-Sprint 단계.
 * 운영 계획에만 있는 일정(공개 행사 페이지 없음)에는 붙이지 않는다: 특강 · 데모데이는 정기 세션 시간과 다를 수 있다 (4기 Organizer 2026-11-05)
 */
export function regularTime(e: ScheduleEvent, rule: { generation: number; weekday: number; time: string } = REGULAR_SESSION): string | null {
  if (e.generation !== rule.generation) return null
  if (isPlanOnly(e)) return null
  if (e.kind !== 'session' && e.kind !== 'sprint') return null
  if (e.endDate && e.endDate !== e.date) return null
  return dow(e.date) === rule.weekday ? rule.time : null
}

export type WeekStatus =
  /** 모임 요일이 휴회 */
  | 'rest'
  /** 모임 요일에 공개된 일정이 있다 */
  | 'meet'
  /** 모임 요일인데 공개된 일정이 없다 (뒤로 일정이 더 있다) */
  | 'quiet'
  /** 다가오는 일정이 하나도 없다 (기수 활동이 끝났거나 아직 일정을 올리지 않음) */
  | 'off'

export interface WeekState {
  status: WeekStatus
  from: string
  /** 이번 주 모임 요일 (YYYY-MM-DD) */
  meet: string
  /** 모임 요일의 휴회 */
  rest: ScheduleEvent | null
  /** 모임 요일의 일정 (휴회 제외) */
  meeting: ScheduleEvent[]
  /** 오늘부터 모임 요일 전날까지 있는 다른 일정 (휴회 제외) */
  others: ScheduleEvent[]
  /** '다음 일정': 이번 주 모임 다음으로 열리는 일정 (휴회 제외). 이번 주에 모이지 않으면 다가오는 첫 일정 */
  next: ScheduleEvent | null
}

export function weekState(events: readonly ScheduleEvent[], today: string, weekday: number = REGULAR_SESSION.weekday): WeekState {
  const { from, meet } = meetingCycle(today, weekday)
  const ahead = events.filter((e) => endOf(e) >= today).sort(byDate)
  const real = ahead.filter((e) => e.kind !== 'rest')
  const rest = ahead.find((e) => e.kind === 'rest' && covers(e, meet)) ?? null
  const meeting = rest ? [] : real.filter((e) => covers(e, meet))
  const others = real.filter((e) => !covers(e, meet) && e.date <= meet)
  const next = meeting.length > 0 ? (real.find((e) => e.date > meet) ?? null) : (real[0] ?? null)
  const status: WeekStatus = rest ? 'rest' : meeting.length > 0 ? 'meet' : real.length > 0 ? 'quiet' : 'off'
  return { status, from, meet, rest, meeting, others, next }
}
