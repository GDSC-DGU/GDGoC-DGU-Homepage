import { useId, useState } from 'react'
import type { ScheduleEvent } from '@/domain/types'
import { MonthCalendar } from '@/features/now/MonthCalendar'
import { SemesterOverview } from '@/features/now/SemesterOverview'
import c from './community.module.css'

/**
 * '학기 한눈에 · 달력': 학기 레일과 월 달력을 펼침 하나에 모은다.
 * 처음 화면에는 시간표(진주 줄)만 두어, 같은 일정을 세 번 겹쳐 보여 주지 않는다.
 */
export function OverviewToggle({ events, today }: { events: readonly ScheduleEvent[]; today: string }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  return (
    <div className={c.overviewToggle}>
      <button type="button" className={c.toggle} aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        {open ? '달력 접기' : '달력으로 보기'}
        <svg className={c.toggleIcon} width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div id={id} hidden={!open}>
        {open && (
          <>
            <div className={c.overview}>
              <SemesterOverview events={events} today={today} />
            </div>
            <MonthCalendar id={`${id}-cal`} events={events} today={today} />
          </>
        )}
      </div>
    </div>
  )
}
