import { EVENTS, RECRUITING } from '@/content'
import type { ScheduleEvent } from '@/domain/types'
import { weekday } from '@/lib/date'

/**
 * 홈 '한 기수의 1년' 타임라인 (4기 Figma 시안 2026-11): 모집 → OT & 뒤풀이 → 세미나 → G-Sprint → 수료.
 * 5기 일정이 정해지기 전이라 날짜는 4기 실제 기록에서 계산한다 (4기 Organizer 결정 2026-11).
 * - 모집 · OT: recruiting.json 의 4기 단계 (일반 멤버 모집 · 4기 OT)
 * - 세미나: OT 뒤 첫 정기 세션 날짜 + 그 요일 (events.json)
 * - G-Sprint: 첫 sprint 일정(킥오프) ~ 마지막 sprint 일정(데모데이) (events.json)
 * - 수료: 4기는 아직 정해지지 않았다 → 날짜 대신 '미정'
 * 제목도 날짜와 같은 기수(4기)를 쓴다. 다음 기수(5기) 이름에 4기 날짜를 붙이면 '5기 모집이 9월에 끝났다'로 읽혀
 * 지원 안내('5기 모집은 아직')와 어긋난다 (전체 점검 2026-11-03). 5기 일정이 정해지면 BASE_GEN 을 5 로 바꾼다.
 */
export const BASE_GEN = 4

export type Mascot = 'hello' | 'coding' | 'graduation'

export interface TimelineStep {
  id: 'recruit' | 'ot' | 'seminar' | 'sprint' | 'graduation'
  title: string
  /** 보이는 날짜 줄. 기록이 없으면 '미정' */
  when: string
}

const dot = (ymd: string) => ymd.replaceAll('-', '.')
/** '2026.09.03 ~ 09.10' (같은 해면 뒤 날짜에서 해를 뺀다) */
const span = (a: string, b: string) => (a.slice(0, 4) === b.slice(0, 4) ? `${dot(a)} ~ ${dot(b).slice(5)}` : `${dot(a)} ~ ${dot(b)}`)

export function timelineSteps(gen: number = BASE_GEN, events: readonly ScheduleEvent[] = EVENTS, recruiting: typeof RECRUITING = RECRUITING): TimelineStep[] {
  const steps = recruiting.history.find((h) => h.generation === gen)?.steps ?? []
  const general = steps.find((s) => s.id === 'general')
  const ot = steps.find((s) => s.id === 'ot')
  const mine = events.filter((e) => e.generation === gen).sort((a, b) => a.date.localeCompare(b.date))
  const firstSession = mine.find((e) => e.kind === 'session' && (!ot || e.date > ot.start))
  const sprints = mine.filter((e) => e.kind === 'sprint')
  const last = sprints.at(-1)

  return [
    { id: 'recruit', title: `GDGoC DGU ${gen}기 모집`, when: general?.end ? span(general.start, general.end) : '미정' },
    { id: 'ot', title: 'OT & 뒤풀이', when: ot ? dot(ot.start) : '미정' },
    { id: 'seminar', title: '세미나', when: firstSession ? `${dot(firstSession.date)}부터 매주 ${weekday(firstSession.date)}요일` : '미정' },
    { id: 'sprint', title: 'G-Sprint', when: sprints[0] && last ? span(sprints[0].date, last.endDate ?? last.date) : '미정' },
    { id: 'graduation', title: `${gen}기 수료`, when: '미정' },
  ]
}
