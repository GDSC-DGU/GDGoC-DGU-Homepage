import type { ManagementType } from '../common/types'
import {
  canChangeUserType,
  canDeactivateUser,
  canEditUser,
  canReactivateUser,
  canResetPassword,
  canResetPin,
  canUnlockUser,
  type Decision,
  type PermissionActor,
  type PermissionTarget,
} from '../permissions'
import type { AdminUser, PinStatus } from './types'

/**
 * 사용자 관리 규칙 중 data/permissions.ts 에 없는 것 (주인: 사용자 담당).
 * 권한(누가)은 permissions.ts 함수를 먼저 부르고, 여기서는 상태(무엇에) · 덧붙인 안전 규칙을 더한다.
 * 화면은 버튼을 막을 때, 예시 저장소는 서버처럼 한 번 더 막을 때 같은 함수를 쓴다.
 * 덧붙인 규칙은 NOTES.md 에 적어 두었다 (명세에 없는 것: 자기 자신의 관리 유형 변경 금지 등).
 */

/** PIN 설정 링크 유효 시간 (F-COM-007 1: 72시간 · 1회) */
export const PIN_LINK_HOURS = 72
/** 같은 사용자에게 링크 재발송 간격 (F-AMB-013 2 · API-AMB-009 429) */
export const RESEND_GAP_MS = 60_000
/** 비활성화 뒤 개인정보 자동 삭제까지 (F-SYS-005) */
export const PURGE_AFTER_DAYS = 365
/** 관리자 아이디 형식 (F-AMB-007 1: 영문·숫자 4~20자) */
export const LOGIN_ID_PATTERN = /^[A-Za-z0-9]{4,20}$/
/** 기수 고르기 (1기 ~ 다음 모집 5기). 지금 활동 기수가 추가 팝업의 처음 값 */
export const GENERATIONS = [5, 4, 3, 2, 1] as const
export const CURRENT_GENERATION = 4
/** 사용자 목록 한 쪽 (명세 없음, 이력과 같게) · 변경 이력 한 쪽 (F-AMB-014 2) */
export const USERS_PAGE_SIZE = 20
export const HISTORY_PAGE_SIZE = 20
/** 변경 이력 기간 기본값 (F-AMB-014 1: 최근 30일) */
export const HISTORY_DEFAULT_DAYS = 30

/** 한국 날짜 'YYYY-MM-DD' (daysAgo 일 전) */
export function kstYmd(now: number, daysAgo = 0): string {
  return new Date(now + 9 * 3_600_000 - daysAgo * 86_400_000).toISOString().slice(0, 10)
}

/** 최근 N일 = 오늘을 포함한 N일 (한국 날짜) */
export function recentRange(now: number, days: number = HISTORY_DEFAULT_DAYS): { from: string; to: string } {
  return { from: kstYmd(now, days - 1), to: kstYmd(now) }
}

const ok: Decision = { allowed: true }
const no = (reason: string): Decision => ({ allowed: false, reason })
const first = (...ds: Decision[]): Decision => ds.find((d) => !d.allowed) ?? ok

type StateTarget = PermissionTarget & Pick<AdminUser, 'pinStatus'>

/** 수정 (F-AMB-009): Core 는 General 만 */
export const canOpenEdit = (actor: PermissionActor, target: PermissionTarget): Decision => canEditUser(actor, target)

/**
 * 관리 유형 바꾸기 (F-AMB-009 4: Lead 만) + 덧붙인 안전 규칙
 * - 자기 자신의 관리 유형은 바꿀 수 없다 (스스로 Lead 를 잃지 않게. 자기 자신 비활성화 불가 F-AMB-004 3 와 같은 생각)
 * - 활성 Lead 가 1명 이상 남아야 한다 (F-AMB-004 4 를 유형 변경에도)
 */
export function canChangeTypeTo(actor: PermissionActor, target: PermissionTarget, next: ManagementType, activeLeadCount: number): Decision {
  if (next === target.type) return ok
  const base = canChangeUserType(actor)
  if (!base.allowed) return base
  if (target.id === actor.id) return no('자기 자신의 관리 유형은 바꿀 수 없습니다. 다른 Lead에게 요청해 주세요.')
  if (target.type === 'Lead' && target.status === 'active' && activeLeadCount <= 1) return no('활성 상태의 Lead가 1명 이상 남아야 합니다.')
  return ok
}

