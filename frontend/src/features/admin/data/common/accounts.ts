import type { ActorRef, AdminRole, IsoTime, ManagementType } from './types'

/**
 * 사용자 · 관리자 계정의 '뼈대' 필드. 인증(auth) · 권한(permissions) · 대시보드가 이 필드만 읽는다.
 * 사용자 관리 구역(data/users/types.ts 의 AdminUser)은 이것을 늘려 쓴다. 이 필드의 이름 · 뜻은 바꾸지 않는다.
 */
export type UserStatus = 'active' | 'inactive' | 'locked'

/** 관리자 로그인(아이디 · 비밀번호) 상태. Lead · Core 만 가진다 (General 은 null) */
export interface AdminLoginState {
  /** 임시 비밀번호로 발급된 상태: 다음 로그인 때 비밀번호 변경 팝업(P-ACM-04) */
  temporaryPassword: boolean
  /** 연속 실패 횟수 (5회면 15분 제한, F-ACM-001) */
  failedCount: number
  /** 15분 제한이 풀리는 시각. 제한이 없으면 null */
  limitedUntil: IsoTime | null
  /** 15분 제한을 몇 번 받았는지. 제한 뒤 다시 5회 틀리면 잠김 */
  limitRounds: number
}

export interface UserCore {
  id: string
  /** 예시 이름: '운영진A' · '예시 멤버 01' (지어낸 사람이 실제 사람처럼 보이지 않게) */
  name: string
  /** 숫자 10자리. 화면에는 maskStudentId 로 가려 보인다 */
  studentId: string
  /** 예시 주소는 @example.com */
  email: string
  type: ManagementType
  generation: number
  status: UserStatus
  /** 관리자 페이지 아이디 (Lead · Core 만, General 은 null) */
  loginId: string | null
  adminLogin: AdminLoginState | null
}

/** 로그인한 관리자 (API-ACM-003 /api/admin/me 응답) */
export interface AdminMe {
  id: string
  name: string
  role: AdminRole
  loginId: string
  /** 임시 비밀번호 상태면 true: 비밀번호를 바꾸기 전에는 다른 메뉴를 쓸 수 없다 (F-ACM-002) */
  mustChangePassword: boolean
}

export const freshLoginState = (temporaryPassword = false): AdminLoginState => ({ temporaryPassword, failedCount: 0, limitedUntil: null, limitRounds: 0 })

export const actorOf = (u: Pick<UserCore, 'id' | 'name' | 'type'>): ActorRef => ({ kind: 'admin', id: u.id, name: u.name, role: u.type })

export const SYSTEM_ACTOR: ActorRef = { kind: 'system', name: '시스템' }

/** '운영진A · Lead' · '시스템' · '본인' (처리자 표시) */
export function actorLabel(a: ActorRef | null | undefined): string {
  if (!a) return '-'
  if (a.kind === 'admin') return `${a.name} · ${a.role}`
  return a.name
}

/**
 * 예시 관리자 계정 (로그인 화면의 '예시 계정' 버튼).
 * 비밀번호는 누구나 아는 예시 값이다. 화면에 그대로 적어 두고, 입력값은 이 값과만 비교한다 (저장 · 전송하지 않음).
 * 임시 비밀번호 계정은 비밀번호를 바꾸면 '바꿨다'는 표시만 남기고 새 비밀번호는 어디에도 두지 않는다.
 * 그래서 다음 로그인에도 같은 예시 비밀번호를 쓴다 ('예시 데이터 처음으로'를 누르면 다시 임시 상태).
 */
export interface ExampleAccount {
  userId: string
  loginId: string
  password: string
  /** 로그인 화면 버튼 글자 */
  button: string
  /** 버튼 아래 한 줄 */
  note: string
}

export const EXAMPLE_ACCOUNTS: readonly ExampleAccount[] = [
  { userId: 'user-admin-a', loginId: 'lead-a', password: 'example1234', button: 'Lead 예시 계정으로 들어가기', note: '운영진A · Lead · 모든 기능' },
  { userId: 'user-admin-b', loginId: 'core-b', password: 'example1234', button: 'Core 예시 계정으로 들어가기', note: '운영진B · Core · General 사용자만 관리' },
  { userId: 'user-admin-c', loginId: 'core-c', password: 'temp1234', button: '임시 비밀번호 예시 계정으로 들어가기', note: '운영진C · Core · 처음 로그인하면 비밀번호 변경' },
]

/** 예시 비밀번호: 버튼 계정 3개 + 버튼 없는 비활성 계정 core-d ('비활성화된 계정' 안내를 볼 수 있게) */
const EXAMPLE_PASSWORDS: Readonly<Record<string, string>> = { ...Object.fromEntries(EXAMPLE_ACCOUNTS.map((a) => [a.loginId, a.password])), 'core-d': 'example1234' }

/** 아이디의 예시 비밀번호 (없는 아이디면 undefined) */
export const examplePasswordOf = (loginId: string): string | undefined => EXAMPLE_PASSWORDS[loginId]

/**
 * 공통 seed: 예시 관리자 계정 3개 (+ 비활성 Core 1개: 로그인 화면에서 '비활성화된 계정' 안내를 볼 수 있게).
 * 사용자 관리 구역 seed(data/users/seed.ts)가 이 목록을 그대로 앞에 넣는다. 지우지 마세요 (로그인이 깨집니다).
 */
export const ADMIN_ACCOUNT_SEED: readonly UserCore[] = [
  { id: 'user-admin-a', name: '운영진A', studentId: '2026000001', email: 'admin-a@example.com', type: 'Lead', generation: 4, status: 'active', loginId: 'lead-a', adminLogin: freshLoginState() },
  { id: 'user-admin-b', name: '운영진B', studentId: '2026000002', email: 'admin-b@example.com', type: 'Core', generation: 4, status: 'active', loginId: 'core-b', adminLogin: freshLoginState() },
  { id: 'user-admin-c', name: '운영진C', studentId: '2026000003', email: 'admin-c@example.com', type: 'Core', generation: 4, status: 'active', loginId: 'core-c', adminLogin: freshLoginState(true) },
  { id: 'user-admin-d', name: '운영진D', studentId: '2025000004', email: 'admin-d@example.com', type: 'Core', generation: 3, status: 'inactive', loginId: 'core-d', adminLogin: freshLoginState() },
]
