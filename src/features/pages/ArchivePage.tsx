import { useRef, type KeyboardEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PLACE_BY_ID } from '@/config/places'
import { useProjects, useSeminars } from '@/data/queries'
import { PageHero } from '@/features/pagehero/PageHero'
import { usePageTitle } from '@/hooks/usePageTitle'
import { SeminarsView } from './archive/SeminarsView'
import { useHashScroll } from './community/useHashScroll'
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
 * 머리(제목 | 건물) → 보기 탭(프로젝트 · 세미나) → 고른 보기.
 * - 프로젝트: 기수 탭 → 전시실 카드 → 먹색 G-Sprint 띠 (ProjectsView, 예전 /projects 화면 그대로)
 * - 세미나: 기수 거르기 · 찾기 → 기수별 발표 목록 (SeminarsView, 노션 '전 기수 데이터 모음집')
 * 주소: ?view=seminars (없으면 프로젝트). 프로젝트 자세히 보기 창(?p=id)이 있으면 늘 프로젝트.
 * 예전 주소 /projects · /projects?p=id · /projects#now 는 router 가 /archive 로 그대로 옮긴다.
 */
export function ArchivePage() {
  usePageTitle(PLACE_BY_ID.projects.label)
  const [params, setParams] = useSearchParams()
  const view: View = params.get(VIEW_PARAM) === 'seminars' && !params.get(SHEET_PARAM) ? 'seminars' : 'projects'
  const projects = useProjects()
  const seminars = useSeminars()
  const projectCount = projects.data?.filter((p) => p.status === 'done').length
  const seminarCount = seminars.data?.length
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  // 홈 '멤버 세미나'에서 '…#archive-views' 로 들어오면 보기 탭으로 한 번 내려간다
  useHashScroll(view === 'seminars' ? Boolean(seminars.data) : Boolean(projects.data))

  const show = (next: View) => {
    if (next === view) return
    const nextParams = new URLSearchParams()
    if (next === 'seminars') nextParams.set(VIEW_PARAM, 'seminars')
    setParams(nextParams, { replace: true, preventScrollReset: true })
  }

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const to = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? VIEWS.length - 1 : null
    if (to === null) return
    e.preventDefault()
    const j = (to + VIEWS.length) % VIEWS.length
    show(VIEWS[j].key)
    tabRefs.current[j]?.focus()
  }

  return (
    <div className={`container ${s.page}`}>
      <PageHero place="projects" title={PLACE_BY_ID.projects.label} lead="1기부터 지금까지 만든 프로젝트와 세미나 발표입니다." photoId="2023-10-06-camping-seminar-2" />

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
