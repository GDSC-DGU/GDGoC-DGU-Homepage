import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useHashScroll } from './community/useHashScroll'
import { SPRINT } from '@/config/site'
import { CHAPTER, isPublicProject } from '@/content'
import { useProjects } from '@/data/queries'
import type { Project } from '@/domain/types'
import { scrollToSection } from '@/features/home/scrollTo'
import { PlaceHero, type DirectoryRow } from '@/features/placehero/PlaceHero'
import { useToday } from '@/hooks/useToday'
import { shortDate } from '@/lib/date'
import { ExternalLink, StateLine } from './PageParts'
import { OTHER_PROGRAMS } from './projectGroups'
import { GridCard, ProjectGrid } from './projects/ExhibitCard'
import { neighbors, type Room } from './projects/exhibit'
import { GEN_PARAM, genTabId, generationTabs, parseTab, tabOfProject, tabOfRoom } from './projects/generations'
import { GenTabs } from './projects/GenTabs'
import { ProjectSheet } from './projects/ProjectSheet'
import { isSheetState, SHEET_PARAM } from './projects/sheetLink'
import { SprintBand } from './projects/SprintBand'
import s from './pages.module.css'
import p from './projects.module.css'

const EMPTY: Project[] = []

const PANEL_ID = 'gen-panel'

/**
 * 전시실 하나: 머리 한 줄(큰 해 · 프로그램 | 오른쪽 끝 기수 · 개수) → 카드 격자 (그림 · 이름 · 한 줄 설명).
 * 탭의 첫 방은 탭 위 먹선이 머리 선을 대신한다. first: 탭의 첫 방 (첫 줄 그림을 먼저 불러온다)
 */
function RoomSection({ room, first }: { room: Room; first: boolean }) {
  const other = room.title === OTHER_PROGRAMS
  const gens = room.generations.map((n) => `${n}기`).join(' · ')
  return (
    <section id={room.id} className={p.room} aria-labelledby={`${room.id}-title`}>
      <header className={p.roomHead}>
        {/* 같은 프로그램 이름(Solution Challenge)이 해마다 있으므로 제목에 연도까지 넣는다 */}
        <h3 id={`${room.id}-title`} className={p.roomTitle}>
          {/* 그 밖의 프로젝트는 여러 해가 섞여 연도를 쓰지 않는다 (연도는 카드마다) */}
          {!other && <span className={`${p.roomYear} num`}>{room.yearLabel}</span>}
          <span className={p.roomProgram}>{room.title}</span>
        </h3>
        <p className={p.roomMeta}>
          {!other && gens && <>{gens} · </>}
          <span className="num">{room.projects.length}</span>개
        </p>
      </header>
      <ProjectGrid label={other ? room.title : `${room.yearLabel} ${room.title}`}>
        {room.projects.map((pr, i) => (
          <GridCard key={pr.id} project={pr} withProgram={other} eager={first && i < 3} />
        ))}
      </ProjectGrid>
    </section>
  )
}

/**
 * 프로젝트: 머리(제목 · 한 줄 · 안내판 | 건물) → 탭(3기 · 2기 · 1기 · 기타) → 그 탭의 전시실(카드 격자) → 먹색 4기 G-Sprint 띠.
 * 페이지 끝에 지원 안내(JoinStrip)를 붙이지 않는다: 이 페이지는 프로젝트만 (4기 시안 2026-11).
 * 고른 탭은 주소 ?gen=2 · ?gen=etc (보내면 같은 탭이 열린다). 작품을 누르면 자세히 보기 창(?p=id).
 * 탭: ?gen → 주소 #방 → 열린 창의 작품 → 가장 최근 기수.
 */
