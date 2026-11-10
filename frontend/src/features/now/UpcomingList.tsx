import type { CSSProperties } from 'react'
import { KIND_LABEL } from '@/config/kinds'
import { placeColor } from '@/config/places'
import { SITE } from '@/config/site'
import type { ScheduleEvent } from '@/domain/types'
import { spanLabel } from '@/lib/rail'
import { upcomingEvents } from '@/lib/schedule'
import s from './now.module.css'

interface Props {
  /** 모든 일정 (지난 것 포함) */
  events: readonly ScheduleEvent[]
  today: string
  status: 'pending' | 'error' | 'ready'
  /** 몇 줄 보일지 */
  limit?: number
  /** 줄에 마우스를 올리면 레일의 같은 표식을 가리킨다 */
  onPoint?: (id: string | null) => void
}

const Instagram = () => (
  <a href={SITE.links.instagram} target="_blank" rel="noreferrer">
    인스타그램 {SITE.links.instagramHandle}
    
  </a>
)

/**
 * 다가오는 일정 몇 줄. 모든 줄이 같은 모양(날짜 | 제목 · 아래에 장소 | 종류)이다.
 * 휴회는 일정 수(limit)에 세지 않고, 보이는 기간 안에 있으면 날짜 순서대로 옅은 한 줄로 끼운다.
 */
export function UpcomingList({ events, today, status, limit = 4, onPoint }: Props) {
  const rows = upcomingEvents(events, today, { limit })
  const last = rows[rows.length - 1]
  const rests = last ? upcomingEvents(events, today, { includeRest: true }).filter((e) => e.kind === 'rest' && e.date <= last.date) : []
  const list = [...rows, ...rests].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))

  return (
    <div className={s.up}>
      <h3 className={s.upTitle}>다가오는 일정</h3>

      {status === 'pending' && (
        <p className={s.upNote} data-reserve>
          일정을 불러오는 중입니다.
        </p>
      )}
      {status === 'error' && (
        <p className={s.upNote}>
          일정을 불러오지 못했습니다. 새로 고치면 다시 불러옵니다. 공지는 <Instagram />에도 올립니다.
        </p>
      )}
      {status === 'ready' && rows.length === 0 && (
        <p className={s.upNote}>
          지금은 잡힌 일정이 없습니다. 다음 일정은 정해지는 대로 <Instagram />에 먼저 공지합니다.
        </p>
      )}

      {status === 'ready' && rows.length > 0 && (
        <ol className={s.upList}>
          {list.map((e) => {
            const rest = e.kind === 'rest'
            return (
              <li
                key={e.id}
                className={s.row}
                data-rest={rest || undefined}
                onPointerEnter={() => onPoint?.(e.id)}
                onPointerLeave={() => onPoint?.(null)}
              >
                <span className={`${s.rowDate} num`}>{spanLabel(e, today)}</span>
                <span className={s.rowTitle}>
                  {e.url ? (
                    <a href={e.url} target="_blank" rel="noreferrer">
                      {e.title}
                      
                    </a>
                  ) : (
                    e.title
                  )}
                  {rest ? <span className={s.rowVenue}>이 주에는 모이지 않습니다</span> : e.venue && <span className={s.rowVenue}>{e.venue}</span>}
                </span>
                <span className={s.rowKind}>
                  {rest ? (
                    <i className={s.restSq} aria-hidden="true" />
                  ) : (
                    <i className="mark" style={{ '--c': placeColor(e.place) } as CSSProperties} aria-hidden="true" />
                  )}
                  {KIND_LABEL[e.kind]}
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
