import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { SITE, SPRINT } from '@/config/site'
import { withoutStalePlans } from '@/content/plan'
import { useSchedule } from '@/data/queries'
import type { ScheduleEvent } from '@/domain/types'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useToday } from '@/hooks/useToday'
import { ddayLabel, monthDay, weekday } from '@/lib/date'
import { eventsInPeriod, progressCount, railPeriod, sprintWindow, type Period } from '@/lib/rail'
import { CalendarToggle } from './CalendarToggle'
import { SemesterRail } from './SemesterRail'
import { SprintLine } from './SprintLine'
import { UpcomingList } from './UpcomingList'
import s from './now.module.css'

/** 홈에서 보일 다가오는 일정 줄 수 (아래 '달력으로 보기'로 나머지를 본다). 폰은 두 줄 */
const UPCOMING = 3
const UPCOMING_PHONE = 2

const NO_EVENTS: ScheduleEvent[] = []

/** '10.27 화' · 올해가 아니면 '2027.01.30 토' */
const dayLabel = (ymd: string, today: string) => `${ymd.slice(0, 4) === today.slice(0, 4) ? '' : `${ymd.slice(0, 4)}.`}${monthDay(ymd)} ${weekday(ymd)}`

/** 오늘 이후(오늘 포함) 첫 일정. 휴회는 일정이 아니므로 뺀다 */
const nextEvent = (events: readonly ScheduleEvent[], today: string): ScheduleEvent | null =>
  [...events].filter((e) => (e.endDate ?? e.date) >= today && e.kind !== 'rest').sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, 'ko'))[0] ?? null

/** '9월부터 2월까지' (해가 바뀌어도 달만: 레일 아래에 연도가 있다) */
const periodWords = (p: Period) => `${+p.start.slice(5, 7)}월부터 ${+p.end.slice(5, 7)}월까지`

/** 기준: 공개 페이지 주소는 도메인만, 나머지('4기 운영 계획')는 그대로 */
function sourceWords(events: readonly ScheduleEvent[]): string {
  const names = new Set<string>()
  for (const e of events) {
    if (!e.source) continue
    try {
      names.add(/^https?:/.test(e.source) ? new URL(e.source).hostname : e.source)
    } catch {
      names.add(e.source)
    }
  }
  return [...names].join(' · ')
}

/** 머리 한 줄: 이 기간 일정 가운데 몇 개를 마쳤는지 */
function progressLine(p: Period, events: readonly ScheduleEvent[], today: string): string {
  const { done, total } = progressCount(events, today)
  const span = periodWords(p)
  if (total === 0) return `${span} 등록된 일정이 아직 없습니다.`
  if (done === 0) return `${span} 일정 ${total}개가 잡혀 있습니다.`
  if (done === total) return `${span} 일정 ${total}개를 모두 마쳤습니다.`
  return `${span} 일정 ${total}개 가운데 ${done}개를 마쳤습니다.`
}

interface Props {
  /** 미리보기 · 테스트용 날짜 (기본은 오늘, 한국 시간) */
  today?: string
}

/**
 * 홈 '지금 4기는' 섹션: 다음 일정(D-n) · 학기 레일 · G-Sprint 한 줄 · 다가오는 일정 3줄 · 달력(펼침).
 * 지원자용 이야기(약속 · 한 해 · 파트 · 프로젝트) 뒤에 오는 멤버용 현황이라 짧게 둔다.
 * 데스크톱은 12칸 격자에서 머리 3칸 · 내용 9칸, 1279px 이하는 위아래로 쌓는다.
 * 바깥 여백(.container)과 섹션 사이 간격은 홈 페이지가 정한다.
 */
export function NowSection({ today: fixedToday }: Props) {
  const liveToday = useToday()
  const today = fixedToday ?? liveToday
  const { data, isPending, isError } = useSchedule()
  const phone = useMediaQuery('(max-width: 767px)')
  // 날짜가 지났는데 계획으로만 남은 일정은 진행 수 · 레일에 넣지 않는다 (content/plan.ts)
  const events = useMemo(() => withoutStalePlans(data ?? NO_EVENTS, today), [data, today])
  const status = isError && !data ? 'error' : isPending ? 'pending' : 'ready'

  const period = useMemo(() => railPeriod(events, today), [events, today])
  const inRail = useMemo(() => eventsInPeriod(events, period), [events, period])
  const sprint = useMemo(
    () =>
      sprintWindow(
        SPRINT.steps.map((st) => ({ label: st.label, date: st.date })),
        SPRINT.demoDay,
        inRail,
      ),
    [inRail],
  )
  const [pointed, setPointed] = useState<string | null>(null)
  const sources = sourceWords(inRail)
  // D-n 은 홈에서 여기 하나뿐 (첫 화면은 5기 모집 상태를 보인다)
  const next = status === 'ready' ? nextEvent(events, today) : null

  return (
    <section id="now" className={s.root} aria-labelledby="now-title">
      <div className={s.head}>
        <h2 id="now-title" className={s.title}>
          지금 {SITE.generation}는
        </h2>
        {/* 불러오는 중 · 실패 안내는 아래 목록이 맡는다. 여기는 한 줄 자리만 지킨다 */}
        <p className={s.lede} aria-hidden={status !== 'ready' || undefined}>
          {status === 'ready' ? progressLine(period, inRail, today) : '\u00a0'}
        </p>
        {sources && <p className={s.basis}>{sources} 기준</p>}
        {next && (
          <p className={s.next}>
            <span className={s.nextLabel}>다음 일정</span>
            <span className={`num ${s.nextDday}`}>{ddayLabel(next.date, today)}</span>
            <span className={s.nextWhat}>
              <span className="num">{dayLabel(next.date, today)}</span> · {next.title}
            </span>
          </p>
        )}
      </div>

      <div className={s.body}>
        <div className={s.homeRail}>
          <SemesterRail period={period} events={inRail} today={today} sprint={sprint} linkedId={pointed} />
        </div>

        {sprint && <SprintLine sprint={sprint} />}

        <UpcomingList events={events} today={today} status={status} limit={phone ? UPCOMING_PHONE : UPCOMING} onPoint={setPointed} />

        <div className={s.homeCal}>
          <CalendarToggle events={events} today={today} />
        </div>
        {/* 폰은 달력 대신 소개 페이지의 전체 일정으로 */}
        <p className={s.homeMore}>
          <Link className="link" to="/about">
            일정 모두 보기
          </Link>
        </p>
      </div>
    </section>
  )
}
