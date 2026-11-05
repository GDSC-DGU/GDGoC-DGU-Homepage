import { EVENTS, RECRUITING } from '@/content'
import type { ScheduleEvent } from '@/domain/types'
import { weekday } from '@/lib/date'

/**
 * 홈 '{n}기의 1년' 타임라인: 일반 멤버 모집 → OT → 정기 세션 → G-Sprint → 수료 (가로 한 줄, AI 티 점검 2026-11-05).
 * 모집 날짜는 일반 멤버 모집 기간이라 이름도 '일반 멤버 모집' (코어 모집은 8월부터: 문구 검토 2026-11-05).
 * 5기 일정이 정해지기 전이라 날짜는 4기 실제 기록에서 계산한다 (4기 Organizer 결정 2026-11).
 * - 모집 · OT: recruiting.json 의 4기 단계 (일반 멤버 모집 · 4기 OT)
 * - 세미나: OT 뒤 첫 정기 세션 날짜 + 그 요일 (events.json)
 * - G-Sprint: 첫 sprint 일정(킥오프) ~ 마지막 sprint 일정(데모데이) (events.json)
 * - 수료: 기수 활동이 끝나는 달 (PLANNED_END. 4기는 2027.07: faq when-sessions '2027년 7월까지' · 4기 Organizer 2026-11-05). 없으면 '미정'
 * 제목도 날짜와 같은 기수(4기)를 쓴다. 다음 기수(5기) 이름에 4기 날짜를 붙이면 '5기 모집이 9월에 끝났다'로 읽혀
 * 지원 안내('5기 모집은 아직')와 어긋난다 (전체 점검 2026-11-03). 5기 일정이 정해지면 BASE_GEN 을 5 로 바꾼다.
 */
export const BASE_GEN = 4

export interface TimelineStep {
  id: 'recruit' | 'ot' | 'seminar' | 'sprint' | 'graduation'
  title: string
  /** 보이는 날짜 줄. 기록이 없으면 '미정' */
  when: string
  /** 시작 · 끝 날 (YYYY-MM-DD). '지금' 표시를 고를 때만 쓴다. 정기 세션처럼 끝이 없으면 end 를 비운다 */
  start?: string
  end?: string
}

const dot = (ymd: string) => ymd.replaceAll('-', '.')
/** '2026.09.03–09.10' (같은 해면 뒤 날짜에서 해를 뺀다. 기간 표기는 사이트 전체 '–' 하나: docs/CONTENT.md 1-1) */
const span = (a: string, b: string) => (a.slice(0, 4) === b.slice(0, 4) ? `${dot(a)}–${dot(b).slice(5)}` : `${dot(a)}–${dot(b)}`)

/** 지금 기수의 활동이 끝나는 달 (generations.json 은 끝난 기수에만 end 를 적는다) */
const PLANNED_END: Readonly<Record<number, string>> = { 4: '2027.07' }

export function timelineSteps(gen: number = BASE_GEN, events: readonly ScheduleEvent[] = EVENTS, recruiting: typeof RECRUITING = RECRUITING): TimelineStep[] {
  const steps = recruiting.history.find((h) => h.generation === gen)?.steps ?? []
  const general = steps.find((s) => s.id === 'general')
  const ot = steps.find((s) => s.id === 'ot')
  const mine = events.filter((e) => e.generation === gen).sort((a, b) => a.date.localeCompare(b.date))
  const firstSession = mine.find((e) => e.kind === 'session' && (!ot || e.date > ot.start))
  const sprints = mine.filter((e) => e.kind === 'sprint')
  const last = sprints.at(-1)

  const sprintEnd = last ? (last.endDate ?? last.date) : undefined
  const endMonth = PLANNED_END[gen]
  return [
    { id: 'recruit', title: '일반 멤버 모집', when: general?.end ? span(general.start, general.end) : '미정', start: general?.end ? general.start : undefined, end: general?.end },
    { id: 'ot', title: `${gen}기 OT`, when: ot ? dot(ot.start) : '미정', start: ot?.start, end: ot?.start },
    { id: 'seminar', title: '정기 세션', when: firstSession ? `${dot(firstSession.date)}부터 매주 ${weekday(firstSession.date)}요일` : '미정', start: firstSession?.date },
    { id: 'sprint', title: 'G-Sprint', when: sprints[0] && sprintEnd ? span(sprints[0].date, sprintEnd) : '미정', start: sprintEnd ? sprints[0]?.date : undefined, end: sprintEnd },
    { id: 'graduation', title: `${gen}기 수료`, when: endMonth ?? '미정' },
  ]
}

/**
 * '지금' 단계: 오늘까지 시작한 마지막 단계. 그 단계가 이미 끝났으면 없음 (다음 단계가 정해지지 않은 사이).
 * 정기 세션은 끝이 없어서, G-Sprint 가 시작하기 전까지는 정기 세션이 '지금'이다.
 */
export function currentStep(steps: readonly TimelineStep[], today: string): TimelineStep['id'] | null {
  const started = steps.filter((s) => s.start && s.start <= today)
  const now = started.at(-1)
  if (!now) return null
  return now.end && now.end < today ? null : now.id
}
