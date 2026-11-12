import { lazy, Suspense, type ComponentType, type ReactNode } from 'react'
import type { PagePlanId } from '@/config/pages'
import { Navigate, useLocation } from 'react-router-dom'
import { ADMIN_APP, APPLY_PAGE, CAMPUS_PREVIEW, COMMUNITY_PAGE, NOW_PREVIEW, PLANNED_PAGE, PROJECTS_PAGE, RECRUITS_PAGE, TEAMS_PAGE, type PageModule } from './pageModules'

/**
 * 첫 화면(홈)만 처음 받는 파일에 넣고, 나머지 페이지는 들어갈 때 받는다.
 * 받는 동안에는 머리말 · 꼬리말은 그대로 두고 본문 자리만 비워 둔다 (꼬리말이 위로 튀지 않게 높이를 잡는다).
 * 이미 받은 페이지(미리 받기 · 한 번 들어간 페이지)는 Suspense 를 거치지 않고 바로 그린다:
 * 페이지 전환(View Transitions)이 빈 자리 대신 새 페이지를 찍는다.
 */
function Loading({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>{children}</Suspense>
}

function lazyPage<M, P extends object>(page: PageModule<M>, pick: (m: M) => ComponentType<P>) {
  const Lazy = lazy(() => page.load().then((m) => ({ default: pick(m) })))
  return function Page(props: P) {
    const mod = page.loaded()
    if (mod) {
      const Loaded = pick(mod)
      return <Loaded {...props} />
    }
    return (
      <Loading>
        <Lazy {...props} />
      </Loading>
    )
  }
}

const Archive = lazyPage(PROJECTS_PAGE, (m) => m.ArchivePage)
const Community = lazyPage(COMMUNITY_PAGE, (m) => m.CommunityPage)
const Recruits = lazyPage(RECRUITS_PAGE, (m) => m.RecruitsPage)
const Apply = lazyPage(APPLY_PAGE, (m) => m.ApplyPage)
const TeamsList = lazyPage(TEAMS_PAGE, (m) => m.TeamsListPage)
const TeamsPost = lazyPage(TEAMS_PAGE, (m) => m.TeamsPostPage)
const TeamsWrite = lazyPage(TEAMS_PAGE, (m) => m.TeamsWritePage)
const Planned = lazyPage(PLANNED_PAGE, (m) => m.PlannedPage)
const NotFound = lazyPage(PLANNED_PAGE, (m) => m.NotFoundPage)
const Now = lazyPage(NOW_PREVIEW, (m) => m.NowPreview)
const Campus = lazyPage(CAMPUS_PREVIEW, (m) => m.CampusPreview)
const Admin = lazyPage(ADMIN_APP, (m) => m.AdminRoot)

/**
 * 옮긴 주소로 그대로 넘긴다 (?p= · ?gen= · #upcoming 같은 뒤쪽은 그대로). 공유된 링크가 끊기지 않게.
 * 예전 /projects → /archive (2026-11-04), 예전 /community → /about (2026-11-05)
 */
export function MovedTo({ pathname }: { pathname: string }) {
  const { search, hash } = useLocation()
  return <Navigate to={{ pathname, search, hash }} replace />
}
/** 아카이브 (/archive): 프로젝트 · 세미나 */
export function ArchivePage() {
  return <Archive />
}
/** 소개 (/about): 예전 커뮤니티 페이지 자리 */
export function CommunityPage() {
  return <Community />
}
export function RecruitsPage() {
  return <Recruits />
}
/** 지원서 작성 (/recruits/apply) */
export function ApplyPage() {
  return <Apply />
}
/** 팀원 찾기 목록 (/teams) */
export function TeamsPage() {
  return <TeamsList />
}
/** 팀원 모집 글 (/teams/:postId) */
export function TeamsPostPage() {
  return <TeamsPost />
}
/** 모집 글 쓰기 (/teams/write) · 고치기 (/teams/:postId/edit) */
export function TeamsWritePage({ mode }: { mode: 'create' | 'edit' }) {
  return <TeamsWrite mode={mode} />
}
export function PlannedPage({ id }: { id: PagePlanId }) {
  return <Planned id={id} />
}
export function NotFoundPage() {
  return <NotFound />
}
export function NowPreview() {
  return <Now />
}
export function CampusPreview() {
  return <Campus />
}
/** 관리자 화면 (/admin/*, 공개 사이트 틀 밖) */
export function AdminApp() {
  return <Admin />
}
