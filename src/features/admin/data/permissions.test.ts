import { describe, expect, it } from 'vitest'
import { ADMIN_MENU, isGroup, visibleMenu } from '../shell/menu'
import type { UserCore } from './common/accounts'
import {
  AREA_ACCESS,
  areaOfPath,
  canAccessPath,
  canAddUserOfType,
  canChangeUserType,
  canDeactivateUser,
  canEditUser,
  canReactivateUser,
  canResetPassword,
  canResetPin,
  canUnlockApplicantResult,
  canUnlockUser,
  canUseAdmin,
  PERMISSION_TABLE,
  type PermissionActor,
  type PermissionTarget,
} from './permissions'

const lead: PermissionActor = { id: 'lead-1', role: 'Lead' }
const core: PermissionActor = { id: 'core-1', role: 'Core' }
const user = (id: string, type: UserCore['type'], status: UserCore['status'] = 'active'): PermissionTarget => ({ id, type, status })

describe('관리자 화면에 들어올 수 있는 계정 (F-ACM-001 1)', () => {
  it('Lead · Core 이고 활성인 계정만', () => {
    expect(canUseAdmin({ type: 'Lead', status: 'active', loginId: 'a' }).allowed).toBe(true)
    expect(canUseAdmin({ type: 'Core', status: 'active', loginId: 'b' }).allowed).toBe(true)
    expect(canUseAdmin({ type: 'General', status: 'active', loginId: null }).allowed).toBe(false)
    expect(canUseAdmin({ type: 'Core', status: 'inactive', loginId: 'b' })).toEqual({ allowed: false, reason: '비활성화된 계정입니다. 관리자에게 문의하세요.' })
    expect(canUseAdmin({ type: 'Lead', status: 'locked', loginId: 'a' }).allowed).toBe(false)
  })
})

describe('메뉴 · 주소 권한 (F-ACM-003)', () => {
  it('주소에서 구역을 읽는다', () => {
    expect(areaOfPath('/admin')).toBe('dashboard')
    expect(areaOfPath('/admin/')).toBe('dashboard')
    expect(areaOfPath('/admin/users/history')).toBe('users')
    expect(areaOfPath('/admin/recruit/applicants/abc')).toBe('recruit')
    expect(areaOfPath('/admin/nope')).toBeNull()
    expect(areaOfPath('/projects')).toBeNull()
  })

  it('명세 v1.2 는 모든 구역이 Lead · Core: Core 에게도 모든 메뉴가 보인다', () => {
    for (const roles of Object.values(AREA_ACCESS)) expect([...roles].sort()).toEqual(['Core', 'Lead'])
    expect(visibleMenu('Core')).toEqual(visibleMenu('Lead'))
    expect(canAccessPath('Core', '/admin/users')).toBe(true)
  })

  it("'Lead 만' 구역이 생기면 Core 의 메뉴에서 빠지고, 주소로 들어오면 막힌다", () => {
    const original = AREA_ACCESS.users
    try {
      ;(AREA_ACCESS as Record<string, readonly string[]>).users = ['Lead']
      expect(visibleMenu('Core').some((m) => !isGroup(m) && m.area === 'users')).toBe(false)
      expect(visibleMenu('Lead').some((m) => !isGroup(m) && m.area === 'users')).toBe(true)
      expect(canAccessPath('Core', '/admin/users/history')).toBe(false)
      // 모르는 주소는 권한 문제가 아니다 (404 로 보낸다)
      expect(canAccessPath('Core', '/admin/nope')).toBe(true)
    } finally {
      ;(AREA_ACCESS as Record<string, readonly string[]>).users = original
    }
  })

  it('사이드바 메뉴 순서 = 명세 (대시보드, 게시판, 프로젝트, 콘텐츠, 사용자, 모집)', () => {
    expect(ADMIN_MENU.map((m) => m.label)).toEqual(['대시보드', '게시판 관리', '프로젝트 관리', '홈페이지 콘텐츠', '사용자 관리', '모집 관리'])
    const groups = ADMIN_MENU.filter(isGroup)
    expect(groups.map((g) => g.children.map((c) => c.label))).toEqual([
      ['Teams', 'Community'],
      ['지원폼 작성', '지원자 관리', '이메일 템플릿'],
    ])
  })
})

