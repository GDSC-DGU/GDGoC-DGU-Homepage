import { useMemo } from 'react'
import { PLACE_BY_ID, placeColor } from '@/config/places'
import { SITE } from '@/config/site'
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
import { WeekBand } from './community/WeekBand'
import { YearHeatmap } from './community/YearHeatmap'
import { dotMonth } from './format'
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

/**
 * 커뮤니티 (시안 E): 건물 앞 머리 → 먹색 '이번 주'(다음 모임 큰 표) → 다가오는 일정(참고, 촘촘한 목록)
 * → 옅은 회색 '세 기수의 1년'(행사 달력, 주장 '세 기수가 연 공개 행사 45번') → 기수별 기록(참고). 페이지 끝 지원 안내(JoinStrip)는 붙이지 않는다 (4기 시안 2026-11).
 * 면: 흰(머리) → 먹색 → 흰 → 옅은 회색 → 흰 → 회색 꼬리말. 큰 숫자 묶음은 두지 않는다 (숫자는 제목 · 글줄 안에).
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
  const lineTerms = useMemo(() => firstMentions(ahead.map((e) => ({ key: mentionKey.line(e), text: e.title }))), [ahead])
  const explainedAbove = useMemo(() => explainedTerms(lineTerms), [lineTerms])
  const year = useMemo(() => yearRows(GENS, events, today), [events, today])
  const held = year.reduce((n, r) => n + r.past, 0)
  // 기록 섹션의 숫자 글줄: 지난 행사 수는 달력 제목이 말하므로 여기서는 멤버 · 프로젝트만
  const tally = tallies(CHAPTER.members?.value, 0, PUBLIC_PROJECTS.length)
  const asOf = CHAPTER.members?.asOf ?? CHAPTER.updatedAt
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
  const directory: DirectoryRow[] = ready
    ? [
        { label: '이번 주', value: weekValue, href: '#this-week' },
        { label: '다가오는 일정', value: <><span className="num">{upcomingCount}</span>건</>, href: '#upcoming' },
        ...(held > 0 ? [{ label: '지난 행사', value: <><span className="num">{held}</span>건</>, href: '#year' }] : []),
        ...(genSpan ? [{ label: '기수별 기록', value: <span className="num">{genSpan}</span>, href: '#records' }] : []),
      ]
    : []

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
        title="커뮤니티"
        lead="화요일 정기 세션과 학기마다 여는 행사, 1기부터 지금까지의 기록을 모았습니다."
        directory={directory}
        screen={next ? { date: next.date, title: next.title } : undefined}
      />

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
              {asOf && (
                <span className={c.tallyBasis}>
                  <span className="num">{dotMonth(asOf)}</span> 기준
                </span>
              )}
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
