import { useMemo } from 'react'
import { PLACE_BY_ID } from '@/config/places'
import { SITE, SPRINT } from '@/config/site'
import { CHAPTER, EVENTS, FAQS, PUBLIC_PROJECTS, RECRUITING, SEMINARS } from '@/content'
import { GLOSSARY } from '@/content/glossary'
import { BAND, voices } from '@/content/story'
import { recruitStatus, type RecruitStatus } from '@/content/recruitingStatus'
import { useSchedule } from '@/data/queries'
import { StorySection } from '@/features/common'
import { DarkProgram, type DarkCard, type GlassStat } from '@/features/dcamp/DarkProgram'
import { Process, type ProcessStep } from '@/features/dcamp/Process'
import { ProgramHero, type InfoCard } from '@/features/dcamp/ProgramHero'
import { QuoteRow } from '@/features/dcamp/QuoteRow'
import { StickyCta } from '@/features/dcamp/StickyCta'
import { Term } from '@/features/glossary/Term'
import { isShowableVoice } from '@/features/home/homeData'
import { useToday } from '@/hooks/useToday'
import { useHashScroll } from './community/useHashScroll'
import { Section, StateLine } from './PageParts'
import { buildBatches } from './recruits/batches'
import { FaqTabs } from './recruits/FaqTabs'
import { Parts } from './recruits/Intro'
import { SemesterPicture } from './recruits/Semester'
import { ShareAction } from './recruits/ShareAction'
import { statusView } from './recruits/status'
import s from './pages.module.css'
import r from './recruits.module.css'
import { usePageTitle } from '@/hooks/usePageTitle'

const faqA = (id: string) => FAQS.find((f) => f.id === id)?.a
const dot = (ymd: string) => ymd.replaceAll('-', '.')
/** '2026.08.18–08.31' (같은 해면 뒤에서 해를 뺀다) */
const span = (a: string, b?: string) => (b ? (a.slice(0, 4) === b.slice(0, 4) ? `${dot(a)}–${dot(b).slice(5)}` : `${dot(a)}–${dot(b)}`) : dot(a))

/** 가장 최근 기수의 모집 단계 (recruiting.json history, 시작한 날 순서) */
const LAST = [...RECRUITING.history].sort((a, b) => b.generation - a.generation)[0]
const LAST_STEPS = LAST ? [...LAST.steps].sort((a, b) => a.start.localeCompare(b.start)) : []

/** 검정 띠의 숫자 (저장소 자료에서 센다) */
const SEMINAR_GENS = [...new Set(SEMINARS.map((x) => x.generation))].sort((a, b) => a - b)
const genSpan = (ns: readonly number[]) => (ns.length > 1 ? `${ns[0]}–${ns[ns.length - 1]}` : String(ns[0] ?? ''))
const PROJECT_GENS = [...new Set(PUBLIC_PROJECTS.map((x) => x.generation).filter((g): g is number => typeof g === 'number'))].sort((a, b) => a - b)
const SPRINT_OK = CHAPTER.sprint?.verified ? CHAPTER.sprint : null
const STATS: GlassStat[] = [
  { label: `${genSpan(PROJECT_GENS)}기 누적`, value: <>공개 프로젝트 <span className="num">{PUBLIC_PROJECTS.length}</span>개</> },
  { label: `${genSpan(SEMINAR_GENS)}기 멤버 세미나`, value: <>발표 <span className="num">{SEMINARS.length}</span>개</> },
  ...(SPRINT_OK
    ? [{ label: `${GLOSSARY['g-sprint'].term} 진행 중`, value: <><span className="num">{SPRINT_OK.teams}</span>팀 <span className="num">{SPRINT_OK.members}</span>명이 서비스를 만드는 중</> }]
    : []),
]

/** 주요 활동 (faq · glossary 에서) */
const ACTIVITIES: DarkCard[] = [
  { id: 'sessions', icon: 'calendar', title: '정기 세션', lines: [<>매주 화요일 <span className="num">18:00</span></>, '파트별로 같은 문제를 각자 풀고 비교하는 실습'] },
  { id: 'parts', icon: 'monitor', title: '파트 세션', lines: ['Frontend · Backend · AI/ML · Product Design', '파트마다 코어 멤버가 세션을 이끕니다'] },
  { id: 'sprint', icon: 'sprint', title: GLOSSARY['g-sprint'].term, lines: [GLOSSARY['g-sprint'].short, '아이디어부터 배포까지 서비스 하나', 'Google 기술을 하나 이상 씁니다'] },
  { id: 'demo', icon: 'star', title: GLOSSARY['demo-day'].term, lines: [GLOSSARY['demo-day'].short, ...(SPRINT_OK ? [<>4기는 <span className="num">{dot(SPRINT.demoDay)}</span></>] : [])] },
  { id: 'seminar', icon: 'mic', title: '멤버 세미나', lines: ['멤버가 주제를 정해 직접 발표합니다', <>{genSpan(SEMINAR_GENS)}기 발표 <span className="num">{SEMINARS.length}</span>개</>] },
  { id: 'joint', icon: 'people', title: '연합 행사', lines: [`${GLOSSARY['dong-hong'].term}: ${GLOSSARY['dong-hong'].short}`, '동지톤'] },
]

