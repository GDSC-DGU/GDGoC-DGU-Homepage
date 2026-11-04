import { useMemo } from 'react'
import { PLACE_BY_ID, placeColor } from '@/config/places'
import { SITE, SPRINT } from '@/config/site'
import { CHAPTER, CONTENT_UPDATED_AT, FAQS, GENERATIONS, PUBLIC_PROJECTS } from '@/content'
import { withoutStalePlans } from '@/content/plan'
import { useSchedule } from '@/data/queries'
import type { ScheduleEvent } from '@/domain/types'
import { StorySection } from '@/features/common'
import { PlaceHero, type DirectoryRow } from '@/features/placehero/PlaceHero'
import { useToday } from '@/hooks/useToday'
import { monthDay, weekday } from '@/lib/date'
import { Archive } from './community/Archive'
import { countWord, yearRows } from './community/heatmap'
import { sortGenerations, tallies } from './community/history'
import { OverviewToggle } from './community/OverviewToggle'
import { dotDate, pageSources } from './community/pageSources'
import { PageSources } from './community/Signage'
import { explainedTerms, firstMentions, mentionKey } from './community/terms'
import { REGULAR_SESSION, isPeriod, regularTime, weekState } from './community/thisWeek'
import { Upcoming } from './community/Upcoming'
import { useHashScroll } from './community/useHashScroll'
import { WHO_TERMS, nameChange, whoCards, whoSpan } from './community/who'
import { WeekBand } from './community/WeekBand'
import { YearHeatmap } from './community/YearHeatmap'
import { Section, StateLine } from './PageParts'
import { pastEvents } from './records'
import s from './pages.module.css'
import c from './community/community.module.css'
import { usePageTitle } from '@/hooks/usePageTitle'

const EMPTY: ScheduleEvent[] = []

/** 정기 세션 시간의 출처 (faq.json when-sessions). FAQ 가 없으면 시간을 쓰지 않는다 */
const sessionFaq = FAQS.find((f) => f.id === REGULAR_SESSION.faqId)
const timeOf = (e: ScheduleEvent) => (sessionFaq ? regularTime(e) : null)

const GENS = sortGenerations(GENERATIONS)
const COMMUNITY_COLOR = placeColor('community')

/** 맨 위 '우리는' (who.ts): 2023년 1기부터 지금 4기까지 + 활동 세 가지 + 그룹 멤버 수 */
const SPAN = whoSpan(GENERATIONS)
const RENAMED = nameChange(GENERATIONS)
const WHO = whoCards({ members: CHAPTER.members, sprint: CHAPTER.sprint, demoDay: monthDay(SPRINT.demoDay) })

/** '5팀 27명' → 숫자만 숫자 글꼴로 */
const withNums = (text: string) => text.split(/(\d+(?:\.\d+)*)/).map((part, i) => (i % 2 ? <span key={i} className="num">{part}</span> : part))

/**
 * 소개 (/about, 예전 커뮤니티. 4기 Organizer 결정 2026-11-05): 건물 앞 머리 → 옅은 회색 '우리는'(몇 기째인지 · 활동 · 멤버 수)
 * → 먹색 '이번 주'(다음 모임 큰 표) → 다가오는 일정(참고, 촘촘한 목록)
 * → 옅은 회색 '세 기수의 1년'(행사 달력, 주장 '세 기수가 연 공개 행사 45번') → 기수별 기록(참고). 페이지 끝 지원 안내(JoinStrip)는 붙이지 않는다 (4기 시안 2026-11).
 * 면: 흰(머리) → 옅은 회색 → 먹색 → 흰 → 옅은 회색 → 흰 → 회색 꼬리말. 그룹 멤버 수는 '우리는' 에만 (기록 옆 숫자 줄에서는 뺀다).
 * 날짜가 지났는데 계획으로만 남은 일정은 처음부터 뺀다 (content/plan.ts).
 * 우리끼리 말은 화면에 처음 나오는 자리에서 한 번만 풀어 쓴다: 다가오는 일정 → 기수 요약 · 기록 순서.
 */
