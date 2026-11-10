import type { UserCore } from './common/accounts'
import type { AdminRole, ManagementType } from './common/types'

/**
 * 권한 규칙 (명세서 세부 정책을 한곳에). 화면은 이 함수로 메뉴 · 버튼을 숨기거나 막고,
 * 예시 저장소(mock)는 같은 함수로 한 번 더 막는다 (서버가 다시 확인하는 것처럼).
 *
 * 결과는 { allowed, reason }: 막을 때는 이유 문장(~습니다체)을 같이 준다.
 *   const d = canEditUser(me, user)
 *   <Button disabled={!d.allowed} title={d.allowed ? undefined : d.reason}>수정</Button>
 * 비활성 버튼에는 이유를 화면 글자로도 남긴다 (title 만으로는 키보드 · 화면 읽기에 안 보임: ui/DisabledReason).
 *
 * 관리 유형: Lead / Core / General. General 은 관리자 화면에 들어오지 못한다.
 * 메뉴(구역)는 명세상 Lead · Core 모두 들어갈 수 있다 (P-APJ-02 · P-AMB-01 · F-ACT-001 · F-ARC-010 …).
 * Core 를 막는 것은 구역 안의 행동들이다 (아래 사용자 관리 · 모집 관리).
 */
export type Decision = { allowed: true; reason?: undefined } | { allowed: false; reason: string }

const ok: Decision = { allowed: true }
const no = (reason: string): Decision => ({ allowed: false, reason })

/** 권한을 따질 때의 '나' (로그인한 관리자) */
export interface PermissionActor {
  id: string
  role: AdminRole
}
/** 권한을 따질 때의 대상 사용자 */
export type PermissionTarget = Pick<UserCore, 'id' | 'type' | 'status'>

// ── 관리자 화면 · 메뉴 ──

/** F-ACM-001 1): 관리 유형이 Lead · Core 이고 상태가 활성인 계정만 */
export function canUseAdmin(u: Pick<UserCore, 'type' | 'status' | 'loginId'>): Decision {
  if (u.type === 'General' || !u.loginId) return no('관리 권한이 있는 계정(Lead · Core)만 관리자 화면을 쓸 수 있습니다.')
  if (u.status === 'inactive') return no('비활성화된 계정입니다. 관리자에게 문의하세요.')
  if (u.status === 'locked') return no('잠긴 계정입니다. 다른 Lead에게 잠금 해제를 요청해 주세요.')
  return ok
}

export const isAdminRole = (t: ManagementType): t is AdminRole => t === 'Lead' || t === 'Core'

/** 관리 구역 = 사이드바 메뉴 묶음 */
export type AdminArea = 'dashboard' | 'boards' | 'projects' | 'contents' | 'users' | 'recruit'

/**
 * 구역별로 들어갈 수 있는 관리 유형 (F-ACM-003: 권한에 맞는 메뉴만 보인다).
 * 명세 v1.2 기준 모든 구역이 Lead · Core. 나중에 'Lead 만' 구역이 생기면 여기만 바꾸면
 * 사이드바에서 사라지고, 주소로 직접 들어오면 대시보드로 돌아간다.
 */
export const AREA_ACCESS: Record<AdminArea, readonly AdminRole[]> = {
  dashboard: ['Lead', 'Core'],
  boards: ['Lead', 'Core'],
  projects: ['Lead', 'Core'],
  contents: ['Lead', 'Core'],
  users: ['Lead', 'Core'],
  recruit: ['Lead', 'Core'],
}