/** 모집 과정 (지난 기수 실제 일정) */
const STEPS: ProcessStep[] = LAST_STEPS.map((st) => ({ id: st.id, title: st.label, when: <span className="num">{span(st.start, st.end)}</span>, note: st.note }))

/** 처음부터 펼쳐 둘 질문: 모집이 열리지 않은 동안 가장 먼저 묻는 것 */
const OPEN_FAQ = ['when-recruit']

/**
 * 머리 행동: 주 버튼 하나 + 두 번째 버튼 '친구에게 알려 주기'.
 * 버튼 이름은 사이트 전체에서 '5기 소식 받기'(인스타그램) · '지원서 쓰기'(모집 중) · '친구에게 알려 주기' 세 가지만 쓴다.
 * 소식 받기는 이 페이지에서 여기 한 번 (꼬리말에도 같은 이름의 링크가 있다). 폰에서는 두 버튼이 한 줄 가득.
 */
function StatusActions({ st, primary }: { st: RecruitStatus; primary: 'apply' | 'channel' }) {
  const handle = SITE.links.instagramHandle
  const apply = primary === 'apply' && st.applyUrl
  return (
    <span className={`btn-row ${r.actions}`}>
      {apply ? (
        <a className="btn-primary" href={st.applyUrl} target="_blank" rel="noreferrer">
          지원서 쓰기
          <span className="visually-hidden"> (새 창)</span>
          <span aria-hidden="true">↗</span>
        </a>
      ) : (
        <a className="btn-primary" href={st.channelUrl} target="_blank" rel="noreferrer">
          {st.generation}기 소식 받기
          <span className="visually-hidden"> (인스타그램 {handle}, 새 창)</span>
          <span aria-hidden="true">↗</span>
        </a>
      )}
      <ShareAction
        className="btn-secondary"
        title={`${SITE.shortName} 지원 안내`}
        text={
          st.state === 'open'
            ? `${SITE.shortName} ${st.generation}기 모집 중입니다.`
            : `${SITE.shortName} ${st.generation}기 모집 소식은 인스타그램 ${handle}에 올라옵니다.`
        }
      />
    </span>
  )
}

/**
 * 지원 안내 (모집 랜딩, 시안 E).
 * 모집 상태(날짜로 계산: content/recruitingStatus.ts) + 주 버튼 · 두 번째 버튼 → 옅은 회색 '지원 자격'(주장 + 흰 판 셋)
 * → 들어오면 이런 한 해(참고, 달별 일정 하나) → '네 파트'(2 × 2 판 + 지난 프로젝트 아이콘) → 자주 묻는 질문(참고) + 출처 한 줄.
 * 면: 흰(머리) → 옅은 회색 → 흰 → 흰 → 흰 → 먹색 꼬리말. 페이지 끝 JoinStrip 은 넣지 않는다 (이 페이지 자체가 같은 내용).
 * 각주는 두 개까지(한 해의 계획 일정 · 파트 예의 기준), 출처 주소는 맨 끝 한 줄에만.
 * 연락처는 꼬리말과 '문의' 질문에 있어 따로 섹션을 두지 않는다.
 */
