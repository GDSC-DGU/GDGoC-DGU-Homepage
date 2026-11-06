import { useMemo } from 'react'
import { PLACE_BY_ID } from '@/config/places'
import { SITE, SPRINT } from '@/config/site'
import { CHAPTER, FAQS, GENERATIONS, PUBLIC_PROJECTS, SEMINARS } from '@/content'
import { GLOSSARY } from '@/content/glossary'
import { BAND } from '@/content/story'
import { withoutStalePlans } from '@/content/plan'
import { useSchedule } from '@/data/queries'
import type { ScheduleEvent } from '@/domain/types'
import { DarkHero, type HeroStat } from '@/features/dcamp/DarkHero'
import { Evolution } from '@/features/dcamp/Evolution'
import { MissionBand } from '@/features/dcamp/MissionBand'
import { QuoteBanner } from '@/features/dcamp/QuoteBanner'
import { WorkCards, type WorkCard } from '@/features/dcamp/WorkCards'
import { useToday } from '@/hooks/useToday'
import { monthDay } from '@/lib/date'
import { Archive } from './community/Archive'
import { sortGenerations, tallies } from './community/history'
import { OverviewToggle } from './community/OverviewToggle'
import { explainedTerms, firstMentions, mentionKey } from './community/terms'
import { REGULAR_SESSION, regularTime, withRegularSessions } from './community/thisWeek'
import { Upcoming } from './community/Upcoming'
import { useHashScroll } from './community/useHashScroll'
import { WHO_TERMS, nameChange, whoSpan } from './community/who'
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

/** 검정 머리 (dcamp 'Who we are'): 숫자는 저장소 자료에서 (chapter.json · projects.json) */
const SPAN = whoSpan(GENERATIONS)
const RENAMED = nameChange(GENERATIONS)
const SPRINT_OK = CHAPTER.sprint?.verified ? CHAPTER.sprint : null
const HERO_STATS: HeroStat[] = [
  ...(CHAPTER.members ? [{ label: '챕터 페이지 가입자', value: CHAPTER.members.value.toLocaleString('ko-KR'), unit: '명', plus: true }] : []),
  { label: '공개 프로젝트', value: String(PUBLIC_PROJECTS.length), unit: '개' },
]
const HERO_NOTE = CHAPTER.members ? `*챕터 페이지 가입자는 gdg.community.dev ${CHAPTER.members.asOf.slice(0, 4)}년 ${Number(CHAPTER.members.asOf.slice(5, 7))}월 기준` : undefined
const HERO_TEXT = [
  <>
    {SITE.shortName}는 Google Developer Groups on Campus의 동국대학교 챕터입니다.
    {SPAN.since && (
      <>
        {' '}
        <span className="num">{SPAN.since}</span>년 {RENAMED ? `${RENAMED.before}라는 이름으로 ` : ''}1기를 시작했고
        {RENAMED ? (
          <>
            , <span className="num">{RENAMED.from}</span>기부터 {RENAMED.after}로 이름을 바꿔
          </>
        ) : (
          ''
        )}{' '}
        지금 <span className="num">{SPAN.current}</span>기까지 이어 오고 있습니다.
      </>
    )}
  </>,
  <>
    매주 화요일 18:00에 파트별로 모여 같은 문제를 각자 풀고 비교합니다.
    {SPRINT_OK && (
      <>
        {' '}
        가을 학기에는 <span className="num">{SPRINT_OK.teams}</span>팀 <span className="num">{SPRINT_OK.members}</span>명이 {GLOSSARY['g-sprint'].term}로 서비스 하나씩을 만들어{' '}
        <span className="num">{monthDay(SPRINT.demoDay)}</span> 데모데이에서 시연합니다.
      </>
    )}
  </>,
]

/** 하는 일 카드 (dcamp 'How We Work'): faq · glossary · 저장소 숫자에서 */
const SEMINAR_GENS = [...new Set(SEMINARS.map((x) => x.generation))].sort((a, b) => a - b)
const SC_PROJECTS = PUBLIC_PROJECTS.filter((p) => /^Solution Challenge\b/.test(p.program)).length
const WORK: WorkCard[] = [
  { id: 'sessions', icon: 'calendar', title: '정기 세션', body: '매주 화요일 18:00에 Frontend, Backend, AI/ML, Product Design 파트별로 모입니다. 강의보다 같은 문제를 각자 풀어 보고 비교하는 실습을 합니다.' },
  { id: 'sprint', icon: 'sprint', title: GLOSSARY['g-sprint'].term, body: '팀마다 가을 학기 동안 아이디어부터 배포까지 서비스 하나를 만들고 Google 기술을 하나 이상 씁니다. 학기 끝 데모데이에서 직접 시연합니다.' },
  {
    id: 'seminars',
    icon: 'mic',
    title: '멤버 세미나',
    body: `멤버가 주제를 정해 직접 발표합니다. ${SEMINAR_GENS.length > 1 ? `${SEMINAR_GENS[0]}~${SEMINAR_GENS[SEMINAR_GENS.length - 1]}` : SEMINAR_GENS[0]}기 발표 ${SEMINARS.length}개가 아카이브에 남아 있습니다.`,
  },
  {
    id: 'solution-challenge',
    icon: 'trophy',
    title: GLOSSARY['solution-challenge'].term,
    body: `${GLOSSARY['solution-challenge'].long}${SC_PROJECTS ? ` 지금까지 ${SC_PROJECTS}개 프로젝트를 냈습니다.` : ''}`,
  },
  { id: 'joint', icon: 'people', title: '연합 행사', body: `${GLOSSARY['dong-hong'].long.replace(/입니다\.$/, '')}인 ${GLOSSARY['dong-hong'].term}, 동지톤 같은 행사를 다른 챕터, 동아리와 함께 엽니다.` },
]

