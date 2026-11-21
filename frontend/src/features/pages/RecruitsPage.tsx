import { Link, useSearchParams } from 'react-router-dom'
import { PLACE_BY_ID } from '@/config/places'
import { DEV_SWITCH, SITE, SPRINT } from '@/config/site'
import { CHAPTER, FAQS, PUBLIC_PROJECTS, RECRUITING, SEMINARS } from '@/content'
import { GLOSSARY } from '@/content/glossary'
import { BAND } from '@/content/story'
import { APPLY_PATH, applyTarget, recruitStatus, type RecruitStatus } from '@/content/recruitingStatus'
import { StorySection } from '@/features/common'
import { DarkProgram, type DarkCard, type GlassStat } from '@/features/dcamp/DarkProgram'
import { Process, type ProcessStep } from '@/features/dcamp/Process'
import { InfoCards, type InfoCard } from '@/features/dcamp/ProgramHero'
import { StickyCta } from '@/features/dcamp/StickyCta'
import { useToday } from '@/hooks/useToday'
import { useHashScroll } from './community/useHashScroll'
import { Section, StateLine } from './PageParts'
import { RecruitHero } from './recruits/RecruitHero'
import { DevSwitch } from './recruits/DevSwitch'
import { Values } from './recruits/Values'
import { applyView, readPreview, type Preview } from './recruits/view'
import { FaqTabs } from './recruits/FaqTabs'
import { Parts } from './recruits/Intro'
import { statusView } from './recruits/status'
import s from './pages.module.css'
import r from './recruits.module.css'
import { usePageTitle } from '@/hooks/usePageTitle'

const faqA = (id: string) => FAQS.find((f) => f.id === id)?.a
const dot = (ymd: string) => ymd.replaceAll('-', '.')
/** '2026.08.18~08.31' (같은 해면 뒤에서 해를 뺀다) */
const span = (a: string, b?: string) => (b ? (a.slice(0, 4) === b.slice(0, 4) ? `${dot(a)}~${dot(b).slice(5)}` : `${dot(a)}~${dot(b)}`) : dot(a))

/** 가장 최근 기수의 모집 단계 (recruiting.json history, 시작한 날 순서) */
const LAST = [...RECRUITING.history].sort((a, b) => b.generation - a.generation)[0]
const LAST_STEPS = LAST ? [...LAST.steps].sort((a, b) => a.start.localeCompare(b.start)) : []

/** 검정 띠의 숫자 (저장소 자료에서 센다) */
const SEMINAR_GENS = [...new Set(SEMINARS.map((x) => x.generation))].sort((a, b) => a - b)
const genSpan = (ns: readonly number[]) => (ns.length > 1 ? `${ns[0]}~${ns[ns.length - 1]}` : String(ns[0] ?? ''))
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
  { id: 'parts', icon: 'monitor', title: '파트 세션', lines: ['Frontend, Backend, AI/ML, Product Design', '파트마다 코어 멤버가 세션을 이끕니다'] },
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
 * '지원하기' 버튼 (첫 화면 · 아래 고정 띠가 같이 쓴다).
 *  - form: 지원서 페이지(/recruits/apply)로 간다 (2026-11-12: 별도 페이지가 가장 깔끔). 개발 화면의 '모집 중' 보기면 그 상태를 이어 간다
 *  - 모집 중인데 바깥 지원서(applyUrl)면 그 주소 (새 창)
 *  - 그 밖(모집 전 · 마감 · 지원서 API 전): 꺼진 버튼. 이유는 첫 화면 상태 한 줄과 버튼 아래 한 줄이 말한다
 */
function ApplyButton({ st, mode, preview }: { st: RecruitStatus; mode: 'form' | 'closed'; preview: Preview }) {
  const target = applyTarget(st)
  if (mode === 'form')
    return (
      <Link className="btn-primary" to={preview === 'open' ? `${APPLY_PATH}?preview=open` : APPLY_PATH}>
        지원하기
      </Link>
    )
  if (target?.external)
    return (
      <a className="btn-primary" href={target.href} target="_blank" rel="noreferrer">
        지원하기
        <span className="visually-hidden"> ({st.generation}기 지원서, 새 창)</span>
      </a>
    )
  return (
    <button type="button" className="btn-primary" disabled aria-describedby="apply-closed-why">
      지원하기
    </button>
  )
}

/** '{gen}기 소식 받기' (인스타그램, 새 창): 모집 기간이 아닐 때 첫 화면의 두 번째 버튼 */
function NotifyLink({ st }: { st: RecruitStatus }) {
  return (
    <a className="btn-secondary" href={st.channelUrl} target="_blank" rel="noreferrer">
      {st.generation}기 소식 받기
      <span className="visually-hidden"> (인스타그램 {SITE.links.instagramHandle}, 새 창)</span>
    </a>
  )
}