export function ProjectsPage() {
  const today = useToday()
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { data, isPending, isError, refetch } = useProjects()
  // 홈 '어떻게 하나요'의 G-Sprint 줄 · 안내판에서 /projects#now 로 들어오면 그 섹션으로 내려간다
  useHashScroll(!isPending)
  const projects = data ?? EMPTY
  const done = useMemo(() => projects.filter((pr) => pr.status === 'done'), [projects])
  // 숫자는 공개 기준(GitHub GDSC-DGU 조직 저장소)으로 센다. src/content 의 PUBLIC_PROJECTS 와 같은 기준
  const publicCount = done.filter(isPublicProject).length
  const tabs = useMemo(() => generationTabs(done), [done])
  const sprint = CHAPTER.sprint
  const sprintRunning = today <= SPRINT.demoDay

  /* ── 자세히 보기 창: 주소의 ?p=<id> 가 곧 열린 상태 ── */
  const openId = params.get(SHEET_PARAM)
  const open = openId ? (done.find((pr) => pr.id === openId) ?? null) : null

  /* ── 기수 탭 ── */
  const hashRoom = location.hash ? decodeURIComponent(location.hash.slice(1)) : ''
  const activeKey = parseTab(params.get(GEN_PARAM), tabs) ?? (hashRoom ? tabOfRoom(tabs, hashRoom) : undefined) ?? (open ? tabOfProject(tabs, open.id) : undefined) ?? tabs[0]?.key
  const activeTab = tabs.find((t) => t.key === activeKey)
  // 창의 앞 · 뒤 작품은 그 작품이 든 탭 안에서만
  const openTab = open ? tabs.find((t) => t.key === tabOfProject(tabs, open.id)) : undefined
  const sheetRooms = openTab?.rooms ?? []
  const { prev, next } = open ? neighbors(sheetRooms, open.id) : {}
  const openRoom = open ? sheetRooms.find((r) => r.projects.includes(open)) : undefined

  const setTab = useCallback(
    (key: string) => {
      const nextParams = new URLSearchParams(params)
      nextParams.set(GEN_PARAM, key)
      setParams(nextParams, { replace: true, preventScrollReset: true })
    },
    [params, setParams],
  )
  // 안내판에서 방을 고르면: 그 방이 지금 탭에 있으면 바로, 다른 기수면 탭을 바꾸고 그 방이 그려진 뒤 내려간다
  const scrollTarget = useRef<string | null>(null)
  useEffect(() => {
    const id = scrollTarget.current
    if (!id || !document.getElementById(id)) return
    scrollTarget.current = null
    scrollToSection(id)
  }, [activeKey])
  const goToRoom = useCallback(
    (key: string, id: string) => {
      if (document.getElementById(id)) return scrollToSection(id)
      scrollTarget.current = id
      setTab(key)
    },
    [setTab],
  )
  const live = useRef({ params, state: location.state as unknown })
  const lastOpen = useRef<string | null>(null)
  useEffect(() => {
    live.current = { params, state: location.state }
  }, [params, location.state])
  useEffect(() => {
    if (open) lastOpen.current = open.id
  }, [open])

  const onSheetClosed = useCallback(() => {
    const { params: cur, state } = live.current
    if (cur.get(SHEET_PARAM)) {
      // 페이지 안에서 연 창이면 한 칸 뒤로, 주소로 바로 들어왔으면 ?p 만 떼고 이 페이지에 남는다
      if (isSheetState(state)) navigate(-1)
      else {
        const rest = new URLSearchParams(cur)
        rest.delete(SHEET_PARAM)
        setParams(rest, { replace: true, preventScrollReset: true })
      }
    }
    // 연 자리를 모르면(주소로 바로 연 창) 그 작품으로 초점을 옮긴다
    requestAnimationFrame(() => {
      const active = document.activeElement
      // 초점이 이미 페이지의 어딘가로 돌아갔으면 그대로 둔다 (닫히는 창 안이나 body 면 옮긴다)
      if (active && active !== document.body && active.id !== 'main' && !active.closest('dialog')) return
      const id = lastOpen.current
      if (id) document.querySelector<HTMLElement>(`[data-sheet-card="${CSS.escape(id)}"]`)?.focus()
    })
  }, [navigate, setParams])

  // 건물 안내판: 지금(4기 G-Sprint) 한 줄 + 전시실마다 한 줄
  const directory: DirectoryRow[] = [
    {
      label: 'G-Sprint',
      value:
        sprint.verified && sprintRunning ? (
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
    },
    ...tabs.flatMap((t) =>
      t.rooms.map((r) => ({
        label: r.title,
        value:
          r.title === OTHER_PROGRAMS ? (
            <>
              <span className="num">{r.projects.length}</span>개
            </>
          ) : (
            <>
              <span className="num">{r.yearLabel}</span> · <span className="num">{r.projects.length}</span>개
            </>
          ),
        href: `#${r.id}`,
        onSelect: () => goToRoom(t.key, r.id),
      })),
    ),
  ]

  const status = isPending ? (
    <StateLine>프로젝트를 불러오는 중입니다.</StateLine>
  ) : isError ? (
    <StateLine onRetry={() => void refetch()}>프로젝트를 불러오지 못했습니다.</StateLine>
  ) : null

  return (
    <div className={`container ${s.page}`}>
      <PlaceHero place="projects" title="프로젝트" lead="GDGoC DGU에서 진행된 프로젝트 둘러보기" directory={directory} plateAt="text" />

      {/* 기수 탭 → 그 기수의 전시실 (제목은 읽기 프로그램용. 보이는 머리는 탭과 방마다의 해 · 프로그램) */}
      <section id="archive" className={`story paper ${p.archive}`} aria-labelledby="archive-title">
        <h2 id="archive-title" className="visually-hidden">
          지난 프로젝트 {publicCount}개
        </h2>
        {status ??
          (done.length === 0 ? (
            <StateLine>
              아직 옮겨 온 지난 프로젝트가 없습니다. 지난 기수의 저장소는{' '}
              <ExternalLink href={CHAPTER.github} className={s.inlineLink}>
                GitHub
              </ExternalLink>
              에서 볼 수 있습니다.
            </StateLine>
          ) : (
            activeTab && (
              <>
                <GenTabs tabs={tabs} active={activeTab.key} onChange={setTab} panelId={PANEL_ID} />
                <div id={PANEL_ID} role="tabpanel" aria-labelledby={genTabId(activeTab.key)} className={p.rooms}>
                  {activeTab.rooms.map((r, i) => (
                    <RoomSection key={r.id} room={r} first={i === 0} />
                  ))}
                </div>
              </>
            )
          ))}
        {/* 자세히 보기 창 (dialog: 맨 위 층에 뜨므로 놓인 자리는 화면에 영향이 없다) */}
        <ProjectSheet
          project={open}
          prev={prev}
          next={next}
          roomTitle={openRoom ? `${openRoom.yearLabel} ${openRoom.title}` : undefined}
          position={openRoom && open ? [openRoom.projects.indexOf(open) + 1, openRoom.projects.length] : undefined}
          walkState={location.state}
          onClosed={onSheetClosed}
        />
      </section>

      <SprintBand today={today} />
    </div>
  )
}
