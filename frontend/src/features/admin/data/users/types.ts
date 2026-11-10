import type { UserCore, UserStatus } from '../common/accounts'
import type { ActorRef, AuditStamp, IsoTime, ManagementType, Page, PageQuery } from '../common/types'

/**
 * 사용자 관리 (P-AMB-01~05, API-AMB-001~010).
 * 주인: 2단계 사용자 담당. UserCore 필드(common/accounts.ts)는 인증 · 권한이 읽으므로 이름 · 뜻을 유지한다.
 */

/** PIN 설정 상태 (F-AMB-001 3): 설정 완료 / 대기(최초 설정 전) / 초기화됨(재설정 전) */
export type PinStatus = 'set' | 'pending' | 'reset'

/** 잠긴 까닭: 학번 + PIN 인증 5회 실패(F-AMB-015 1) · 관리자 로그인 5회 실패(F-AMB-015 2) */
export type LockReason = 'pin' | 'password'

export interface AdminUser extends UserCore {
  pinStatus: PinStatus
  /** 대기 · 초기화됨일 때 링크 만료 시각 (발송 후 72시간, F-COM-007) */
  pinLinkExpiresAt: IsoTime | null
  /** 마지막 PIN 설정 메일 발송이 실패함 (F-AMB-011 2) */
  pinMailFailed: boolean
  /** 마지막 링크 발송 시도 (같은 사용자 1분 간격 제한, F-AMB-013 2) */
  pinMailSentAt: IsoTime | null
  /** 학번 + PIN 연속 실패 횟수 (잠금 해제하면 0, F-AMB-015) */
  pinFailedCount: number
  /** 잠긴 시각 · 까닭 (상태가 잠김일 때) */
  lockedAt: IsoTime | null
  lockReason: LockReason | null
  /** 비활성화된 시각 (1년 뒤 개인정보 자동 삭제, F-SYS-005) */
  deactivatedAt: IsoTime | null
  /** 학과: 최종 합격자 일괄 등록(F-ARC-037)으로 들어온 사용자만. 직접 추가하면 null */
  department: string | null
  created: AuditStamp
}

/** 목록 한 줄 (API-AMB-001 응답): 학번은 가려서, 관리자 비밀번호 상태는 '바꿔야 하는지'만 */
export interface UserRow extends Omit<AdminUser, 'studentId' | 'adminLogin'> {
  maskedStudentId: string
  /** 대기 · 초기화됨이고 링크 만료 시각이 지남 */
  pinLinkExpired: boolean
  /** 같은 사용자에게 링크를 다시 보낼 수 있는 시각 (마지막 발송 + 1분). 지금 보낼 수 있으면 null */
  pinMailRetryAt: IsoTime | null
  /** Lead · Core 가 임시 비밀번호 상태 (다음 로그인 때 변경, F-ACM-002) */
  mustChangePassword: boolean
  /** 비활성이면 개인정보 자동 삭제 예정 시각 (비활성화 + 1년, F-SYS-005) */
  purgeAt: IsoTime | null
}

/** 수정 팝업용 한 명: 전체 학번 포함 (F-AMB-001 2: 수정 팝업에서만 전체 표시) */
export type UserDetail = UserRow & { studentId: string }

/**
 * 변경 이력 종류 = 이력 화면의 탭 (F-AMB-014): 추가 · 등록 / 관리 유형 변경 / PIN / 잠금 / 비활성화 · 삭제.
 * 탭보다 잘게 나눈 것이 action (표의 '변경 종류' 칸).
 */
export type UserHistoryKind = 'add' | 'type' | 'pin' | 'lock' | 'deactivate'

export type UserHistoryAction =
  | 'create'
  | 'bulk-register'
  | 'update'
  | 'type-change'
  | 'pin-set'
  | 'pin-reset'
  | 'pin-mail'
  | 'password-reset'
  | 'lock'
  | 'unlock'
  | 'deactivate'
  | 'reactivate'
  | 'purge'

export interface UserHistoryEntry {
  id: string
  at: IsoTime
  /** 처리자 (관리자 계정 / 본인 / 시스템) */
  actor: ActorRef
  /** 대상 (이름 · 학번 가림). 개인정보가 삭제되면 '탈퇴한 사용자' · '-' */
  target: { userId: string; name: string; maskedStudentId: string }
  kind: UserHistoryKind
  action: UserHistoryAction
  /** 내용 ('General → Core', 'PIN 설정 링크 재발송' …). 이메일 · 이름 같은 개인정보 값은 넣지 않는다 */
  detail: string
  /** 메일 발송 결과 (F-AMB-013 3) */
  mail?: 'sent' | 'failed'
}

export interface UsersState {
  users: AdminUser[]
  /** 최신이 뒤 (수정 · 삭제 불가: 덧붙이기만 한다) */
  history: UserHistoryEntry[]
}

export interface UserListQuery extends PageQuery {
  type?: ManagementType
  q?: string
}

export interface UserHistoryQuery extends PageQuery {
  kind?: UserHistoryKind
  /** 'YYYY-MM-DD' 한국 날짜 (기본 최근 30일) */
  from?: string
  to?: string
  q?: string
}

/** API-AMB-005 요청 */
export interface UserCreateInput {
  name: string
  studentId: string
  email: string
  type: ManagementType
  generation: number
  /** Lead · Core 일 때만 */
  loginId: string | null
}

/** API-AMB-006 요청 (학번 변경 불가) + 상태 (F-AMB-009: 상태를 바꿔 저장 · 6 재활성화) */
export interface UserUpdateInput {
  name: string
  email: string
  generation: number
  type: ManagementType
  /** General → Lead · Core 로 바꿀 때만 새 아이디 */
  loginId: string | null
  status?: Exclude<UserStatus, 'locked'>
}

/** 메일 발송 흉내 결과 */
export type MailResult = 'sent' | 'failed'

/** 추가 · 수정 · 비밀번호 초기화 결과: 임시 비밀번호는 이때 한 번만 보인다 (F-AMB-008) */
export interface IssuedCredential {
  user: UserRow
  temporaryPassword: string | null
  /** 이번에 PIN 설정 메일을 보냈으면 그 결과 (추가할 때) */
  mail: MailResult | null
}

export interface UserListResult extends Page<UserRow> {
  /** 탭마다 인원 수 (F-AMB-002 1) */
  counts: Record<'all' | ManagementType, number>
  /** 상단 안내: PIN 미설정 인원 (대기 + 초기화됨, 비활성 제외) */
  pinNotSet: number
  /** 활성 상태의 Lead 수 (마지막 활성 Lead 를 막는 규칙을 화면에서 미리 보려고, F-AMB-004 4) */
  activeLeads: number
  /** 그 안에서 나눠 본 수 (링크 만료 · 메일 발송 실패는 겹칠 수 있다) */
  pin: { pending: number; reset: number; expired: number; mailFailed: number }
}

/** 상태 변경 결과 (API-AMB-002): 바뀐 수와 규칙에 걸려 뺀 사람 */
export interface StatusChangeResult {
  changed: number
  skipped: { userId: string; name: string; reason: string }[]
}
