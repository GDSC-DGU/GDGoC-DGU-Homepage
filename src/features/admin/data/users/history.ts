import { SYSTEM_ACTOR } from '../common/accounts'
import { newId } from '../common/list'
import { maskStudentId } from '../common/mask'
import type { ActorRef, IsoTime } from '../common/types'
import type { AdminStore } from '../store'
import { purgeAtOf } from './rules'
import type { AdminUser, MailResult, UserHistoryAction, UserHistoryEntry, UserHistoryKind, UsersState } from './types'

/**
 * 사용자 변경 이력 (F-AMB-005 · 014). 이력은 덧붙이기만 한다 (수정 · 삭제 불가, F-AMB-005 3).
 * 예외는 개인정보 자동 삭제(F-SYS-005 2): 대상 · 처리자 이름을 '탈퇴한 사용자'로 바꾼다.
 *
 * 다른 구역에서 사용자 이력을 남길 때 (예: 모집의 최종 합격자 일괄 등록, F-ARC-037 4):
 *   import { recordUserHistory } from '../users/history'
 *   recordUserHistory(ctx.store, { actor, target: user, action: 'bulk-register', detail: '최종 합격자 일괄 등록 (5기)', mail: 'sent' }, isoNow(ctx))
 * 사용자 계정까지 만들 때는 registration.ts 의 bulkRegisterUsers 가 이력도 같이 남긴다.
 */

/** 이력 화면 탭 (F-AMB-014 순서) */
export const HISTORY_KINDS: readonly UserHistoryKind[] = ['add', 'type', 'pin', 'lock', 'deactivate']

export const HISTORY_KIND_LABEL: Record<UserHistoryKind, string> = {
  add: '추가 · 등록',
  type: '관리 유형 변경',
  pin: 'PIN',
  lock: '잠금',
  deactivate: '비활성화 · 삭제',
}

/** 표의 '변경 종류' 칸 */
export const HISTORY_ACTION_LABEL: Record<UserHistoryAction, string> = {
  create: '사용자 추가',
  'bulk-register': '일괄 등록',
  update: '정보 수정',
  'type-change': '관리 유형 변경',
  'pin-set': 'PIN 설정',
  'pin-reset': 'PIN 초기화',
  'pin-mail': '링크 발송',
  'password-reset': '비밀번호 초기화',
  lock: '잠김',
  unlock: '잠금 해제',
  deactivate: '비활성화',
  reactivate: '재활성화',
  purge: '개인정보 삭제',
}

/**
 * 변경 종류 → 탭. 명세 탭에 없는 '정보 수정'은 계정 정보라 '추가 · 등록'에, '비밀번호 초기화'는 인증 수단 초기화라 'PIN'에 둔다 (NOTES.md).
 */
export const HISTORY_KIND_OF: Record<UserHistoryAction, UserHistoryKind> = {
  create: 'add',
  'bulk-register': 'add',
  update: 'add',
  'type-change': 'type',
  'pin-set': 'pin',
  'pin-reset': 'pin',
  'pin-mail': 'pin',
  'password-reset': 'pin',
  lock: 'lock',
  unlock: 'lock',
  deactivate: 'deactivate',
  reactivate: 'deactivate',
  purge: 'deactivate',
}

/** 비활성화 · 재활성화 이력 내용 (무엇이 막히고 풀리는지) */
export function statusChangeDetail(to: 'active' | 'inactive', hasAdminLogin: boolean): string {
  if (to === 'active') return '비활성 → 활성 · 개인정보 삭제 일정 취소'
  return `활성 → 비활성 · ${hasAdminLogin ? '관리자 로그인 · ' : ''}학번 인증 막힘 · 1년 뒤 개인정보 삭제`
}

/** 개인정보가 삭제된 사용자 표시 (F-SYS-005 2) */
export const PURGED_NAME = '탈퇴한 사용자'

