import type { CSSProperties } from 'react'
import { KIND_LABEL } from '@/config/kinds'
import { placeColor } from '@/config/places'
import type { TermId } from '@/content/glossary'
import type { ScheduleEvent } from '@/domain/types'
import { ticketDday } from '@/features/common/ticketData'
import { monthDay, weekday } from '@/lib/date'
import { RoomPlate } from './Signage'
import { isPeriod } from './thisWeek'
import { mentionKey } from './terms'
import { TermText } from './TermText'
import c from './community.module.css'

interface Props {
  /** 오늘 이후 일정 (휴회 포함), 날짜순 */
  events: readonly ScheduleEvent[]
  today: string
  timeOf: (e: ScheduleEvent) => string | null
  /** 처음 나오는 용어 풀이: mentionKey.line(e) → 용어 (terms.ts) */
  terms?: ReadonlyMap<string, readonly TermId[]>
}

/** 날짜 칸: '10.27' + '화'. 여러 날이면 '01.30–31 토–일'. 올해가 아니면 앞에 연도 */
function Day({ e, today }: { e: ScheduleEvent; today: string }) {
  const multi = e.endDate && e.endDate !== e.date ? e.endDate : null
  const sameMonth = multi && multi.slice(0, 7) === e.date.slice(0, 7)
  return (
    <span className={c.upWhen}>
      {e.date.slice(0, 4) !== today.slice(0, 4) && <span className={`${c.upYear} num`}>{e.date.slice(0, 4)}</span>}
      <time className={`${c.upDay} num`} dateTime={e.date}>
        {monthDay(e.date)}
        {multi && <>–{sameMonth ? multi.slice(8, 10) : monthDay(multi)}</>}
      </time>
      <span className={c.upWeekday}>
        {weekday(e.date)}
        {multi && `–${weekday(multi)}`}
      </span>
    </span>
  )
}

/**
 * 다가오는 일정 (참고 섹션): 한 줄 = 일정 하나. 날짜 | 이름 | 시간 · 장소 | 종류 | D-day.
 * 넓은 화면은 한 줄에 다 놓아 촘촘하게, 태블릿은 시간 · 장소를 이름 아래로, 폰은 날짜 · D-day / 이름 / 시간 · 장소 · 종류.
 * 장소는 상자 없이 맨 글자, 종류만 장소색 네모 하나. D-day 는 다음 일정 한 줄에만 (큰 표가 위 '이번 주' 에 있다).
 * 휴회도 숨기지 않고 옅고 얇은 줄로. 원래 행사 페이지가 있는 일정만 이름이 링크(↗).
 */
export function Upcoming({ events, today, timeOf, terms }: Props) {
  const nextId = events.find((e) => e.kind !== 'rest')?.id
  return (
    <ol className={c.upList} aria-label="다가오는 일정">
      {events.map((e) => {
        const rest = e.kind === 'rest'
        const time = timeOf(e)
        const t = terms?.get(mentionKey.line(e))
        return (
          <li key={e.id} className={c.up} data-rest={rest || undefined} style={{ '--c': placeColor(e.place) } as CSSProperties}>
            <Day e={e} today={today} />
            <span className={c.upTitle}>
              {e.url ? (
                <a className={c.titleLink} href={e.url} target="_blank" rel="noreferrer">
                  <TermText text={e.title} terms={t} />
                  <span className="visually-hidden"> (새 창)</span>
                  <span className={c.titleArrow} aria-hidden="true">
                    ↗
                  </span>
                </a>
              ) : (
                <TermText text={e.title} terms={t} />
              )}
            </span>
            <span className={c.upSub}>
              <span className={c.upMeta}>
                {rest ? (
                  '이 주에는 모이지 않습니다'
                ) : (
                  <>
                    {time && (
                      <span className={`num ${c.upTime}`}>
                        <span className="visually-hidden">시간 </span>
                        {time}
                      </span>
                    )}
                    {time && (
                      <span className={c.upDot} aria-hidden="true">
                        ·
                      </span>
                    )}
                    {e.venue ? <RoomPlate venue={e.venue} prefix="장소" /> : isPeriod(e) ? null : <span className={c.upNoVenue}>장소 추후 공지</span>}
                  </>
                )}
              </span>
              {!rest && (
                <span className={c.upKind}>
                  <span className={c.upMark} aria-hidden="true" />
                  {KIND_LABEL[e.kind]}
                </span>
              )}
            </span>
            {e.id === nextId && <span className={`${c.upEnd} num`}>{ticketDday(e.date, e.endDate, today)}</span>}
          </li>
        )
      })}
    </ol>
  )
}
