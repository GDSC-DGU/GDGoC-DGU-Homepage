import { useId, useState } from 'react'
import type { ScheduleEvent } from '@/domain/types'
import { MonthCalendar } from './MonthCalendar'
import s from './now.module.css'

/** '달력으로 보기' 단추 + 펼치면 월 달력. 홈 '지금 4기는' 과 커뮤니티 '다가오는 일정' 이 같이 쓴다 */
export function CalendarToggle({ events, today }: { events: readonly ScheduleEvent[]; today: string }) {
  const calId = useId()
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className={s.toggle} aria-expanded={open} aria-controls={calId} onClick={() => setOpen((o) => !o)}>
        {open ? '달력 접기' : '달력으로 보기'}
        <svg className={s.toggleIcon} width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div id={calId} className={s.calWrap} hidden={!open}>
        {open && <MonthCalendar id={`${calId}-cal`} events={events} today={today} />}
      </div>
    </>
  )
}
