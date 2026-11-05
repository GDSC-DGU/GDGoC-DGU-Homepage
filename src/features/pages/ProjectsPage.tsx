import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useHashScroll } from './community/useHashScroll'
import { CHAPTER, isPublicProject } from '@/content'
import { useProjects } from '@/data/queries'
import type { Project } from '@/domain/types'
import { useToday } from '@/hooks/useToday'
import { ExternalLink, StateLine } from './PageParts'
import { OTHER_PROGRAMS } from './projectGroups'
import { ExhibitCard, GridCard, ProjectGrid, WorkList } from './projects/ExhibitCard'
import { isWorkImage, neighbors, projectGallery, type Room } from './projects/exhibit'
import { GEN_PARAM, genTabId, generationTabs, parseTab, tabOfProject, tabOfRoom } from './projects/generations'
import { GenTabs } from './projects/GenTabs'
import { ProjectSheet } from './projects/ProjectSheet'
import { isSheetState, SHEET_PARAM } from './projects/sheetLink'
import { SprintBand } from './projects/SprintBand'
import s from './pages.module.css'
import p from './projects.module.css'

const EMPTY: Project[] = []

const PANEL_ID = 'gen-panel'

/** 큰 카드에 걸 작품: 실제 그림(화면 · 소개 이미지 · 폰 화면)이 있는 것. 로고 · 구조도만 있거나 그림이 없으면 줄 목록 */
const hasWorkImage = (pr: Project) => projectGallery(pr).some(isWorkImage)

/**
 * 전시실 하나: 머리 한 줄(큰 해 · 프로그램 | 오른쪽 끝 기수 · 개수) → 실제 그림이 있는 작품은 큰 카드 두 칸 → 나머지는 아이콘 줄 목록.
 * (같은 크기 카드에 화면 · 로고 · 글자 표지가 섞여 있었다: 4기 Organizer 2026-11-05)
 * 탭의 첫 방은 탭 위 먹선이 머리 선을 대신한다. first: 탭의 첫 방 (첫 줄 그림을 먼저 불러온다)
 */
function RoomSection({ room, first }: { room: Room; first: boolean }) {
  const other = room.title === OTHER_PROGRAMS
  const gens = room.generations.map((n) => `${n}기`).join(' · ')
  const label = other ? room.title : `${room.yearLabel} ${room.title}`
  const big = room.projects.filter(hasWorkImage)
  const rest = room.projects.filter((pr) => !hasWorkImage(pr))
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
      {big.length > 0 && (
        <ProjectGrid wide label={label}>
          {big.map((pr, i) => (
            <GridCard key={pr.id} project={pr} withProgram={other} eager={first && i < 2} />
          ))}
        </ProjectGrid>
      )}
      {rest.length > 0 && (
        <WorkList label={big.length > 0 ? `${label} 나머지 작품` : label}>
          {rest.map((pr) => (
            <ExhibitCard key={pr.id} project={pr} withProgram={other} />
          ))}
        </WorkList>
      )}
    </section>
  )
}

/**
 * 아카이브 '프로젝트' 보기 (ArchivePage 안): 탭(3기 · 2기 · 1기 · 기타) → 그 탭의 전시실(카드 격자) → 먹색 4기 G-Sprint 띠.
 * 머리(제목 · 안내판 | 건물)는 ArchivePage 가 그린다 (프로젝트 · 세미나를 아카이브 하나로 합침: 4기 Organizer 2026-11-04).
 * 고른 탭은 주소 ?gen=2 · ?gen=etc (보내면 같은 탭이 열린다). 작품을 누르면 자세히 보기 창(?p=id).
 * 탭: ?gen → 주소 #방 → 열린 창의 작품 → 가장 최근 기수.
 */
export function ProjectsView() {
  const today = useToday()
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { data, isPending, isError, refetch } = useProjects()
  // 홈 '어떻게 하나요'의 G-Sprint 줄 · 안내판에서 /archive#now 로 들어오면 그 섹션으로 내려간다
  useHashScroll(!isPending)
  const projects = data ?? EMPTY
  const done = useMemo(() => projects.filter((pr) => pr.status === 'done'), [projects])
  // 숫자는 공개 기준(GitHub GDSC-DGU 조직 저장소)으로 센다. src/content 의 PUBLIC_PROJECTS 와 같은 기준
  const publicCount = done.filter(isPublicProject).length
  const tabs = useMemo(() => generationTabs(done), [done])

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
  const live = useRef({ params, state: location.state as unknown })
  const lastOpen = useRef<string | null>(null)
  const tabsRef = useRef(tabs)
  useEffect(() => {
    live.current = { params, state: location.state }
    tabsRef.current = tabs
  }, [params, location.state, tabs])
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
        // 다른 페이지 · 주소에서 바로 연 창이면 주소에 기수가 없다: 그 작품이 든 탭에 남는다 (QA 2026-11-05: 닫으면 3기 탭으로 튀었다)
        if (!rest.get(GEN_PARAM) && lastOpen.current) {
          const key = tabOfProject(tabsRef.current, lastOpen.current)
          if (key) rest.set(GEN_PARAM, key)
        }
        setParams(rest, { replace: true, preventScrollReset: true })
      }
    }
    // 연 자리를 모르면(주소로 바로 연 창) 그 작품으로 초점을 옮긴다. 탭이 바뀌어 카드가 늦게 그려질 수 있어 몇 번 다시 본다
    let tries = 0
    const focusCard = () => {
      const active = document.activeElement
      // 초점이 이미 페이지의 어딘가로 돌아갔으면 그대로 둔다 (닫히는 창 안이나 body 면 옮긴다)
      if (active && active !== document.body && active.id !== 'main' && !active.closest('dialog')) return
      const id = lastOpen.current
      const card = id ? document.querySelector<HTMLElement>(`[data-sheet-card="${CSS.escape(id)}"]`) : null
      if (card) card.focus()
      else if (++tries < 10) requestAnimationFrame(focusCard)
    }
    requestAnimationFrame(focusCard)
  }, [navigate, setParams])

  const status = isPending ? (
    <StateLine>프로젝트를 불러오는 중입니다.</StateLine>
  ) : isError ? (
    <StateLine onRetry={() => void refetch()}>프로젝트를 불러오지 못했습니다.</StateLine>
  ) : null

  return (
    <>
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
    </>
  )
}