/** 수정 팝업의 상태 바꾸기: 비활성으로 = 비활성화 규칙(F-AMB-004), 활성으로 = 재활성화(F-AMB-009 6). 잠김은 [잠금 해제]로만 */
export function canChangeStatusTo(actor: PermissionActor, target: PermissionTarget, next: 'active' | 'inactive', activeLeadCount: number): Decision {
  if (next === 'inactive') return target.status === 'inactive' ? ok : canDeactivateUser(actor, target, activeLeadCount)
  if (target.status === 'locked') return no('잠긴 계정은 목록의 [잠금 해제]로 풀어 주세요.')
  return target.status === 'inactive' ? canReactivateUser(actor, target) : ok
}

/** PIN 초기화 (F-AMB-012): Core 는 General 만 + 설정을 마친 활성 · 잠김 사용자만 */
export function canResetPinOf(actor: PermissionActor, target: StateTarget): Decision {
  return first(canResetPin(actor, target), pinResetState(target))
}

function pinResetState(t: { status: AdminUser['status']; pinStatus: PinStatus }): Decision {
  if (t.status === 'inactive') return no('비활성 사용자의 PIN은 초기화할 수 없습니다. 먼저 다시 활성화해 주세요.')
  if (t.pinStatus === 'pending') return no('아직 PIN을 설정하지 않은 사용자입니다. [링크 재발송]으로 PIN 설정 링크를 다시 보내 주세요.')
  if (t.pinStatus === 'reset') return no('이미 초기화된 PIN입니다. [링크 재발송]으로 재설정 링크를 다시 보내 주세요.')
  return ok
}

/** 남은 대기 시간 (밀리초). 보낼 수 있으면 0 */
export function resendWaitMs(lastSentAt: string | null, now: number): number {
  if (!lastSentAt) return 0
  return Math.max(0, Date.parse(lastSentAt) + RESEND_GAP_MS - now)
}

/** 'N초' (재발송까지 남은 시간) */
export const secondsLeft = (ms: number) => `${Math.max(1, Math.ceil(ms / 1000))}초`

/**
 * PIN 설정 링크 재발송 (F-AMB-013): 대기 · 초기화됨인 사용자만, 같은 사용자 1분 간격.
 * 권한 제한은 명세에 없다 (본인 메일로만 가는 링크라 Lead · Core 모두 보낼 수 있다).
 */
export function canResendPinMail(target: Pick<AdminUser, 'status' | 'pinStatus' | 'pinMailSentAt'>, now: number): Decision {
  if (target.status === 'inactive') return no('비활성 사용자에게는 링크를 보낼 수 없습니다. 먼저 다시 활성화해 주세요.')
  if (target.pinStatus === 'set') return no('PIN을 이미 설정한 사용자입니다.')
  const wait = resendWaitMs(target.pinMailSentAt, now)
  if (wait > 0) return no(`같은 사용자에게는 1분 뒤에 다시 보낼 수 있습니다. ${secondsLeft(wait)} 뒤에 다시 시도해 주세요.`)
  return ok
}

/** 잠금 해제 (F-AMB-015 4) + 'PIN도 초기화하기'를 고르면 PIN 초기화 규칙까지 */
export function canUnlockWith(actor: PermissionActor, target: StateTarget, resetPin: boolean): Decision {
  const d = canUnlockUser(actor, target)
  if (!d.allowed || !resetPin) return d
  return first(canResetPin(actor, target), target.pinStatus === 'set' ? ok : no('PIN을 설정하지 않은 사용자라 함께 초기화할 PIN이 없습니다.'))
}

const DAY_MS = 86_400_000
const KST_MS = 9 * 3_600_000

/**
 * 개인정보 자동 삭제 시각 (F-SYS-005): 비활성화 후 1년이 지난 뒤 처음 오는 0시(KST) 일괄 처리.
 * 그 전에 다시 활성화하면 삭제 일정은 취소된다 (deactivatedAt 이 지워짐).
 */
export function purgeAtOf(deactivatedAt: string | null): string | null {
  if (!deactivatedAt) return null
  const due = Date.parse(deactivatedAt) + PURGE_AFTER_DAYS * DAY_MS
  const local = due + KST_MS
  const midnight = local % DAY_MS === 0 ? due : Math.floor(local / DAY_MS) * DAY_MS + DAY_MS - KST_MS
  return new Date(midnight).toISOString()
}

/** 관리자 비밀번호 초기화 (F-AMB-010: Lead 만, 대상은 Lead · Core) + 비활성 계정은 먼저 재활성화 */
export function canResetPasswordOf(actor: PermissionActor, target: PermissionTarget): Decision {
  return first(canResetPassword(actor, target), target.status === 'inactive' ? no('비활성 계정입니다. 먼저 다시 활성화해 주세요.') : ok)
}
