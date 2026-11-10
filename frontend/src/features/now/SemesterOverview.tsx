import { useMemo } from 'react'
import { SPRINT } from '@/config/site'
import { withoutStalePlans } from '@/content/plan'
import type { ScheduleEvent } from '@/domain/types'
import { eventsInPeriod, railPeriod, sprintWindow, type Period } from '@/lib/rail'
import { SemesterRail } from './SemesterRail'
import { SprintLine } from './SprintLine'

interface Props {
  /** 모든 일정 (지난 것 · 휴회 포함) */
  events: readonly ScheduleEvent[]
  today: string
  /** 이 기수의 일정만 (지원 안내: '4기 한 학기') */
  generation?: number
  /** 기간을 정해 그릴 때. 없으면 홈과 같은 규칙(지금 기수 일정이 있는 반년) */
  period?: Period
  linkedId?: string | null
}

/**
 * 학기 레일 + G-Sprint 한 줄. 홈 '지금 4기는' 의 그림을 다른 페이지(커뮤니티 · 지원 안내)에서 그대로 쓴다.
 * 바깥 섹션 머리 · 여백은 쓰는 페이지가 정한다.
 */
export function SemesterOverview({ events, today, generation, period: fixed, linkedId = null }: Props) {
  // 날짜가 지났는데 계획으로만 남은 일정은 그리지 않는다 (content/plan.ts)
  const pool = useMemo(() => {
    const shown = withoutStalePlans(events, today)
    return generation == null ? shown : shown.filter((e) => e.generation === generation)
  }, [events, generation, today])
  const period = useMemo(() => fixed ?? railPeriod(pool, today), [fixed, pool, today])
  const inRail = useMemo(() => eventsInPeriod(pool, period), [pool, period])
  const sprint = useMemo(
    () =>
      sprintWindow(
        SPRINT.steps.map((st) => ({ label: st.label, date: st.date })),
        SPRINT.demoDay,
        inRail,
      ),
    [inRail],
  )
  return (
    <div>
      <SemesterRail period={period} events={inRail} today={today} sprint={sprint} linkedId={linkedId} />
      {sprint && <SprintLine sprint={sprint} />}
    </div>
  )
}