/** '/admin/users/history' → 'users'. 관리자 주소가 아니면 null */
export function areaOfPath(pathname: string): AdminArea | null {
  const m = /^\/admin(?:\/([^/?#]+))?/.exec(pathname.replace(/\/+$/, ''))
  if (!m) return null
  const seg = m[1]
  if (!seg) return 'dashboard'
  return (['boards', 'projects', 'contents', 'users', 'recruit'] as const).find((a) => a === seg) ?? null
}

export const canAccessArea = (role: AdminRole, area: AdminArea) => AREA_ACCESS[area].includes(role)

/** F-ACM-003 4): 권한 없는 주소에 직접 들어오면 대시보드로. 모르는 주소(404)는 막지 않는다 */
export function canAccessPath(role: AdminRole, pathname: string): boolean {
  const area = areaOfPath(pathname)
  return area === null || canAccessArea(role, area)
}

// ── 사용자 관리 (P-AMB) ──

/** F-AMB-006 5): Core 는 General 만 추가 */
export function canAddUserOfType(actor: PermissionActor, type: ManagementType): Decision {
  if (actor.role === 'Lead' || type === 'General') return ok
  return no('Core 계정은 General 사용자만 추가할 수 있습니다.')
}

/** P-AMB-01 · F-AMB-009: Core 는 General 만 수정 (이름 · 이메일 · 기수 · 상태) */
export function canEditUser(actor: PermissionActor, target: PermissionTarget): Decision {
  if (actor.role === 'Lead' || target.type === 'General') return ok
  return no('Core 계정은 General 사용자만 수정할 수 있습니다.')
}

/** F-AMB-009 4): 관리 유형 변경은 Lead 만 */
export function canChangeUserType(actor: PermissionActor): Decision {
  return actor.role === 'Lead' ? ok : no('관리 유형은 Lead만 바꿀 수 있습니다.')
}

/**
 * F-AMB-004: 비활성화.
 * Core 는 General 만, 자기 자신은 안 됨, 활성 Lead 가 1명 이상 남아야 함.
 * activeLeadCount: 지금 활성 상태인 Lead 수 (대상을 포함한 수)
 */
export function canDeactivateUser(actor: PermissionActor, target: PermissionTarget, activeLeadCount: number): Decision {
  if (target.status === 'inactive') return no('이미 비활성 상태입니다.')
  if (target.id === actor.id) return no('자기 자신은 비활성화할 수 없습니다.')
  if (actor.role === 'Core' && target.type !== 'General') return no('Core 계정은 General 사용자만 비활성화할 수 있습니다.')
  if (target.type === 'Lead' && target.status === 'active' && activeLeadCount <= 1) return no('활성 상태의 Lead가 1명 이상 남아야 합니다.')
  return ok
}

/** F-AMB-009 6): 재활성화 (수정 권한과 같다) */
export function canReactivateUser(actor: PermissionActor, target: PermissionTarget): Decision {
  if (target.status !== 'inactive') return no('비활성 상태가 아닙니다.')
  return canEditUser(actor, target)
}

/** F-AMB-010: 관리자 비밀번호 초기화는 Lead 만, 대상은 Lead · Core */
export function canResetPassword(actor: PermissionActor, target: PermissionTarget): Decision {
  if (actor.role !== 'Lead') return no('비밀번호 초기화는 Lead만 할 수 있습니다.')
  if (!isAdminRole(target.type)) return no('General 사용자에게는 관리자 비밀번호가 없습니다.')
  return ok
}

/** F-AMB-012 5): PIN 초기화. Core 는 General 만 */
export function canResetPin(actor: PermissionActor, target: PermissionTarget): Decision {
  if (actor.role === 'Lead' || target.type === 'General') return ok
  return no('Core 계정은 General 사용자의 PIN만 초기화할 수 있습니다.')
}

/** F-AMB-015 4): 잠금 해제. Core 는 General 만, Lead · Core 계정은 Lead 만 */
export function canUnlockUser(actor: PermissionActor, target: PermissionTarget): Decision {
  if (target.status !== 'locked') return no('잠긴 계정이 아닙니다.')
  if (isAdminRole(target.type) && actor.role !== 'Lead') return no('Lead · Core 계정의 잠금은 Lead만 해제할 수 있습니다.')
  return ok
}

// ── 모집 관리 (P-ARC) ──

/** F-ARC-017: 결과 잠금 해제는 Lead 만 (Core 에게는 버튼 비활성) */
export function canUnlockApplicantResult(actor: PermissionActor): Decision {
  return actor.role === 'Lead' ? ok : no('결과 잠금 해제는 Lead만 할 수 있습니다.')
}

/**
 * 권한 표 (docs/ADMIN.md 와 같은 내용, 테스트가 함수와 맞는지 확인한다).
 * 여기 없는 행동(게시글 · 댓글 삭제, 관리자 글쓰기, 프로젝트 · 콘텐츠 전부, 지원폼 · 평가 기준 · 결과 처리 · 메일 발송 · 면접 일정 …)은 Lead · Core 모두 가능.
 */
export const PERMISSION_TABLE = [
  { action: '관리자 화면 로그인', spec: 'F-ACM-001', lead: '가능', core: '가능' },
  { action: '모든 메뉴(구역) 보기', spec: 'F-ACM-003', lead: '가능', core: '가능' },
  { action: '사용자 추가', spec: 'F-AMB-006', lead: '모든 유형', core: 'General만' },
  { action: '사용자 수정 · 재활성화', spec: 'F-AMB-009', lead: '모든 유형', core: 'General만' },
  { action: '관리 유형 변경', spec: 'F-AMB-009', lead: '가능', core: '불가' },
  { action: '사용자 비활성화', spec: 'F-AMB-004', lead: '자기 자신 · 마지막 활성 Lead 제외', core: 'General만' },
  { action: '관리자 비밀번호 초기화', spec: 'F-AMB-010', lead: 'Lead · Core 대상', core: '불가' },
  { action: 'PIN 초기화', spec: 'F-AMB-012', lead: '모든 유형', core: 'General만' },
  { action: '계정 잠금 해제', spec: 'F-AMB-015', lead: '모든 유형', core: 'General만' },
  { action: '지원자 결과 잠금 해제', spec: 'F-ARC-017', lead: '가능', core: '불가 (버튼 비활성)' },
] as const
