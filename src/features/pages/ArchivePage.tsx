import { useEffect, useRef, type KeyboardEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PLACE_BY_ID } from '@/config/places'
import { SPRINT } from '@/config/site'
import { CHAPTER } from '@/content'
import { useProjects, useSeminars } from '@/data/queries'
import { scrollToSection } from '@/features/home/scrollTo'
import { PlaceHero, type DirectoryRow } from '@/features/placehero/PlaceHero'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useToday } from '@/hooks/useToday'
import { shortDate } from '@/lib/date'
import { SeminarsView } from './archive/SeminarsView'
import { ProjectsView } from './ProjectsPage'
import { SHEET_PARAM } from './projects/sheetLink'
import a from './archive/archive.module.css'
import s from './pages.module.css'

type View = 'projects' | 'seminars'
const VIEW_PARAM = 'view'
const VIEWS: readonly { key: View; label: string }[] = [
  { key: 'projects', label: '프로젝트' },
  { key: 'seminars', label: '세미나' },
]
const PANEL_ID = 'archive-panel'
const viewTabId = (v: View) => `archive-view-${v}`

/**
 * 아카이브 (/archive): 프로젝트와 세미나를 한곳에 (4기 Organizer 결정 2026-11-04: 메뉴 '프로젝트' 자리를 '아카이브'로).
 * 머리(제목 · 안내판 | 건물) → 보기 탭(프로젝트 · 세미나) → 고른 보기.
 * - 프로젝트: 기수 탭 → 전시실 카드 → 먹색 G-Sprint 띠 (ProjectsView, 예전 /projects 화면 그대로)
 * - 세미나: 기수 거르기 · 찾기 → 기수별 발표 목록 (SeminarsView, 노션 '전 기수 데이터 모음집')
 * 주소: ?view=seminars (없으면 프로젝트). 프로젝트 자세히 보기 창(?p=id)이 있으면 늘 프로젝트.
 * 예전 주소 /projects · /projects?p=id · /projects#now 는 router 가 /archive 로 그대로 옮긴다.
 */
export function ArchivePage() {
  usePageTitle(PLACE_BY_ID.projects.label)
  const today = useToday()
  const [params, setParams] = useSearchParams()
  const view: View = params.get(VIEW_PARAM) === 'seminars' && !params.get(SHEET_PARAM) ? 'seminars' : 'projects'
  const projects = useProjects()
  const seminars = useSeminars()
  const projectCount = projects.data?.filter((p) => p.status === 'done').length
  const seminarCount = seminars.data?.length
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  // 안내판에서 다른 보기의 섹션을 고르면: 보기를 바꾸고, 그 섹션이 그려진 뒤 내려간다
  const scrollTarget = useRef<string | null>(null)
  useEffect(() => {
    const id = scrollTarget.current
    if (!id) return
    const frame = requestAnimationFrame(() => {
      if (!document.getElementById(id)) return
      scrollTarget.current = null
      scrollToSection(id)
    })
    return () => cancelAnimationFrame(frame)
  }, [view, projects.data, seminars.data])

  const show = (next: View, target?: string) => {
    if (next !== view) {
      const nextParams = new URLSearchParams()
      if (next === 'seminars') nextParams.set(VIEW_PARAM, 'seminars')
      setParams(nextParams, { replace: true, preventScrollReset: true })
      scrollTarget.current = target ?? null
    } else if (target) scrollToSection(target)
  }

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const to = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? VIEWS.length - 1 : null
    if (to === null) return
    e.preventDefault()
    const j = (to + VIEWS.length) % VIEWS.length
    show(VIEWS[j].key)
    tabRefs.current[j]?.focus()
  }

  const sprint = CHAPTER.sprint
  const count = (n: number | undefined) =>
    n === undefined ? (
      '…'
    ) : (
      <>
        <span className="num">{n}</span>개
      </>
    )
  const directory: DirectoryRow[] = [
    {
      label: 'G-Sprint',
      value:
        sprint.verified && today <= SPRINT.demoDay ? (
          <>
            <span className="num">{sprint.teams}</span>팀 진행 중
          </>
        ) : (
          <>
            <span className="num">{shortDate(SPRINT.demoDay, today)}</span> 데모데이
          </>
        ),
      href: '#now',
      current: true,
      onSelect: () => show('projects', 'now'),
    },
    { label: '프로젝트', value: count(projectCount), href: '#archive-views', onSelect: () => show('projects', 'archive-views') },
    { label: '세미나 발표', value: count(seminarCount), href: '#archive-views', onSelect: () => show('seminars', 'archive-views') },
  ]

  return (
    <div className={`container ${s.page}`}>
      <PlaceHero place="projects" eyebrow={PLACE_BY_ID.projects.sub} title={PLACE_BY_ID.projects.label} lead="1기부터 지금까지 GDGoC DGU의 팀 프로젝트와 세미나 발표를 모았습니다." directory={directory} plateAt="text" />

      <div id="archive-views" className={a.views} role="tablist" aria-label="아카이브 보기">
        {VIEWS.map((v, i) => {
          const selected = v.key === view
          const n = v.key === 'projects' ? projectCount : seminarCount
          return (
            <button
              key={v.key}
              ref={(el) => {
                tabRefs.current[i] = el
              }}
              type="button"
              role="tab"
              id={viewTabId(v.key)}
              className={a.view}
              aria-selected={selected}
              aria-controls={PANEL_ID}
              tabIndex={selected ? 0 : -1}
              onClick={() => show(v.key)}
              onKeyDown={(e) => onTabKey(e, i)}
            >
              {v.label}
              {n !== undefined && <span className={`num ${a.viewCount}`}>{n}</span>}
            </button>
          )
        })}
      </div>

      <div id={PANEL_ID} role="tabpanel" aria-labelledby={viewTabId(view)}>
        {view === 'projects' ? <ProjectsView /> : <SeminarsView />}
      </div>
    </div>
  )
}
