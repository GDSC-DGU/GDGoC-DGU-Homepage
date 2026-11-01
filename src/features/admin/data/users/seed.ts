import { ADMIN_ACCOUNT_SEED, freshLoginState, SYSTEM_ACTOR, type UserCore } from '../common/accounts'
import { maskStudentId } from '../common/mask'
import { seedTools, type SeedContext } from '../common/seedContext'
import type { ActorRef } from '../common/types'
import { HISTORY_KIND_OF, PURGED_NAME, statusChangeDetail } from './history'
import { PIN_LINK_HOURS } from './rules'
import type { AdminUser, PinStatus, UserHistoryAction, UserHistoryEntry, UsersState } from './types'

/** seed 모양을 바꾸면 1 올린다 */
export const USERS_SEED_VERSION = 2

type Span = { days?: number; hours?: number; minutes?: number }

/**
 * 사용자 예시 데이터.
 * 맨 앞은 공통 seed 의 예시 관리자 계정 4개(ADMIN_ACCOUNT_SEED, 지우지 않음: 로그인이 쓴다) + 이 구역이 더한 운영진E(Lead) · 운영진F(Core, 잠김).
 * 그 뒤에 General '예시 멤버 01~18'. 학번 2026000101 (3기는 2025…, 2기는 2024…), 이메일 memberNN@example.com.
 * 상태가 골고루 섞이게: 설정 완료 · 대기 · 대기(링크 만료) · 대기(발송 실패) · 초기화됨 · 초기화됨(링크 만료) · 잠김(PIN · 관리자 로그인) · 비활성(삭제 예정이 가까운 사람 포함).
 * 모두 24명이라 '전체'에서 쪽 나누기(20명씩)가 보인다. 이력도 최근 30일 안에 20건이 넘는다.
 */
export function createUsersSeed(ctx: SeedContext): UsersState {
  const { ago, by } = seedTools(ctx)
  const self: ActorRef = { kind: 'self', name: '본인' }
  const A = by('A', '').by
  const B = by('B', '').by

  const base = (u: UserCore, extra: Partial<AdminUser>): AdminUser => ({
    ...u,
    adminLogin: u.adminLogin ? { ...u.adminLogin } : null,
    pinStatus: 'set',
    pinLinkExpiresAt: null,
    pinMailFailed: false,
    pinMailSentAt: null,
    pinFailedCount: 0,
    lockedAt: null,
    lockReason: null,
    deactivatedAt: null,
    department: null,
    created: by('system', ago({ days: 40 })),
    ...extra,
  })

  /** 링크를 보낸 사용자 (대기 · 초기화됨): 보낸 시각에서 72시간 */
  const linkSent = (pinStatus: Exclude<PinStatus, 'set'>, sent: Span, failed = false): Partial<AdminUser> => {
    const sentAt = ago(sent)
    return { pinStatus, pinMailSentAt: sentAt, pinLinkExpiresAt: new Date(Date.parse(sentAt) + PIN_LINK_HOURS * 3_600_000).toISOString(), pinMailFailed: failed }
  }

  const admins: AdminUser[] = [
    ...ADMIN_ACCOUNT_SEED.map((a) => base(a, a.status === 'inactive' ? { deactivatedAt: ago({ days: 20, hours: 2 }) } : {})),
    base(
      { id: 'user-admin-e', name: '운영진E', studentId: '2025000005', email: 'admin-e@example.com', type: 'Lead', generation: 3, status: 'active', loginId: 'leade', adminLogin: freshLoginState() },
      { created: { by: A, at: ago({ days: 39 }) } },
    ),
    base(
      // 관리자 로그인 5회 실패 → 15분 제한 → 다시 5회 실패로 잠김 (F-ACM-001 4). Lead 만 풀 수 있다 (F-AMB-015 4)
      { id: 'user-admin-f', name: '운영진F', studentId: '2026000006', email: 'admin-f@example.com', type: 'Core', generation: 4, status: 'locked', loginId: 'coref', adminLogin: { ...freshLoginState(), limitRounds: 1 } },
      { lockedAt: ago({ hours: 3 }), lockReason: 'password', created: { by: A, at: ago({ days: 38 }) } },
    ),
  ]

  const member = (n: number, extra: Partial<AdminUser> = {}): AdminUser => {
    const nn = String(n).padStart(2, '0')
    const generation = extra.generation ?? 4
    return base(
      { id: `user-member-${nn}`, name: `예시 멤버 ${nn}`, studentId: `${2022 + generation}000${String(100 + n).padStart(3, '0')}`, email: `member${nn}@example.com`, type: 'General', generation, status: 'active', loginId: null, adminLogin: null },
      { created: { by: A, at: ago({ days: 38 }) }, ...extra },
    )
  }

  const members: AdminUser[] = [
    member(1),
    member(2),
    member(3, { ...linkSent('pending', { hours: 20 }), created: { by: A, at: ago({ hours: 20 }) } }),
    member(4, linkSent('reset', { hours: 2 })),
    member(5, { status: 'locked', lockReason: 'pin', lockedAt: ago({ hours: 6 }), pinFailedCount: 5 }),
    member(6, { ...linkSent('pending', { hours: 26 }, true), created: { by: B, at: ago({ hours: 26 }) } }),
    member(7, { generation: 3 }),
    member(8, linkSent('pending', { days: 4 })),
    member(9, linkSent('reset', { days: 5 })),
    member(10, { generation: 3, status: 'inactive', deactivatedAt: ago({ days: 20 }) }),
    member(11, { generation: 2, status: 'inactive', deactivatedAt: ago({ days: 358 }), created: { by: A, at: ago({ days: 400 }) } }),
    member(12),
    member(13),
    member(14),
    member(15, { generation: 3 }),
    member(16, { created: { by: A, at: ago({ days: 29 }) } }),
    member(17, { created: { by: B, at: ago({ days: 25 }) } }),
    member(18, { ...linkSent('pending', { hours: 30 }), created: { by: B, at: ago({ hours: 30 }) } }),
  ]
  const users = [...admins, ...members]
  return { users, history: seedHistory(users, ago, { A, B, self }) }
}