export interface UserHistoryInput {
  /** 처리자: 관리자 계정(actorOf) · 본인({ kind: 'self', name: '본인' }) · 시스템(SYSTEM_ACTOR) */
  actor: ActorRef
  /** 대상 사용자. 학번은 여기서 가려서 남긴다 */
  target: Pick<AdminUser, 'id' | 'name' | 'studentId'>
  action: UserHistoryAction
  /** 내용 한 줄. 이메일 · 이름 같은 개인정보 값은 넣지 않는다 (삭제 뒤에도 이력에 남지 않게) */
  detail: string
  /** 메일을 보냈으면 결과 (F-AMB-013 3) */
  mail?: MailResult
}

export function toHistoryEntry(input: UserHistoryInput, at: IsoTime): UserHistoryEntry {
  return {
    id: newId('uh'),
    at,
    actor: input.actor,
    target: { userId: input.target.id, name: input.target.name, maskedStudentId: maskStudentId(input.target.studentId) },
    kind: HISTORY_KIND_OF[input.action],
    action: input.action,
    detail: input.detail,
    ...(input.mail ? { mail: input.mail } : {}),
  }
}

/** 이력 덧붙이기 (순수 함수: 새 state) */
export function appendUserHistory(state: UsersState, input: UserHistoryInput | readonly UserHistoryInput[], at: IsoTime): UsersState {
  const list = Array.isArray(input) ? (input as readonly UserHistoryInput[]) : [input as UserHistoryInput]
  if (list.length === 0) return state
  return { ...state, history: [...state.history, ...list.map((i) => toHistoryEntry(i, at))] }
}

/**
 * 사용자 변경 이력 남기기 (store 의 users 칸에 덧붙인다). 다른 구역이 쓰는 입구.
 * at: 기록 시각 (예시 저장소에서는 isoNow(ctx)). 돌려주는 값은 남긴 이력.
 */
export function recordUserHistory(store: AdminStore, input: UserHistoryInput | readonly UserHistoryInput[], at: IsoTime = new Date().toISOString()): UserHistoryEntry[] {
  const before = store.get('users').history.length
  store.set('users', (s) => appendUserHistory(s, input, at))
  return store.get('users').history.slice(before)
}

/**
 * 개인정보 자동 삭제 (F-SYS-005, 매일 0시 KST 흉내). 비활성화 후 1년이 지난 사용자를
 * 목록에서 지우고, 이력의 대상 · 처리자 표시를 '탈퇴한 사용자'로 바꾸고, 삭제 내역을 이력에 남긴다.
 * 그 전에 재활성화하면 deactivatedAt 이 지워져 대상이 아니다.
 */
export function purgeExpiredUsers(state: UsersState, now: number): { state: UsersState; purged: number } {
  const due = new Set(state.users.filter((u) => u.status === 'inactive' && u.deactivatedAt && Date.parse(purgeAtOf(u.deactivatedAt)!) <= now).map((u) => u.id))
  if (due.size === 0) return { state, purged: 0 }
  const at = new Date(now).toISOString()
  const history = state.history.map((h) => {
    const target = due.has(h.target.userId) ? { ...h.target, name: PURGED_NAME, maskedStudentId: '-' } : h.target
    const actor: ActorRef = h.actor.kind === 'admin' && due.has(h.actor.id) ? { ...h.actor, name: PURGED_NAME } : h.actor
    return target === h.target && actor === h.actor ? h : { ...h, target, actor }
  })
  const logs: UserHistoryEntry[] = [...due].map((id) => ({
    id: newId('uh'),
    at,
    actor: SYSTEM_ACTOR,
    target: { userId: id, name: PURGED_NAME, maskedStudentId: '-' },
    kind: 'deactivate',
    action: 'purge',
    detail: '비활성화 1년 경과 · 학번 · 이름 · 이메일 · PIN · 관리자 아이디 삭제',
  }))
  return { state: { users: state.users.filter((u) => !due.has(u.id)), history: [...history, ...logs] }, purged: due.size }
}