export function RecruitsPage() {
  usePageTitle(PLACE_BY_ID.recruits.label)
  const today = useToday()
  const { data } = useSchedule()
  // 일정은 저장소 스냅샷과 같은 내용이다. 서버에서 받기 전에도 한 해 일정을 그릴 수 있게 스냅샷으로 먼저 그린다
  const events = data ?? EVENTS
  const st = recruitStatus(today)
  const view = statusView(st, today, SITE.links.instagramHandle)
  const isOpen = st.state === 'open'
  const batches = useMemo(() => buildBatches(RECRUITING, events, isOpen), [events, isOpen])
  const latest = batches.find((b) => b.status === 'closed')
  const semesterGen = latest?.generation ?? st.generation - 1
  useHashScroll(true)

  const yearDesc = (
    <>
      매주 화요일 세션 사이사이에 <Term id="g-sprint" more />와 연합 행사가 있습니다.
    </>
  )

  const isOpen2 = isOpen
  const who = faqA('who')
  const cards: InfoCard[] = [
    {
      id: 'period',
      icon: 'calendar',
      title: '모집 기간',
      value: isOpen2 && st.opensAt && st.deadline ? <span className="num">{span(st.opensAt, st.deadline)}</span> : `${st.generation}기 일정은 정해지면 인스타그램 ${SITE.links.instagramHandle}에 공지합니다.`,
      notes: !isOpen2 && LAST ? LAST_STEPS.filter((x) => x.end).map((x) => <>지난 {LAST.generation}기 {x.label}: <span className="num">{span(x.start, x.end)}</span></>) : undefined,
    },
    {
      id: 'who',
      icon: 'person',
      title: '지원 대상',
      value: who ? '동국대학교 서울캠퍼스 재학생 · 휴학생 · 수료생' : '모집 공지에서 알려 드립니다.',
      notes: who ? ['전공 · 학년 상관없음 (비전공자, 1학년도 지원 가능)', <>매주 화요일 <span className="num">18:00</span> 정기 모임에 나올 수 있는 분</>] : undefined,
    },
    { id: 'how', icon: 'doc', title: '지원 방법', value: faqA('how-to-apply') ?? '모집 공지에서 알려 드립니다.' },
  ]
  const shownVoices = voices.filter(isShowableVoice)

  return (
    <>
      <ProgramHero
        trail={[PLACE_BY_ID.recruits.label]}
        eyebrow={
          <>
            {SITE.shortName} <span className="dark">{st.generation}기</span>
          </>
        }
        title={
          view.titleSub ? (
            <>
              {view.title}
              <br />
              <span className={r.titleSub}>{view.titleSub}</span>
            </>
          ) : (
            view.title
          )
        }
        lead={
          <>
            {view.dday && (
              <span className={r.dday}>
                <span className="visually-hidden">{view.dday.what} </span>
                <span className="num">{view.dday.label}</span>
              </span>
            )}
            {view.lines.map((line) => (
              <span key={line} className={r.leadLine}>
                {line}
              </span>
            ))}
          </>
        }
        actions={<StatusActions st={st} primary={view.primary} />}
        cards={cards}
      />

      <DarkProgram id="activities" eyebrow={`${SITE.shortName} ${semesterGen}기`} title={<>{BAND.lines[0]}<br />{BAND.lines[1]}</>} stats={STATS} cardsTitle="주요 활동" cards={ACTIVITIES} />
      <QuoteRow title="멤버 회고" voices={shownVoices} />

      <div className={`container ${s.page}`}>
        {FAQS.some((f) => f.id === 'parts') && (
          <StorySection id="parts" tone="field" className={r.flush} title="파트마다 같은 문제를 각자 풀고 비교합니다" sub="파트 세션은 코어 멤버가 이끕니다.">
            <Parts />
          </StorySection>
        )}

        <Section id="year" title={`${semesterGen}기 달별 일정`} desc={yearDesc}>
          {/* 휴회는 싣지 않는다 (4기 Organizer 2026-11-05: 쉬는 얘기는 브랜드에 쓸모없다) */}
          <SemesterPicture events={events.filter((e) => e.kind !== 'rest')} today={today} generation={semesterGen} />
        </Section>
      </div>

      {STEPS.length > 0 && (
        <Process
          title="Process"
          steps={STEPS}
          note={`${LAST?.generation}기 모집 기준입니다. ${st.generation}기 일정은 정해지면 인스타그램 ${SITE.links.instagramHandle}에 공지합니다.`}
        />
      )}

      <div className={`container ${s.page}`}>
        <Section id="faq" title="자주 묻는 질문">
          {FAQS.length === 0 ? (
            <StateLine>답을 정리하고 있습니다. 그동안 궁금한 점은 {CHAPTER.email}로 물어봐 주세요.</StateLine>
          ) : (
            <FaqTabs faqs={FAQS} open={OPEN_FAQ} />
          )}
        </Section>
      </div>

      <StickyCta
        label={
          <>
            {SITE.shortName} <span className="dark">{st.generation}기</span>
          </>
        }
      >
        {view.primary === 'apply' && st.applyUrl ? (
          <a className="btn-primary" href={st.applyUrl} target="_blank" rel="noreferrer">
            지원서 쓰기<span className="visually-hidden"> (새 창)</span>
            <span aria-hidden="true">↗</span>
          </a>
        ) : (
          <a className="btn-primary" href={st.channelUrl} target="_blank" rel="noreferrer">
            {st.generation}기 소식 받기<span className="visually-hidden"> (인스타그램 {SITE.links.instagramHandle}, 새 창)</span>
            <span aria-hidden="true">↗</span>
          </a>
        )}
      </StickyCta>
    </>
  )
}
