import { useMemo, useState, type CSSProperties } from 'react'
import { KIND_LABEL } from '@/config/kinds'
import { placeColor } from '@/config/places'
import { withoutStalePlans } from '@/content/plan'
import type { ScheduleEvent } from '@/domain/types'
import { monthGrid, shiftMonth, weekday } from '@/lib/date'
import { addDays, spanLabel } from '@/lib/rail'
import { eventsInMonth } from '@/lib/schedule'
import s from './now.module.css'

const WEEK = ['일', '월', '화', '수', '목', '금', '토']
/** 4기 정기 모임 요일 (열에 옅은 면) */
const MEET_DAY = 2

/** 날짜별 일정 (여러 날 행사는 날마다 넣는다) */
function byDay(events: readonly ScheduleEvent[]): Map<string, ScheduleEvent[]> {
  const map = new Map<string, ScheduleEvent[]>()
  for (const e of events) {
    for (let d = e.date; d <= (e.endDate ?? e.date); d = addDays(d, 1)) map.set(d, [...(map.get(d) ?? []), e])
  }
  return map
}

const Chevron = ({ dir }: { dir: 'prev' | 'next' }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <path d={dir === 'prev' ? 'M10 3.5 5.5 8 10 12.5' : 'M6 3.5 10.5 8 6 12.5'} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

interface Props {
  id: string
  events: readonly ScheduleEvent[]
  today: string
}

/**
 * 월 달력. 화면 읽기 프로그램에는 표로 읽힌다 (주 = 행, 날짜 = 칸).
 * 칸 상자 없이 가로 괘선만, 화요일 열에 옅은 면. 폰에서는 칸에 표식만 두고 그 달 일정을 아래 목록으로 보여준다.
 */
export function MonthCalendar({ id, events: all, today }: Props) {
  const [ym, setYm] = useState(() => ({ year: +today.slice(0, 4), month: +today.slice(5, 7) }))
  // 날짜가 지났는데 계획으로만 남은 일정은 칸에 올리지 않는다 (content/plan.ts)
  const events = useMemo(() => withoutStalePlans(all, today), [all, today])
  const days = useMemo(() => byDay(events), [events])
  const cells = monthGrid(ym.year, ym.month)
  // 6주 고정 달력에서 그 달 날짜가 하나도 없는 마지막 주는 뺀다
  const weeks = Array.from({ length: 6 }, (_, w) => cells.slice(w * 7, w * 7 + 7)).filter((week) => week.some((c) => c.inMonth))
  const monthEvents = eventsInMonth(events, ym.year, ym.month)
  const title = `${ym.year}년 ${ym.month}월`

  return (
    <div id={id} className={s.cal}>
      <div className={s.calBar}>
        <h3 className={`${s.calTitle} num`} aria-live="polite">
          {title}
        </h3>
        <div className={s.calNav}>
          <button type="button" onClick={() => setYm(shiftMonth(ym.year, ym.month, -1))} aria-label="이전 달">
            <Chevron dir="prev" />
          </button>
          <button type="button" onClick={() => setYm(shiftMonth(ym.year, ym.month, 1))} aria-label="다음 달">
            <Chevron dir="next" />
          </button>
        </div>
      </div>

      <div className={s.calTable} role="table" aria-label={`${title} 일정`}>
        <div className={s.calRow} role="row">
          {WEEK.map((w, i) => (
            <div key={w} className={s.calHead} role="columnheader" data-meet={i === MEET_DAY || undefined}>
              {w}
            </div>
          ))}
        </div>
        {weeks.map((week) => (
          <div key={week[0].ymd} className={s.calRow} role="row">
            {week.map((c, i) => {
              const list = c.inMonth ? (days.get(c.ymd) ?? []) : []
              const isToday = c.ymd === today
              return (
                <div
                  key={c.ymd}
                  className={s.cell}
                  role="cell"
                  data-meet={i === MEET_DAY || undefined}
                  data-weekend={i === 0 || i === 6 || undefined}
                  data-today={(c.inMonth && isToday) || undefined}
                >
                  {c.inMonth && (
                    <>
                      <span className={`${s.dayNum} num`} aria-hidden="true">
                        {+c.ymd.slice(8)}
                      </span>
                      <span className="visually-hidden">
                        {+c.ymd.slice(5, 7)}월 {+c.ymd.slice(8)}일 {weekday(c.ymd)}요일{isToday && ', 오늘'}
                        {list.length === 0 && ', 일정 없음'}
                      </span>
                    </>
                  )}
                  {list.length > 0 && (
                    <ul className={s.cellEvents}>
                      {list.map((e) => {
                        // 여러 날 일정은 첫날(이 달에 이어서 시작하면 이 달 1일)에만 이름을 쓰고, 나머지 날은 이어지는 띠만.
                        // 주마다 첫 칸(일요일)에 이름을 다시 쓰면 일요일 일정처럼 읽혔다 (4기 Organizer 2026-11-06)
                        const labelDay = e.date < `${c.ymd.slice(0, 8)}01` ? `${c.ymd.slice(0, 8)}01` : e.date
                        const cont = Boolean(e.endDate && e.endDate !== e.date && c.ymd !== labelDay)
                        return cont ? (
                          <li key={e.id} data-cont="">
                            <i className={s.contBar} style={{ '--c': placeColor(e.place) } as CSSProperties} aria-hidden="true" />
                            <span className="visually-hidden">{e.title}</span>
                          </li>
                        ) : (
                          <li key={e.id} data-rest={e.kind === 'rest' || undefined}>
                            {e.kind === 'rest' ? (
                              <i className={`${s.restSq} ${s.phoneOnly}`} aria-hidden="true" />
                            ) : (
                              <i className="mark" style={{ '--c': placeColor(e.place) } as CSSProperties} aria-hidden="true" />
                            )}
                            <span className={s.cellTitle}>{e.title}</span>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* 폰: 칸이 좁아 제목 대신 표식만 두므로, 그 달 일정을 목록으로 한 번 더 보여준다 */}
      <ul className={s.calList} aria-label={`${title} 일정 목록`}>
        {monthEvents.length === 0 && <li className={s.calEmpty}>이 달에는 등록된 일정이 없습니다.</li>}
        {monthEvents.map((e) => (
          <li key={e.id} data-rest={e.kind === 'rest' || undefined}>
            <span className={`${s.calListWhen} num`}>{spanLabel(e, today)}</span>
            <span className={s.calListTitle}>{e.title}</span>
            <span className={s.calListKind}>
              {e.kind === 'rest' ? <i className={s.restSq} aria-hidden="true" /> : <i className="mark" style={{ '--c': placeColor(e.place) } as CSSProperties} aria-hidden="true" />}
              {KIND_LABEL[e.kind]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
