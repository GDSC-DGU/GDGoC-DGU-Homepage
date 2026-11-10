import type { ComponentType } from 'react'
import { useRoutes, type RouteObject } from 'react-router-dom'
import { LoginPage } from './auth/LoginPage'
import * as boards from './boards'
import * as contents from './contents'
import { DashboardPage } from './dashboard/DashboardPage'
import * as projects from './projects'
import * as recruit from './recruit'
import { ADMIN_SCREENS, adminPath, type AdminScreenId } from './screens'
import { AdminRoutesNotFound } from './shell/AdminNotFound'
import { RequireAdmin } from './shell/AdminLayout'
import { Redirect } from './shell/Redirect'
import * as users from './users'

/**
 * 관리자 주소 전부 (명세서 P-ACM · ABD · APJ · ACT · AMB · ARC). /admin/* 아래에서 쓰는 하위 라우트다
 * (app/router.tsx 는 /admin/* 하나만 알고, 이 파일은 관리자 덩어리와 함께 늦게 받는다).
 *
 * 구역 화면: src/features/admin/{boards,projects,contents,users,recruit}/index.ts 가 screens.ts 의 page 이름을 내보낸다.
 * 관리자 코드는 한 덩어리(AdminRoot-*.js)로 받는다. 구역별로 따로 나누면 공개 페이지와 함께 쓰는 공통 파일(react 등)이
 * 더 잘게 쪼개져 공개 페이지 첫 JS 가 늘어서다 (docs/ADMIN.md '번들').
 * 2단계는 이 파일을 고치지 않는다. 새 주소가 필요하면 기초 담당에게 (screens.ts 에 한 줄 + 여기 한 줄).
 */

/** 화면 ID → 구역 페이지 (타입이 index.ts 의 내보낸 이름을 확인한다) */
const SECTION_PAGES: Partial<Record<AdminScreenId, ComponentType>> = {
  'P-ABD-01': boards.TeamsBoardPage,
  'P-ABD-02': boards.CommunityBoardPage,
  'P-ABD-03': boards.CommunityWritePage,
  'P-APJ-01': projects.ProjectListPage,
  'P-APJ-02': projects.ProjectWritePage,
  'P-ACT-01': contents.ContentsPage,
  'P-AMB-01': users.UsersPage,
  'P-AMB-03': users.UserHistoryPage,
  'P-ARC-01': recruit.RecruitFormPage,
  'P-ARC-07': recruit.RecruitCriteriaPage,
  'P-ARC-02': recruit.ApplicantsPage,
  'P-ARC-03': recruit.ApplicantDetailPage,
  'P-ARC-06': recruit.MailTemplatesPage,
}

/** '/admin/boards/teams' → 'boards/teams' (하위 라우트는 /admin 다음부터) */
const rel = (path: string) => path.replace(/^\/admin\/?/, '')

/** 하위 라우트 표 (useRoutes: <Routes>/<Route> 부품을 공통 파일로 끌어오지 않게 객체로 적는다) */
const ROUTES: RouteObject[] = [
  { path: 'login', element: <LoginPage /> },
  {
    element: <RequireAdmin />,
    children: [
      { index: true, element: <DashboardPage /> },
      ...ADMIN_SCREENS.flatMap((screen): RouteObject[] => {
        const Page = SECTION_PAGES[screen.id]
        return Page ? [{ path: rel(screen.path), element: <Page /> }] : []
      }),
      // 메뉴 묶음 주소 (화면이 따로 없음): 첫 화면으로
      { path: 'boards', element: <Redirect to={adminPath.teams} /> },
      { path: 'recruit', element: <Redirect to={adminPath.recruitForm} /> },
      { path: '*', element: <AdminRoutesNotFound /> },
    ],
  },
]

export function AdminRoutes() {
  return useRoutes(ROUTES)
}
