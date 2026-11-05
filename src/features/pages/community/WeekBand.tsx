import type { ReactNode } from 'react'
import { SITE } from '@/config/site'
import type { ScheduleEvent } from '@/domain/types'
import { StoryHead } from '@/features/common'
import { LedTicket } from '@/features/signboard/LedBoard'
import { monthDay, weekday } from '@/lib/date'
import { REGULAR_SESSION, isPeriod, type WeekState } from './thisWeek'
import c from './community.module.css'

/** '10.27 화' (숫자는 Google Sans Flex) */
function Day({ ymd }: { ymd: string }) {
  return (
    <>
      <span className="num">{monthDay(ymd)}</span> {weekday(ymd)}
    </>
  )
}

/** 일정 여럿을 한 줄로: '11.02 월 동홍동락 1차 · 11.03 화 …' */
function EventList({ list }: { list: readonly ScheduleEvent[] }) {
  return (
    <>
      {list.map((e, i) => (
        <span key={e.id}>
          {i > 0 && ' · '}
          <Day ymd={e.date} /> {e.title}
        </span>
      ))}
    </>
  )
}

/**
 * 커뮤니티 '이번 주' (먹색 이야기 섹션, 페이지의 먹색 면 하나).
 * 이름표 '이번 주' → 주장 '매주 화요일 18:00에 모입니다' | 큰 표(Ticket size='large') → 그 아래 한 줄.
 * 넓은 화면(1200↑)은 머리 5칸 | 표 7칸으로 나란히 (큰 표가 12칸을 다 쓰면 가운데가 비어 보인다), 그보다 좁으면 위아래로.
 * - 휴회 주: 큰 표는 다음 모임 (쉰다는 줄은 싣지 않는다: 4기 Organizer 2026-11-05)
 * - 모이는 주: 큰 표는 이번 주 모임, 아래 줄 '그다음 일정은 …입니다.'
 * - 모임 요일에 공개된 일정이 없는 주: 큰 표는 다음 일정
 * - 다가오는 일정이 없을 때: 표 없이 '지금 공개된 다가오는 일정이 없습니다' + 공지 채널.
 * 휴회는 큰 표에 올리지 않는다. 시간은 정기 세션 출처(4기 지원서)가 있을 때만 붙인다 (regular).
 */
export function WeekBand({ week, timeOf, regular }: { week: WeekState; timeOf: (e: ScheduleEvent) => string | null; regular: boolean }) {
  const { status, meeting, others, next } = week
  const big = status === 'meet' ? meeting[0] : next
  const time = big ? timeOf(big) : null
  // 여러 날에 걸친 기간(G-Sprint 팀별 개발 기간 등)은 한 장소에서 모이는 일정이 아니라 장소 줄을 달지 않는다
  const meta = big ? [time, big.venue ?? (isPeriod(big) ? null : '장소 미정')].filter(Boolean).join(' · ') : ''
  const sameWeek = others.filter((e) => e !== big)

  const lines: ReactNode[] = []
  // 쉬는 주 · 모임 없는 주라는 말은 싣지 않는다 (4기 Organizer 2026-11-05: 쉬는 얘기는 브랜드에 쓸모없다). 큰 표가 다음 모임을 보여 준다
  if (status === 'meet') {
    if (meeting.length > 1) lines.push(<>같은 날 {meeting.slice(1).map((e) => e.title).join(' · ')}도 있습니다.</>)
    if (next)
      lines.push(
        <>
          그다음 일정은 <Day ymd={next.date} /> {next.title}입니다.
        </>,
      )
  } else if (status === 'off') {
    lines.push(<>지금 공개된 다가오는 일정이 없습니다. 새 일정은 인스타그램 {SITE.links.instagramHandle}에 올립니다.</>)
  }
  if (sameWeek.length > 0)
    lines.push(
      <>
        같은 주에 <EventList list={sameWeek} />도 있습니다.
      </>,
    )

  return (
    <section id="this-week" className="story dark on-dark" aria-labelledby="this-week-title">
      <div className={c.week}>
        <StoryHead
          titleId="this-week-title"
          tone="dark"
          headClassName={c.weekHead}
          titleSize="section"
          title={
            regular ? (
              <>
                매주 화요일 <span className="num">{REGULAR_SESSION.time}</span>에 모입니다
              </>
            ) : (
              '이번 주와 다음 모임'
            )
          }
        />
        <div className={c.weekBody}>
          {big && (
            <LedTicket
              size="large"
              kicker={status === 'meet' ? (isPeriod(big) ? '지금' : '이번 주 모임') : '다음 모임'}
              date={big.date}
              endDate={big.endDate}
              title={big.title}
              meta={meta}
              place={big.place}
              href={big.url ?? undefined}
            />
          )}
          {lines.length > 0 && (
            <div className={c.weekLines}>
              {lines.map((l, i) => (
                <p key={i}>{l}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