/**
 * 지원하기 (/recruits). 2026-11-12 개편 (BOAZ 리크루팅 참고):
 *  1. 첫 화면(화면 꽉 채움): 검정 + 주황 빛, 큰 한 문장 → 짧은 소개 → 모집 상태 한 줄 → '지원하기'
 *     모집 중이면 '지원하기'가 지원서 페이지(/recruits/apply, features/apply)로 가고, 아니면 꺼진 버튼 + '{gen}기 소식 받기'
 *  2. (번호 비움: 지원서는 이 페이지에 두지 않는다)
 *  3. 지원 안내(대상 · 방법. 기간 · 지난 일정은 '모집 과정'과 겹쳐 뺐다)
 *  4. 인재상(자유 · 열정 · 끈기, 검정 면) → 파트(옅은 회색) → 주요 활동(검정 띠) → 모집 과정(옅은 회색) → 자주 묻는 질문 → 아래 고정 띠
 *     먹색 면이 둘 연달아 오지 않게 이 순서로 둔다 (DESIGN 2장).
 * 개발 화면(DEV_SWITCH)에서는 왼쪽 아래 '개발' 버튼으로 모집 중 ↔ 모집 기간 아님을 오간다 (?preview=, recruits/view.ts).
 * 페이지 끝 JoinStrip 은 넣지 않는다 (이 페이지 자체가 같은 내용). 연락처는 꼬리말과 '문의' 질문에 있다.
 */
export function RecruitsPage() {
  usePageTitle(PLACE_BY_ID.recruits.label)
  const today = useToday()
  const [params] = useSearchParams()
  const st = recruitStatus(today)
  const view = statusView(st, today, SITE.links.instagramHandle)
  const preview = readPreview(params.get('preview'), DEV_SWITCH)
  const mode = applyView(st, preview)
  const external = mode === 'closed' && applyTarget(st)?.external
  // 지금 활동 중인 기수 = 가장 최근에 모집한 기수 (recruiting.json history)
  const semesterGen = LAST?.generation ?? st.generation - 1
  useHashScroll(true)

  const who = faqA('who')
  const cards: InfoCard[] = [
    {
      id: 'who',
      icon: 'person',
      title: '지원 대상',
      value: who ? '동국대학교 서울캠퍼스 재학생, 휴학생, 수료생' : '모집 공지에서 알려 드립니다.',
      notes: who ? ['전공과 학년 상관없음 (비전공자, 1학년도 지원 가능)', <>매주 화요일 <span className="num">18:00</span> 정기 모임에 나올 수 있는 분</>] : undefined,
    },
    { id: 'how', icon: 'doc', title: '지원 방법', value: faqA('how-to-apply') ?? '모집 공지에서 알려 드립니다.' },
  ]

  // 첫 화면 상태 한 줄: '5기 모집 중 · 03.10 마감 · D-5' / '5기 모집은 아직 열리지 않았습니다'
  const heroStatus =
    preview === 'open' ? (
      `${st.generation}기 모집 중 (개발 화면 예시)`
    ) : (
      <>
        {view.title}
        {view.titleSub && ` · ${view.titleSub}`}
        {view.dday && (
          <>
            {' · '}
            <span className="num">{view.dday.label}</span>
          </>
        )}
      </>
    )
  const closedWhy =
    st.state === 'soon' && st.opensAt
      ? `모집이 열리는 날 버튼이 켜집니다. 인스타그램 ${SITE.links.instagramHandle}에도 알립니다.`
      : st.state === 'ended'
        ? `${st.generation}기 지원은 마감됐습니다. 다음 모집 소식은 인스타그램 ${SITE.links.instagramHandle}에 올립니다.`
        : `모집이 열리면 버튼이 켜집니다. 일정은 인스타그램 ${SITE.links.instagramHandle}에 가장 먼저 알립니다.`

  return (
    <>
      <RecruitHero
        trail={[PLACE_BY_ID.recruits.label]}
        title={`같이 만들고 배울 ${st.generation}기를 찾습니다`}
        intro={['GDGoC DGU는 동국대학교 개발자 커뮤니티입니다.', '매주 화요일 파트별로 모이고, 한 학기 동안 팀을 짜서 서비스를 만듭니다.']}
        status={heroStatus}
        action={
          <>
            <span className="btn-row">
              <ApplyButton st={st} mode={mode} preview={preview} />
              {mode === 'closed' && !external && <NotifyLink st={st} />}
            </span>
            {mode === 'closed' && !external && (
              <p id="apply-closed-why" className={r.closedWhy}>
                {closedWhy}
              </p>
            )}
          </>
        }
      />

      <section id="guide" className={r.guide} aria-labelledby="guide-title">
        <div className="container">
          <h2 id="guide-title" className={r.guideTitle}>
            지원 안내
          </h2>
          <InfoCards cards={cards} headingLevel={3} />
        </div>
      </section>

      <Values generation={st.generation} name={SITE.shortName} />

      <div className={`container ${s.page}`}>
        {FAQS.some((f) => f.id === 'parts') && (
          <StorySection id="parts" tone="field" className={r.flush} title="파트마다 같은 문제를 각자 풀고 비교합니다" sub="파트 세션은 코어 멤버가 이끕니다.">
            <Parts />
          </StorySection>
        )}
      </div>

      <DarkProgram id="activities" title={<>{semesterGen}기는 {BAND.lines[0]}<br />{BAND.lines[1]}</>} stats={STATS} cardsTitle="주요 활동" cards={ACTIVITIES} />

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
        {mode === 'closed' && !external ? <NotifyLink st={st} /> : <ApplyButton st={st} mode={mode} preview={preview} />}
      </StickyCta>

      {DEV_SWITCH && <DevSwitch mode={mode} />}
    </>
  )
}
