import { useMemo } from 'react'
import { PLACE_BY_ID, placeColor } from '@/config/places'
import { SITE } from '@/config/site'
import { CHAPTER, EVENTS, FAQS, RECRUITING } from '@/content'
import { recruitStatus, type RecruitStatus } from '@/content/recruitingStatus'
import { useSchedule } from '@/data/queries'
import { StorySection } from '@/features/common'
import { Term } from '@/features/glossary/Term'
import { PlaceHero, type DirectoryRow } from '@/features/placehero/PlaceHero'
import { useToday } from '@/hooks/useToday'
import { dotDate, pageSources } from './community/pageSources'
import { PageSources } from './community/Signage'
import { useHashScroll } from './community/useHashScroll'
import { Section, StateLine } from './PageParts'
import { buildBatches } from './recruits/batches'
import { FaqTabs } from './recruits/FaqTabs'
import { eligibilityFacts } from './recruits/eligibility'
import { Eligibility, Parts } from './recruits/Intro'
import { SemesterPicture } from './recruits/Semester'
import { ShareAction } from './recruits/ShareAction'
import { statusView } from './recruits/status'
import s from './pages.module.css'
import r from './recruits.module.css'
import { usePageTitle } from '@/hooks/usePageTitle'

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
            : `${SITE.shortName} ${st.generation}기 모집 소식은 인스타그램 ${handle}에 가장 먼저 올라옵니다.`
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
  const who = eligibilityFacts()

  const directory: DirectoryRow[] = [
    { label: '지원 자격', value: '전공 · 학년 무관', href: '#who' },
    { label: '들어오면 이런 한 해', value: <>화요일 <span className="num">18:00</span></>, href: '#year' },
    { label: '파트', value: <><span className="num">4</span>개</>, href: '#parts' },
    { label: '자주 묻는 질문', value: <><span className="num">{FAQS.length}</span>개</>, href: '#faq' },
  ]

  // 이 페이지가 기대는 출처: 지원서 · 모집 게시물 · 행사 페이지 · 운영 계획 · README (페이지 끝 한 줄)
  const sources = pageSources(
    [
      ...FAQS.map((f) => f.source),
      ...(latest?.steps.map((x) => x.source) ?? []),
      ...events.filter((e) => e.generation === semesterGen).map((e) => e.source),
      CHAPTER.github,
    ],
    { 'gdg.community.dev': CHAPTER.chapterPage, 'instagram.com': st.channelUrl, 'github.com': CHAPTER.github },
  )

  const yearDesc = (
    <>
      {semesterGen}기가 실제로 보내는 한 해입니다. 매주 화요일 세션 사이에 <Term id="g-sprint" more /> 단계와 연합 행사가 끼고, 시험 기간에는 쉽니다.
    </>
  )

  return (
    <div className={`container ${s.page}`}>
      <PlaceHero
        place="recruits"
        state={isOpen ? 'open' : 'closed'}
        eyebrow={PLACE_BY_ID.recruits.label}
        title={
          view.titleSub ? (
            <>
              {view.title}
              <span className={r.titleSep}> · </span>
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
        meta={<StatusActions st={st} primary={view.primary} />}
        directory={directory}
      />

      {who.some((f) => f.id === 'major') && (
        <StorySection
          id="who"
          tone="field"
          eyebrow="지원 자격"
          placeColor={placeColor('recruits')}
          title="전공 · 학년과 상관없이 지원할 수 있습니다"
          sub={`${semesterGen}기 지원서에 적힌 조건입니다. ${st.generation}기 조건은 모집 공지에서 다시 알립니다.`}
        >
          <Eligibility facts={who} />
        </StorySection>
      )}

      <Section id="year" title="들어오면 이런 한 해" desc={yearDesc}>
        <SemesterPicture events={events} today={today} generation={semesterGen} />
      </Section>

      {FAQS.some((f) => f.id === 'parts') && (
        <StorySection
          id="parts"
          tone="field"
          eyebrow="네 파트"
          placeColor={placeColor('recruits')}
          title="파트마다 같은 문제를 각자 풀고 비교합니다"
          sub={`${semesterGen}기는 Frontend · Backend · AI/ML · Product Design 네 파트입니다. 파트마다 코어 멤버가 세션을 이끌고, 강의 대신 서로의 풀이와 그 이유를 봅니다.`}
        >
          <Parts />
        </StorySection>
      )}

      <Section id="faq" title="자주 묻는 질문" desc="지원하기 전에 묻는 것과 들어와서 하는 것을 나눴습니다.">
        {FAQS.length === 0 ? (
          <StateLine>답을 정리하고 있습니다. 그동안 궁금한 점은 {CHAPTER.email}로 물어봐 주세요.</StateLine>
        ) : (
          <FaqTabs faqs={FAQS} open={OPEN_FAQ} />
        )}
        <PageSources items={sources} updated={<>모집 기록 <span className="num">{dotDate(RECRUITING.updatedAt)}</span> 갱신</>} />
      </Section>
    </div>
  )
}
