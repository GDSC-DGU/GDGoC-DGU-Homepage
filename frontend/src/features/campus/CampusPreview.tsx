import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { PLACE_BY_ID } from '@/config/places'
import { SITE, SPRINT } from '@/config/site'
import { CHAPTER, CONTENT_UPDATED_AT, EVENTS, GENERATIONS, PUBLIC_PROJECTS, RECRUITING, projectsBasis } from '@/content'
import type { PlaceId } from '@/domain/types'
import { useIsNarrow } from '@/hooks/useMediaQuery'
import { useToday } from '@/hooks/useToday'
import { ddayLabel, monthDay, weekday } from '@/lib/date'
import { PlaceHero, type DirectoryRow, type HeroPlace, type PlaceHeroProps } from '@/features/placehero/PlaceHero'
import { useCampusActions } from '@/state/useCampus'
import { CampusScene } from './CampusScene'
import { useSceneFit, type SceneLayout } from './useSceneFit'

/** ?hits=projects:3,community:1 → 검색에 걸린 모습을 지도만으로 확인 */
function readHits(): Partial<Record<PlaceId, number>> | null {
  const raw = new URLSearchParams(window.location.search).get('hits')
  if (!raw) return null
  const hits: Partial<Record<PlaceId, number>> = {}
  for (const pair of raw.split(',')) {
    const [id, n] = pair.split(':')
    if (id in PLACE_BY_ID) hits[id as PlaceId] = Number(n) || 1
  }
  return hits
}

const HERO_PLACES: readonly HeroPlace[] = ['projects', 'community', 'recruits', 'teams']

/** ?hero=projects 등. 없거나 틀리면 null (지도 미리보기) */
function readHero(): { place: HeroPlace; state?: PlaceHeroProps['state']; noScreen: boolean; screenTitle?: string } | null {
  const q = new URLSearchParams(window.location.search)
  const raw = q.get('hero')
  if (!raw || !HERO_PLACES.includes(raw as HeroPlace)) return null
  const st = q.get('state')
  const state = st === 'open' || st === 'closed' || st === 'construction' ? st : undefined
  return { place: raw as HeroPlace, state, noScreen: q.has('noscreen'), screenTitle: q.get('title') ?? undefined }
}

/** 콘텐츠 갱신일 '10.17 토' */
const stamp = () => `${monthDay(CONTENT_UPDATED_AT)} ${weekday(CONTENT_UPDATED_AT)}`
const dim = (s: ReactNode) => <span style={{ color: 'var(--ink-500)' }}>{s}</span>

/**
 * 페이지 담당이 넣기 전에 머리를 혼자 띄워 보는 실제와 같은 props (content/* 에서 만든다).
 * 실제 페이지는 자기 데이터로 이 모양을 채운다.
 */