export function CommunityPage() {
  usePageTitle(PLACE_BY_ID.community.label)
  const today = useToday()
  const { data, isPending, isError, refetch } = useSchedule()
  const events = useMemo(() => withoutStalePlans(data ?? EMPTY, today), [data, today])
  const ready = !isPending && !isError
  const past = useMemo(() => pastEvents(events, today), [events, today])
  const ahead = useMemo(
    () => events.filter((e) => (e.endDate ?? e.date) >= today).sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, 'ko')),
    [events, today],
  )
  const upcomingCount = ahead.filter((e) => e.kind !== 'rest').length
  const week = useMemo(() => weekState(events, today), [events, today])
  // G-Sprint · 동홍동락은 위 '우리는' 에서 풀었으므로 일정 · 기록에서는 다시 풀지 않는다
  const lineTerms = useMemo(() => firstMentions(ahead.map((e) => ({ key: mentionKey.line(e), text: e.title })), WHO_TERMS), [ahead])
  const explainedAbove = useMemo(() => explainedTerms(lineTerms, WHO_TERMS), [lineTerms])
  const year = useMemo(() => yearRows(GENS, events, today), [events, today])
  const held = year.reduce((n, r) => n + r.past, 0)
  // 기록 섹션의 숫자 글줄: 지난 행사 수는 달력 제목이, 멤버 수는 '우리는' 이 말하므로 여기서는 프로젝트만
  const tally = tallies(undefined, 0, PUBLIC_PROJECTS.length)
  useHashScroll(ready)

  const loading = isPending && <StateLine>일정을 불러오는 중입니다.</StateLine>
  const failed = isError && <StateLine onRetry={() => void refetch()}>일정을 불러오지 못했습니다.</StateLine>

  const { status, meet, next } = week
  const weekValue =
    status === 'rest'
      ? `${monthDay(meet)} ${weekday(meet)} · 휴회`
      : status === 'meet'
        ? `${monthDay(meet)} ${weekday(meet)} · ${isPeriod(week.meeting[0]) ? '팀별 개발' : '모임'}`
        : status === 'quiet'
          ? `${monthDay(meet)} ${weekday(meet)} · 일정 미공개`
          : '잡힌 일정 없음'
  const firstGen = GENS[0]
  const lastGen = GENS[GENS.length - 1]
  const genSpan = GENS.length > 1 ? `${firstGen.n}–${lastGen.n}기` : lastGen ? `${lastGen.n}기` : ''
  const whoRow: DirectoryRow[] = SPAN.current ? [{ label: '우리는', value: <>지금 <span className="num">{SPAN.current}</span>기</>, href: '#who' }] : []
  const directory: DirectoryRow[] = ready
    ? [
        ...whoRow,
        { label: '이번 주', value: weekValue, href: '#this-week' },
        { label: '다가오는 일정', value: <><span className="num">{upcomingCount}</span>건</>, href: '#upcoming' },
        ...(held > 0 ? [{ label: '지난 행사', value: <><span className="num">{held}</span>건</>, href: '#year' }] : []),
        ...(genSpan ? [{ label: '기수별 기록', value: <span className="num">{genSpan}</span>, href: '#records' }] : []),
      ]
    : whoRow

  // 이 페이지가 기대는 출처: 행사 페이지 · 운영 계획 · 4기 지원서(정기 세션 시간) · 챕터 멤버 수 · 기수 연혁 · GitHub
  const sources = useMemo(
    () =>
      pageSources(
        [
          ...past.map((e) => e.source),
          ...ahead.map((e) => e.source),
          sessionFaq?.source,
          CHAPTER.members?.source,
          ...GENS.flatMap((g) => g.source),
          CHAPTER.github,
        ],
        { 'gdg.community.dev': CHAPTER.chapterPage, 'github.com': CHAPTER.github },
      ),
    [past, ahead],
  )
  const planSource = [...new Set(ahead.filter((e) => !e.url && e.source && !/^https?:/.test(e.source)).map((e) => e.source))].join(' · ')

  return (
    <div className={`container ${s.page}`}>
      <PlaceHero
        place="community"
        eyebrow={PLACE_BY_ID.community.sub}
        title={PLACE_BY_ID.community.label}
        lead="GDGoC DGU가 어떤 곳인지, 화요일 정기 세션과 학기마다 여는 행사, 1기부터 지금까지의 기록을 모았습니다."
        directory={directory}
        screen={next ? { date: next.date, title: next.title } : undefined}
      />

      <StorySection
        id="who"
        tone="field"
        eyebrow="우리는"
        placeColor={COMMUNITY_COLOR}
        title={
          SPAN.since ? (
            <>
              <span className="num">{SPAN.since}</span>년 1기부터 지금 <span className="num">{SPAN.current}</span>기까지
            </>
          ) : (
            <>
              지금 <span className="num">{SPAN.current}</span>기
            </>
          )
        }
        sub={
          <>
            <span className={c.subLine}>동국대학교 학생이 운영하는 Google Developer Groups on Campus 챕터입니다.</span>
            {RENAMED && (
              <>
                {' '}
                <span className={c.subLine}>
                  <span className="num">{RENAMED.from - 1}</span>기는 {RENAMED.before}, <span className="num">{RENAMED.from}</span>기부터는 {RENAMED.after} 이름으로 활동합니다.
                </span>
              </>
            )}
          </>
        }
      >
        <dl className={c.who}>
          {WHO.map((card) => (
            <div key={card.id} className={c.whoCard}>
              <dt className={c.whoLabel}>{card.label}</dt>
              <dd className={c.whoValue}>{withNums(card.value)}</dd>
              {card.sub && <dd className={c.whoSub}>{withNums(card.sub)}</dd>}
            </div>
          ))}
        </dl>
      </StorySection>

      {loading || failed || <WeekBand week={week} timeOf={timeOf} regular={Boolean(sessionFaq)} />}

      <Section
        id="upcoming"
        title="다가오는 일정"
        desc={planSource ? `${planSource}에 있는 일정은 바뀔 수 있고, 바뀌면 인스타그램에 먼저 알립니다.` : '바뀌면 인스타그램에 먼저 알립니다.'}
      >
        {loading ||
          failed ||
          (ahead.length === 0 ? (
            <StateLine>지금 공개된 다가오는 일정이 없습니다. 새 일정은 인스타그램 {SITE.links.instagramHandle}에 먼저 올립니다.</StateLine>
          ) : (
            <>
              <Upcoming events={ahead} today={today} timeOf={timeOf} terms={lineTerms} />
              <OverviewToggle events={events} today={today} />
            </>
          ))}
      </Section>

      {ready && year.length > 0 && (
        <StorySection
          id="year"
          tone="field"
          eyebrow="1년 달력"
          placeColor={COMMUNITY_COLOR}
          title={
            <>
              {countWord(year.length)} 기수가 연 공개 행사 <span className="num">{held}</span>번
            </>
          }
          sub={
            <>
              <span className={c.subLine}>gdg.community.dev에 공개된 행사만 셌습니다.</span>{' '}
              <span className={c.subLine}>한 줄이 한 기수의 9월–8월, 칸 하나가 하루입니다.</span>
            </>
          }
        >
          <YearHeatmap rows={year} events={events} today={today} />
        </StorySection>
      )}

      <Section
        id="records"
        title="기수별 기록"
        desc="공개된 기록만 모았습니다. 끝난 행사는 원래 행사 페이지로 이어집니다."
        aside={
          tally.length > 0 && (
            <p className={c.tallyLine}>
              {tally.map((t, i) => (
                <span key={t.id} className={c.tallyItem}>
                  {i > 0 && (
                    <>
                      <span className={c.tallySep} aria-hidden="true">
                        ·
                      </span>
                      <span className="visually-hidden">, </span>
                    </>
                  )}
                  {t.label} <span className={`num ${c.tallyValue}`}>{t.value.toLocaleString('ko-KR')}</span>
                  {t.unit}
                </span>
              ))}
            </p>
          )
        }
      >
        {loading || failed || <Archive gens={GENS} past={past} today={today} explained={explainedAbove} />}
        <PageSources items={sources} updated={<>일정 <span className="num">{dotDate(CONTENT_UPDATED_AT)}</span> 갱신</>} />
      </Section>
    </div>
  )
}