/** 변경 이력 예시 (오래된 것부터). 사용자 상태와 맞게: 대기 · 초기화됨의 발송 시각, 잠김, 비활성화 … */
function seedHistory(users: readonly AdminUser[], ago: (s: Span) => string, who: { A: ActorRef; B: ActorRef; self: ActorRef }): UserHistoryEntry[] {
  const { A, B, self } = who
  const m = (n: number) => `user-member-${String(n).padStart(2, '0')}`
  let seq = 0
  const entry = (at: Span, actor: ActorRef, targetId: string, action: UserHistoryAction, detail: string, mail?: 'sent' | 'failed'): UserHistoryEntry => {
    const t = targetId === 'purged' ? null : users.find((u) => u.id === targetId)!
    return {
      id: `uh-${String(++seq).padStart(2, '0')}`,
      at: ago(at),
      actor,
      target: t ? { userId: t.id, name: t.name, maskedStudentId: maskStudentId(t.studentId) } : { userId: 'user-purged-01', name: PURGED_NAME, maskedStudentId: '-' },
      kind: HISTORY_KIND_OF[action],
      action,
      detail,
      ...(mail ? { mail } : {}),
    }
  }
  const gen = (n: number) => users.find((u) => u.id === m(n))!.generation
  const list: UserHistoryEntry[] = [
    entry({ days: 358 }, A, m(11), 'deactivate', statusChangeDetail('inactive', false)),
    entry({ days: 39 }, A, 'user-admin-e', 'create', '사용자 추가 (Lead · 3기) · 관리자 아이디 발급 · PIN 설정 링크 발송 완료', 'sent'),
    entry({ days: 38, hours: 1 }, A, 'user-admin-f', 'create', '사용자 추가 (General · 4기) · PIN 설정 링크 발송 완료', 'sent'),
    ...[1, 2, 5, 7, 8, 9, 12, 13, 14, 15].map((n) => entry({ days: 38, minutes: 60 - n }, A, m(n), 'bulk-register', `최종 합격자 일괄 등록 (General · ${n === 15 ? 4 : gen(n)}기) · PIN 설정 링크 발송 완료`, 'sent')),
    ...[1, 2, 5, 7, 12, 13, 14, 15].map((n) => entry({ days: 37, hours: 24 - n }, self, m(n), 'pin-set', 'PIN 설정 완료')),
    entry({ days: 29 }, A, m(16), 'create', '사용자 추가 (General · 4기) · PIN 설정 링크 발송 완료', 'sent'),
    entry({ days: 28, hours: 20 }, self, m(16), 'pin-set', 'PIN 설정 완료'),
    entry({ days: 27 }, A, 'user-admin-f', 'type-change', 'General → Core · 관리자 아이디 발급 · 임시 비밀번호 발급'),
    entry({ days: 26, hours: 2 }, self, 'user-admin-f', 'pin-set', 'PIN 설정 완료'),
    entry({ days: 25 }, B, m(17), 'create', '사용자 추가 (General · 4기) · PIN 설정 링크 발송 완료', 'sent'),
    entry({ days: 24, hours: 3 }, self, m(17), 'pin-set', 'PIN 설정 완료'),
    entry({ days: 22 }, A, m(15), 'update', '정보 수정 (기수 4기 → 3기)'),
    entry({ days: 20, hours: 2 }, A, 'user-admin-d', 'deactivate', statusChangeDetail('inactive', true)),
    entry({ days: 20 }, A, m(10), 'deactivate', statusChangeDetail('inactive', false)),
    entry({ days: 15 }, B, m(7), 'pin-reset', 'PIN 초기화 · 재설정 링크 발송 완료', 'sent'),
    entry({ days: 14, hours: 21 }, self, m(7), 'pin-set', 'PIN 재설정 완료'),
    // 1년 전에 비활성화된 사용자의 개인정보 자동 삭제 (F-SYS-005): 목록에는 없고 이력에만 '탈퇴한 사용자'로 남는다
    entry({ days: 12 }, SYSTEM_ACTOR, 'purged', 'purge', '비활성화 1년 경과 · 학번 · 이름 · 이메일 · PIN · 관리자 아이디 삭제'),
    entry({ days: 10 }, A, 'user-admin-b', 'update', '정보 수정 (이메일)'),
    entry({ days: 9 }, A, 'user-admin-c', 'password-reset', '관리자 비밀번호 초기화 · 임시 비밀번호 발급'),
    entry({ days: 8 }, A, m(8), 'pin-mail', 'PIN 설정 링크 재발송 · 발송 실패', 'failed'),
    entry({ days: 7, hours: 4 }, SYSTEM_ACTOR, m(13), 'lock', '학번 + PIN 5회 연속 실패 (15분 제한 뒤 다시 5회)로 잠김'),
    entry({ days: 7 }, B, m(13), 'unlock', '잠금 해제 · 실패 횟수 0으로 초기화'),
    entry({ days: 5 }, B, m(9), 'pin-reset', 'PIN 초기화 · 재설정 링크 발송 완료', 'sent'),
    entry({ days: 4 }, A, m(8), 'pin-mail', 'PIN 설정 링크 재발송 · 발송 완료', 'sent'),
    entry({ days: 3 }, A, m(12), 'deactivate', statusChangeDetail('inactive', false)),
    entry({ days: 2, hours: 20 }, A, m(12), 'reactivate', statusChangeDetail('active', false)),
    entry({ hours: 30 }, B, m(18), 'create', '사용자 추가 (General · 4기) · PIN 설정 링크 발송 완료', 'sent'),
    entry({ hours: 26 }, B, m(6), 'create', '사용자 추가 (General · 4기) · PIN 설정 링크 발송 실패', 'failed'),
    entry({ hours: 20 }, A, m(3), 'create', '사용자 추가 (General · 4기) · PIN 설정 링크 발송 완료', 'sent'),
    entry({ hours: 6 }, SYSTEM_ACTOR, m(5), 'lock', '학번 + PIN 5회 연속 실패 (15분 제한 뒤 다시 5회)로 잠김'),
    entry({ hours: 3 }, SYSTEM_ACTOR, 'user-admin-f', 'lock', '관리자 로그인 5회 연속 실패 (15분 제한 뒤 다시 5회)로 잠김'),
    entry({ hours: 2 }, B, m(4), 'pin-reset', 'PIN 초기화 · 재설정 링크 발송 완료', 'sent'),
  ]
  return list.sort((a, b) => a.at.localeCompare(b.at))
}