function heroProps(place: HeroPlace, today: string, noScreen: boolean, screenTitle?: string): PlaceHeroProps {
  const sub = PLACE_BY_ID[place].sub
  if (place === 'projects') {
    const done = PUBLIC_PROJECTS.filter((p) => p.status === 'done')
    const groups = new Map<string, { label: string; year: number; n: number }>()
    for (const p of done) {
      const key = `${p.program}`
      const g = groups.get(key) ?? { label: p.program.replace(/ \d{4}/, ''), year: p.year, n: 0 }
      g.n += 1
      groups.set(key, g)
    }
    const rows: DirectoryRow[] = [
      { current: true, label: `G-Sprint ${CHAPTER.sprint.teams}팀 진행 중`, value: `${monthDay(SPRINT.demoDay)} 데모데이`, href: '#now' },
      ...[...groups.values()]
        .sort((a, b) => b.year - a.year || b.n - a.n)
        .slice(0, 4)
        .map((g) => ({ label: <>{g.label}{dim(<> · <span className="num">{g.year}</span></>)}</>, value: g.n, href: '#done' })),
    ]
    return {
      place,
      eyebrow: sub,
      title: '프로젝트',
      lead: '멤버들이 팀을 꾸려 직접 만든 서비스를 모았습니다. 지금은 4기 G-Sprint가 진행 중입니다.',
      meta: (
        <>
          지난 프로젝트 <span className="num">{done.length}</span>개 · {projectsBasis} · <span className="num">{stamp()}</span> 갱신
        </>
      ),
      directory: rows,
    }
  }
  if (place === 'community') {
    const upcoming = EVENTS.filter((e) => e.date >= today && e.kind !== 'rest').sort((a, b) => a.date.localeCompare(b.date))
    const past = EVENTS.filter((e) => e.date < today)
    const next = upcoming[0]
    const byGen = GENERATIONS.map((g) => ({ n: g.n, count: past.filter((e) => e.generation === g.n).length }))
      .filter((g) => g.count > 0)
      .sort((a, b) => b.n - a.n)
    const rows: DirectoryRow[] = [
      ...(next ? [{ label: <>다음 · {next.title}</>, value: ddayLabel(next.date, today), href: '#upcoming' }] : []),
      { label: '다가오는 일정', value: `${upcoming.length}건`, href: '#upcoming' },
      ...byGen.map((g) => ({ current: g.n === 4, label: g.n === 4 ? '행사 기록' : <><span className="num">{g.n}</span>기 행사 기록</>, value: `${g.count}건`, href: '#records' })),
    ]
    return {
      place,
      eyebrow: sub,
      title: '커뮤니티',
      lead: '화요일 정기 세션과 학기마다 여는 행사를 모았습니다. 다가오는 일정을 먼저, 지난 행사는 기수별로 보여 줍니다.',
      meta: (
        <>
          지난 행사 <span className="num">{past.length}</span>건 · gdg.community.dev 기준 · <span className="num">{stamp()}</span> 갱신
        </>
      ),
      directory: rows,
      screen: next && !noScreen ? { date: next.date, title: screenTitle ?? next.title } : undefined,
    }
  }
  if (place === 'recruits') {
    const last = RECRUITING.history[0]
    return {
      place,
      eyebrow: sub,
      title: '지원 안내',
      lead: RECRUITING.current.message,
      meta: (
        <>
          <span className="num">{stamp()}</span> 기준 · 인스타그램 {SITE.links.instagramHandle} 에 먼저 공지
        </>
      ),
      directory: [
        { label: `${RECRUITING.current.generation}기 모집`, value: '일정 미정', href: '#status' },
        { label: <>지난 모집 · <span className="num">{last.generation}</span>기</>, value: `${last.steps.length}단계`, href: '#history' },
        { label: '자주 묻는 질문', href: '#faq' },
        { label: `인스타그램 ${SITE.links.instagramHandle}`, href: SITE.links.instagram },
      ],
    }
  }
  return {
    place,
    eyebrow: sub,
    title: PLACE_BY_ID.teams.label,
    lead: '멤버끼리 스터디 · 프로젝트 · 공모전을 같이할 팀원을 찾는 게시판입니다. 동아리 멤버를 뽑는 곳은 아닙니다.',
    meta: (
      <>
        준비 중 · <span className="num">{stamp()}</span> 기준
      </>
    ),
    directory: [
      { label: '지금 상태', value: '준비 중', href: '#status' },
      { label: '여는 시기', value: '미정', href: '#status' },
      { label: '지금 볼 수 있는 곳', href: '#elsewhere' },
    ],
  }
}

/** /__preview/campus?hero=projects → 하위 페이지 머리만 (아래에 다음 섹션 자리를 흉내 낸다) */
function HeroPreview({ place, state, noScreen, screenTitle }: { place: HeroPlace; state?: PlaceHeroProps['state']; noScreen: boolean; screenTitle?: string }) {
  const today = useToday()
  const props = heroProps(place, today, noScreen, screenTitle)
  return (
    <div className="container">
      <PlaceHero {...props} state={state ?? props.state} />
      <section style={{ marginTop: 'var(--gap-section-near)', paddingTop: 28, borderTop: '1px solid var(--line)', minHeight: 320 }}>
        <h2 style={{ font: 'var(--t-h2)' }}>다음 섹션</h2>
      </section>
    </div>
  )
}

/**
 * 개발용: /__preview/campus 에서 지도만 첫 화면 크기로 띄워 본다 (카드 없이 전체 폭).
 * 데스크톱 1200–1920 × 440–640, 폰 390 × 320 정도로 첫 화면과 같은 크기.
 * ?hero=projects|community|recruits|teams 면 하위 페이지 머리(PlaceHero)를 띄운다 (&state=closed, &noscreen, &title=긴 제목 도 된다).
 */
export function CampusPreview() {
  const hero = readHero()
  if (hero) return <HeroPreview {...hero} />
  return <MapPreview />
}

function MapPreview() {
  const narrow = useIsNarrow()
  const svgRef = useRef<SVGSVGElement>(null)
  const { setHits } = useCampusActions()
  useEffect(() => {
    const hits = readHits()
    if (hits) setHits(hits)
  }, [setHits])
  const getLayout = useCallback((svg: DOMRect): SceneLayout => {
    const full = { x0: 8, y0: 8, x1: svg.width - 8, y1: svg.height - 8 }
    return { bounds: full, prefer: full, obstacles: [] }
  }, [])
  const fit = useSceneFit(svgRef, getLayout, { narrow, flipPins: narrow })
  return (
    <div style={{ position: 'relative', height: narrow ? 320 : 'clamp(440px, 60vh, 640px)', overflow: 'clip' }}>
      <CampusScene svgRef={svgRef} viewBox={fit.viewBox} pinScale={fit.pinScale} labelScale={fit.labelScale} flipRightPins={narrow} compactPins={narrow} />
    </div>
  )
}