/**
 * 소개 (/about). 4기 Organizer 2026-11-06: dcamp.kr 'Who we are' 의 구성을 그대로 따른다.
 * 검정 머리(주황 빛 · 격자, 큰 제목, 주황 큰 숫자 | 설명) → Our Evolution(기수 연혁) → 사진 한 면 + Mission
 * → How We Work(하는 일 카드) → 회색 띠 한 문장 → 다가오는 일정(매주 화요일 정기 세션 포함, 달력으로 보기) → 기수별 기록.
 * 먹색 '이번 주' 전광판 띠와 행사 달력(히트맵)은 뺐다 (4기 Organizer 2026-11-06: 디자인이 혼자 동떨어지고, 달력은 다들 관심 없다).
 * 날짜가 지났는데 계획으로만 남은 일정은 처음부터 뺀다 (content/plan.ts).
 * 우리끼리 말은 화면에 처음 나오는 자리에서 한 번만 풀어 쓴다: 다가오는 일정 → 기수 요약 · 기록 순서.
 */
export function CommunityPage() {
  usePageTitle(PLACE_BY_ID.community.label)
  const today = useToday()
  const { data, isPending, isError, refetch } = useSchedule()
  const all = useMemo(() => withoutStalePlans(data ?? EMPTY, today), [data, today])
  // 다가오는 일정 · 달력: 매주 화요일 정기 세션을 채우고(휴회 · 다른 일정이 있는 화요일은 빼고) 휴회는 싣지 않는다
  // (4기 Organizer 2026-11-05 · 06: 쉬는 얘기는 빼고, 달력에는 매주 화요일 모임이 보여야 한다). 지난 기록에는 채운 세션을 넣지 않는다
  const events = useMemo(() => all.filter((e) => e.kind !== 'rest'), [all])
  const shown = useMemo(() => withRegularSessions(all).filter((e) => e.kind !== 'rest'), [all])
  const ready = !isPending && !isError
  const past = useMemo(() => pastEvents(events, today), [events, today])
  const ahead = useMemo(
    () => shown.filter((e) => (e.endDate ?? e.date) >= today).sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, 'ko')),
    [shown, today],
  )
  // G-Sprint · 동홍동락은 위 '우리는' 에서 풀었으므로 일정 · 기록에서는 다시 풀지 않는다
  const lineTerms = useMemo(() => firstMentions(ahead.map((e) => ({ key: mentionKey.line(e), text: e.title })), WHO_TERMS), [ahead])
  const explainedAbove = useMemo(() => explainedTerms(lineTerms, WHO_TERMS), [lineTerms])
  // 기록 섹션의 숫자 글줄: 지난 행사 수는 달력 제목이, 멤버 수는 '우리는' 이 말하므로 여기서는 프로젝트만
  const tally = tallies(undefined, 0, PUBLIC_PROJECTS.length)
  useHashScroll(ready)

  const loading = isPending && <StateLine>일정을 불러오는 중입니다.</StateLine>
  const failed = isError && <StateLine onRetry={() => void refetch()}>일정을 불러오지 못했습니다.</StateLine>



  return (
    <>
      <DarkHero
        trail={[PLACE_BY_ID.community.label]}
        title={
          <>
            학생과 현업자 사이를 잇는,
            <br />
            동국대학교 개발자 커뮤니티 {SITE.shortName}
          </>
        }
        stats={HERO_STATS}
        note={HERO_NOTE}
        paragraphs={HERO_TEXT}
        share={{ title: `${SITE.shortName} 소개`, text: `${SITE.shortName}: 학생과 현업자 사이를 잇는 동국대학교 개발자 커뮤니티입니다.` }}
      />
      <Evolution gens={GENERATIONS} />
      <MissionBand
        photoId="2024-05-16-open-seminar-group"
        label="Mission"
        statement={
          <>
            학생과 현업자 사이를 잇는
            <br />
            동국대학교 개발자 커뮤니티입니다.
          </>
        }
        en="Connecting students and professionals at Dongguk University."
      />
      <WorkCards title="How We Work" cards={WORK} />
      <QuoteBanner>{BAND.lines.join(' ')}</QuoteBanner>

    <div className={`container ${s.page}`}>
      <Section id="upcoming" title="다가오는 일정">
        {loading ||
          failed ||
          (ahead.length === 0 ? (
            <StateLine>지금 공개된 다가오는 일정이 없습니다. 새 일정은 인스타그램 {SITE.links.instagramHandle}에 먼저 올립니다.</StateLine>
          ) : (
            <>
              <Upcoming events={ahead} today={today} timeOf={timeOf} terms={lineTerms} />
              <OverviewToggle events={shown} today={today} />
            </>
          ))}
      </Section>


      <Section
        id="records"
        title="기수별 기록"
        desc="끝난 행사를 누르면 gdg.community.dev 행사 페이지가 열립니다."
        aside={
          tally.length > 0 && (
            <p className={c.tallyLine}>
              {tally.map((t, i) => (
                <span key={t.id} className={c.tallyItem}>
                  {i > 0 && (
                    <>
                      <span className={c.tallySep} aria-hidden="true" />
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
      </Section>
    </div>
    </>
  )
}