describe('사용자 관리 권한 (P-AMB)', () => {
  it('Core 는 General 만 추가 · 수정 · PIN 초기화 (F-AMB-006 · 009 · 012)', () => {
    expect(canAddUserOfType(core, 'General').allowed).toBe(true)
    expect(canAddUserOfType(core, 'Core').allowed).toBe(false)
    expect(canAddUserOfType(lead, 'Lead').allowed).toBe(true)
    expect(canEditUser(core, user('x', 'General')).allowed).toBe(true)
    expect(canEditUser(core, user('x', 'Lead')).reason).toBe('Core 계정은 General 사용자만 수정할 수 있습니다.')
    expect(canResetPin(core, user('x', 'Core')).allowed).toBe(false)
    expect(canResetPin(lead, user('x', 'Core')).allowed).toBe(true)
  })

  it('관리 유형 변경 · 비밀번호 초기화는 Lead 만 (F-AMB-009 4 · F-AMB-010)', () => {
    expect(canChangeUserType(lead).allowed).toBe(true)
    expect(canChangeUserType(core).allowed).toBe(false)
    expect(canResetPassword(lead, user('x', 'Core')).allowed).toBe(true)
    expect(canResetPassword(lead, user('x', 'General')).allowed).toBe(false)
    expect(canResetPassword(core, user('x', 'Core')).allowed).toBe(false)
  })

  it('비활성화: 자기 자신 안 됨, Core 는 General 만, 마지막 활성 Lead 는 안 됨 (F-AMB-004)', () => {
    expect(canDeactivateUser(lead, user('lead-1', 'Lead'), 2).reason).toBe('자기 자신은 비활성화할 수 없습니다.')
    expect(canDeactivateUser(core, user('x', 'Core'), 2).allowed).toBe(false)
    expect(canDeactivateUser(core, user('x', 'General'), 1).allowed).toBe(true)
    expect(canDeactivateUser(lead, user('lead-2', 'Lead'), 1).reason).toBe('활성 상태의 Lead가 1명 이상 남아야 합니다.')
    expect(canDeactivateUser(lead, user('lead-2', 'Lead'), 2).allowed).toBe(true)
    expect(canDeactivateUser(lead, user('x', 'General', 'inactive'), 2).allowed).toBe(false)
    expect(canReactivateUser(core, user('x', 'General', 'inactive')).allowed).toBe(true)
    expect(canReactivateUser(core, user('x', 'Lead', 'inactive')).allowed).toBe(false)
  })

  it('잠금 해제: Core 는 General 만, Lead · Core 계정은 Lead 만 (F-AMB-015 4)', () => {
    expect(canUnlockUser(core, user('x', 'General', 'locked')).allowed).toBe(true)
    expect(canUnlockUser(core, user('x', 'Core', 'locked')).allowed).toBe(false)
    expect(canUnlockUser(lead, user('x', 'Core', 'locked')).allowed).toBe(true)
    expect(canUnlockUser(lead, user('x', 'General')).reason).toBe('잠긴 계정이 아닙니다.')
  })
})

describe('모집 관리 권한', () => {
  it('결과 잠금 해제는 Lead 만 (F-ARC-017)', () => {
    expect(canUnlockApplicantResult(lead).allowed).toBe(true)
    expect(canUnlockApplicantResult(core)).toEqual({ allowed: false, reason: '결과 잠금 해제는 Lead만 할 수 있습니다.' })
  })
})

describe('권한 표 (docs/ADMIN.md)', () => {
  it('Core 가 막히는 행동은 표에 모두 있다', () => {
    const coreLimited = PERMISSION_TABLE.filter((r) => r.core !== '가능').map((r) => r.spec)
    expect(coreLimited).toEqual(expect.arrayContaining(['F-AMB-006', 'F-AMB-009', 'F-AMB-004', 'F-AMB-010', 'F-AMB-012', 'F-AMB-015', 'F-ARC-017']))
  })
})
