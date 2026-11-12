import { createBrowserRouter, createHashRouter, createMemoryRouter, type RouteObject } from 'react-router-dom'
import { PAGE_PLAN_IDS } from '@/config/pages'
import { HomePage } from '@/features/home/HomePage'
import { AppLayout } from '@/features/layout/AppLayout'
import { ErrorPage } from '@/features/pages/ErrorPage'
import { AdminApp, ApplyPage, ArchivePage, CampusPreview, CommunityPage, MovedTo, NotFoundPage, NowPreview, PlannedPage, RecruitsPage, TeamsPage, TeamsPostPage, TeamsWritePage } from './lazyPages'
import { enableViewTransitions } from './viewTransitions'

/** 다 만든 페이지. 준비 중 페이지를 실제로 만들면 여기로 옮긴다 */
const BUILT_ROUTES: RouteObject[] = [
  { index: true, element: <HomePage /> },
  // 아카이브: 프로젝트 · 세미나 (메뉴 '프로젝트' 자리, 4기 Organizer 2026-11-04)
  { path: 'archive', element: <ArchivePage /> },
  { path: 'projects', element: <MovedTo pathname="/archive" /> },
  // 소개: 예전 커뮤니티 (메뉴 '커뮤니티' 자리, 4기 Organizer 2026-11-05)
  { path: 'about', element: <CommunityPage /> },
  { path: 'community', element: <MovedTo pathname="/about" /> },
  { path: 'recruits', element: <RecruitsPage /> },
  // 지원서 작성 (P-RCT-03). 백엔드 전에는 예시 지원서 (features/apply/data/applyRepo.ts 의 APPLY_SAMPLE)
  { path: 'recruits/apply', element: <ApplyPage /> },
  // 팀원 찾기: 백엔드 전에는 예시 게시판 (features/teams/data/teamsRepo.ts 의 TEAMS_SAMPLE)
  { path: 'teams', element: <TeamsPage /> },
  { path: 'teams/write', element: <TeamsWritePage mode="create" /> },
  { path: 'teams/:postId', element: <TeamsPostPage /> },
  { path: 'teams/:postId/edit', element: <TeamsWritePage mode="edit" /> },
]
const BUILT = new Set(BUILT_ROUTES.map((r) => r.path))

/** 작업 중 컴포넌트를 혼자 띄워 보는 주소 (개발 서버에서만. 배포본에서는 404) */
const PREVIEW_ROUTES: RouteObject[] = [
  { path: '__preview/now', element: <NowPreview /> },
  { path: '__preview/campus', element: <CampusPreview /> },
]

/** config/pages.ts 에 계획만 있고 아직 만들지 않은 페이지는 자동으로 '준비 중' 페이지가 된다 */
const PLANNED_ROUTES: RouteObject[] = PAGE_PLAN_IDS.filter((id) => !BUILT.has(id)).map((id) => ({ path: id, element: <PlannedPage id={id} /> }))

const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    // 화면을 그리다 오류가 나면 흰 화면 대신 안내를 보여준다
    errorElement: <ErrorPage />,
    children: [...BUILT_ROUTES, ...PLANNED_ROUTES, ...(import.meta.env.DEV ? PREVIEW_ROUTES : []), { path: '*', element: <NotFoundPage /> }],
  },
  /**
   * 관리자 화면 (/admin, /admin/login, /admin/boards/teams …): 공개 사이트 틀(머리말 · 꼬리말 · 페이지 전환) 밖의 관리자 전용 틀.
   * 코드는 들어올 때 받는다 (공개 페이지 첫 JS 에 넣지 않음). 하위 주소는 features/admin/routes.tsx, 화면 목록은 features/admin/screens.ts.
   */
  { path: 'admin/*', element: <AdminApp />, errorElement: <ErrorPage /> },
]

/**
 * 보통은 /projects 같은 주소(browser).
 * 서버 설정 없이 파일만 올리는 미리보기에서는 #/projects 주소(hash)를 쓴다: VITE_ROUTER=hash
 * 파일 미리보기 창처럼 about:srcdoc · blob: 주소에서 열리면 그 주소로는 URL 을 만들 수 없어서
 * ('Failed to construct URL: Invalid URL') 메모리 라우터를 쓴다. 처음 위치는 #/projects 같은 해시에서 읽는다.
 */
function createRouter() {
  if (!/^https?:$/.test(window.location.protocol)) {
    const start = window.location.hash.replace(/^#/, '') || '/'
    return createMemoryRouter(routes, { initialEntries: [start.startsWith('/') ? start : `/${start}`] })
  }
  return import.meta.env.VITE_ROUTER === 'hash' ? createHashRouter(routes) : createBrowserRouter(routes)
}

export const router = createRouter()

// 페이지를 옮길 때 머리말은 두고 본문만 부드럽게 바꾼다 (지원하지 않는 브라우저 · 동작 줄이기는 그대로)
enableViewTransitions(router)
