/**
 * 들어갈 때 받는 페이지 파일(모듈). 한 번 받은 모듈은 기억해 두고(loaded), 같은 요청은 한 번만 보낸다.
 * 실패하면 기억하지 않아 다음에 다시 받는다.
 */
export interface PageModule<M> {
  load: () => Promise<M>
  loaded: () => M | undefined
}

function pageModule<M>(importer: () => Promise<M>): PageModule<M> {
  let mod: M | undefined
  let pending: Promise<M> | undefined
  return {
    load: () =>
      (pending ??= importer().then(
        (m) => (mod = m),
        (e: unknown) => {
          pending = undefined
          throw e
        },
      )),
    loaded: () => mod,
  }
}

/** 아카이브 (프로젝트 · 세미나). 이름은 예전 그대로 PROJECTS_PAGE (장소 id 가 'projects') */
export const PROJECTS_PAGE = pageModule(() => import('@/features/pages/ArchivePage'))
export const COMMUNITY_PAGE = pageModule(() => import('@/features/pages/CommunityPage'))
export const RECRUITS_PAGE = pageModule(() => import('@/features/pages/RecruitsPage'))
export const PLANNED_PAGE = pageModule(() => import('@/features/pages/PlannedPage'))
/** 지원서 페이지 (/recruits/apply) */
export const APPLY_PAGE = pageModule(() => import('@/features/apply'))
/** 팀원 찾기: 목록 · 글 · 쓰기 한 덩어리 */
export const TEAMS_PAGE = pageModule(() => import('@/features/teams'))
export const NOW_PREVIEW = pageModule(() => import('@/features/now/NowPreview'))
export const CAMPUS_PREVIEW = pageModule(() => import('@/features/campus/CampusPreview'))
/** 관리자 화면 (/admin/*): 틀 · 로그인 · 대시보드 · 공통 부품 · 구역 화면 한 덩어리. 미리 받지 않는다 (방문자는 거의 들어가지 않음) */
export const ADMIN_APP = pageModule(() => import('@/features/admin/AdminRoot'))

/**
 * 메뉴에 있는 페이지 파일을 미리 받는다 (홈을 다 그린 뒤 한가할 때, AppLayout).
 * 메뉴를 누르면 빈 자리 없이 바로 새 페이지가 그려져 페이지 전환이 빈 화면을 찍지 않는다.
 * 데이터 절약 모드면 받지 않는다. 실패해도 그 페이지에 들어갈 때 다시 받는다.
 */
export function preloadPages() {
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData
  if (saveData) return
  for (const page of [PROJECTS_PAGE, COMMUNITY_PAGE, RECRUITS_PAGE, TEAMS_PAGE, PLANNED_PAGE]) page.load().catch(() => {})
}
