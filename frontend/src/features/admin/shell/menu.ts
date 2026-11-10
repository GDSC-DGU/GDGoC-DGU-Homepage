import { canAccessArea, type AdminArea } from '../data/permissions'
import type { AdminRole } from '../data/common/types'
import { adminPath } from '../screens'

/**
 * 사이드바 메뉴 (F-ACM-003 3): 대시보드, 게시판 관리(Teams · Community), 프로젝트 관리, 홈페이지 콘텐츠,
 * 사용자 관리, 모집 관리(지원폼 작성 · 지원자 관리 · 이메일 템플릿).
 * 권한에 맞는 메뉴만 보인다: data/permissions.ts 의 AREA_ACCESS (명세 v1.2 는 모든 구역이 Lead · Core).
 * 하위 주소(글쓰기 · 상세 · 이력 · 평가 기준)에 있어도 그 메뉴가 '지금 메뉴'로 강조된다 (NavLink 가 주소 앞부분으로 맞춤).
 */
export interface MenuLink {
  label: string
  to: string
  area: AdminArea
  /** 이 주소에서만 강조 (대시보드: 다른 관리자 주소의 앞부분이라) */
  end?: boolean
}

export interface MenuGroup {
  label: string
  area: AdminArea
  children: readonly MenuLink[]
}

export type MenuItem = MenuLink | MenuGroup

export const isGroup = (m: MenuItem): m is MenuGroup => 'children' in m

export const ADMIN_MENU: readonly MenuItem[] = [
  { label: '대시보드', to: adminPath.dashboard, area: 'dashboard', end: true },
  {
    label: '게시판 관리',
    area: 'boards',
    children: [
      { label: 'Teams', to: adminPath.teams, area: 'boards' },
      { label: 'Community', to: adminPath.community, area: 'boards' },
    ],
  },
  { label: '프로젝트 관리', to: adminPath.projects, area: 'projects' },
  { label: '홈페이지 콘텐츠', to: adminPath.contents, area: 'contents' },
  { label: '사용자 관리', to: adminPath.users, area: 'users' },
  {
    label: '모집 관리',
    area: 'recruit',
    children: [
      { label: '지원폼 작성', to: adminPath.recruitForm, area: 'recruit' },
      { label: '지원자 관리', to: adminPath.applicants, area: 'recruit' },
      { label: '이메일 템플릿', to: adminPath.templates, area: 'recruit' },
    ],
  },
]

/** 이 관리 유형이 볼 수 있는 메뉴만 (묶음 안이 다 빠지면 묶음도 뺀다) */
export function visibleMenu(role: AdminRole, menu: readonly MenuItem[] = ADMIN_MENU): MenuItem[] {
  return menu.flatMap((m): MenuItem[] => {
    if (!canAccessArea(role, m.area)) return []
    if (!isGroup(m)) return [m]
    const children = m.children.filter((c) => canAccessArea(role, c.area))
    return children.length ? [{ ...m, children }] : []
  })
}
