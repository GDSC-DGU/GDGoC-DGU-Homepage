import type { ReactNode } from 'react'
import { KIND_LABEL } from '@/config/kinds'
import { placeColor } from '@/config/places'
import type { ScheduleEvent } from '@/domain/types'
import { dateLabel } from './format'
import { mainVenue, mainWeekday, type SeriesRun } from './community/archiveModel'
import { RoomPlate } from './community/Signage'
import { Mark } from './PageParts'
import s from './pages.module.css'

/** 날짜 칸. 기간이면 '~' 뒤에서만 줄을 바꾼다 ('08.18 화~' / '08.31 월') */
function RowDate({ from: start, to: end, today }: { from: string; to?: string; today: string }) {
  const [from, to] = dateLabel(start, end && end !== start ? end : null, today).split('~')
  return (
    <span className={`${s.rowDate} num`}>
      {to && end ? (
        <>
          <time className={s.nowrap} dateTime={start}>
            {from}~
          </time>
          <wbr />
          <time className={s.nowrap} dateTime={end}>
            {to}
          </time>
        </>
      ) : (
        <time className={s.nowrap} dateTime={start}>
          {from}
        </time>
      )}
    </span>
  )
}

/**
 * 일정 · 행사 한 줄: 날짜 / 제목 + 연속 행사 · 호실 이름표 / 종류 / 끝 칸(D-day 같은 짧은 말 ).
 * 원래 행사 페이지가 있으면 줄 전체가 그 페이지로 가는 링크이고,
 * size='lg': 대표 행사(연합 행사 · 컨퍼런스 · 데모데이)는 이름을 크게. title: 이름 자리를 바꿔 그릴 때 (용어 풀이)
 */
export function EventRow({ e, today, note, size, title }: { e: ScheduleEvent; today: string; note?: ReactNode; size?: 'lg'; title?: ReactNode }) {
  // 제목에 이미 연속 행사 이름이 들어 있으면 한 번만 쓴다
  const series = e.series && !e.title.includes(e.series) ? e.series : null
  const body = (
    <>
      <RowDate from={e.date} to={e.endDate} today={today} />
      <span className={s.rowMain}>
        <span className={s.rowTitle}>{title ?? e.title}</span>
        {(series || e.venue) && (
          <span className={s.rowSub}>
            {series}
            {e.venue && <RoomPlate venue={e.venue} prefix="장소" />}
          </span>
        )}
      </span>
      <span className={s.rowKind}>
        <Mark color={placeColor(e.place)} />
        {KIND_LABEL[e.kind]}
      </span>
      <span className={s.rowEnd}>
        {note && <span className={`${s.until} num`}>{note}</span>}
      </span>
    </>
  )
  return (
    <li data-size={size}>
      {e.url ? (
        <a className={`${s.row} ${s.rowLink}`} href={e.url} target="_blank" rel="noreferrer">
          {body}
          <span className="visually-hidden"> (새 창)</span>
        </a>
      ) : (
        <div className={s.row}>{body}</div>
      )}
    </li>
  )
}

/**
 * 연속 세션 한 줄 (Camping Seminar 14회 같은 것): 기간 / 이름 + 회차 수 · 주로 연 요일 · 주로 쓴 호실 / 종류.
 * 회차마다 줄을 늘어놓지 않는다. 회차별 행사 페이지는 gdg.community.dev 에 있다 (페이지 끝 출처 줄).
 */
export function SeriesRow({ run, today, title }: { run: SeriesRun; today: string; title?: ReactNode }) {
  const first = run.events[0]
  const last = run.events[run.events.length - 1]
  const wd = mainWeekday(run.events)
  const venue = mainVenue(run.events)
  return (
    <li>
      <div className={s.row}>
        <RowDate from={first.date} to={last.date} today={today} />
        <span className={s.rowMain}>
          <span className={s.rowTitle}>{title ?? run.series}</span>
          <span className={s.rowSub}>
            <span>
              <span className="num">{run.events.length}</span>회{wd && `, 주로 ${wd}요일`}
            </span>
            {venue && <RoomPlate venue={venue} prefix="주로 쓴 장소" />}
          </span>
        </span>
        <span className={s.rowKind}>
          <Mark color={placeColor(first.place)} />
          {KIND_LABEL[first.kind]}
        </span>
        <span className={s.rowEnd} />
      </div>
    </li>
  )
}
