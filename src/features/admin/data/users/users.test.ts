import { beforeAll, describe, expect, it } from 'vitest'
import { createSessionStore } from '../auth/session'
import { SYSTEM_ACTOR } from '../common/accounts'
import type { AdminRepoError } from '../common/errors'
import { setMockOptions } from '../common/mockContext'
import type { PermissionActor } from '../permissions'
import { createMockAdminRepositories } from '../repositories'
import { createAdminStore, memoryStorage } from '../store'
import { HISTORY_KIND_OF, HISTORY_KINDS, PURGED_NAME, purgeExpiredUsers, recordUserHistory } from './history'
import { simulatePinMail } from './mail'
import { bulkRegisterUsers } from './registration'
import {
  canChangeStatusTo,
  canChangeTypeTo,
  canResendPinMail,
  canResetPasswordOf,
  canResetPinOf,
  canUnlockWith,
  purgeAtOf,
  recentRange,
  RESEND_GAP_MS,
} from './rules'
import { createUsersSeed } from './seed'
import type { AdminUser } from './types'

const NOW = Date.parse('2026-11-01T03:00:00Z')
beforeAll(() => setMockOptions({ latency: [0, 0], failureRate: 0 }))

/** 시각을 움직일 수 있는 예시 저장소 (1분 간격 제한 확인용) */
async function signedIn(loginId: 'lead-a' | 'core-b' = 'lead-a') {
  const clock = { now: NOW }
  const storage = memoryStorage()
  const store = createAdminStore({ storage, now: () => clock.now })
  const repos = createMockAdminRepositories({ store, session: createSessionStore(storage), now: () => clock.now })
  await repos.auth.login({ loginId, password: 'example1234' })
  const user = (id: string) => store.get('users').users.find((u) => u.id === id)!
  const lastHistory = (n = 1) => store.get('users').history.slice(-n)
  return { store, repos, clock, user, lastHistory }
}
const rejects = (p: Promise<unknown>) =>
  p.then(
    () => {
      throw new Error('실패해야 합니다')
    },
    (e: AdminRepoError) => e,
  )

const kstDay = (iso: string) => new Date(Date.parse(iso) + 9 * 3_600_000).toISOString().slice(0, 10)
const lead: PermissionActor = { id: 'user-admin-a', role: 'Lead' }
const core: PermissionActor = { id: 'user-admin-b', role: 'Core' }

describe('예시 사용자 (seed)', () => {
  const seed = createUsersSeed({ now: NOW })
  const by = (pred: (u: AdminUser) => boolean) => seed.users.filter(pred)

  it('상태가 골고루 섞여 있다 (대기 · 초기화됨 · 링크 만료 · 발송 실패 · 잠김 · 비활성)', () => {
    const expired = (u: AdminUser) => !!u.pinLinkExpiresAt && Date.parse(u.pinLinkExpiresAt) <= NOW
    expect(by((u) => u.pinStatus === 'pending' && !expired(u)).length).toBeGreaterThan(0)
    expect(by((u) => u.pinStatus === 'pending' && expired(u)).length).toBeGreaterThan(0)
    expect(by((u) => u.pinStatus === 'reset' && !expired(u)).length).toBeGreaterThan(0)
    expect(by((u) => u.pinStatus === 'reset' && expired(u)).length).toBeGreaterThan(0)
    expect(by((u) => u.pinMailFailed).length).toBeGreaterThan(0)
    expect(by((u) => u.status === 'locked' && u.lockReason === 'pin').length).toBeGreaterThan(0)
    expect(by((u) => u.status === 'locked' && u.lockReason === 'password' && u.type !== 'General').length).toBeGreaterThan(0)
    expect(by((u) => u.status === 'inactive' && !!u.deactivatedAt).length).toBeGreaterThanOrEqual(2)
    expect(by((u) => u.type === 'Lead' && u.status === 'active').length).toBe(2)
  })

  it('학번 · 아이디가 겹치지 않고, 대기 · 초기화됨은 링크 만료 시각이 있다', () => {
    expect(new Set(seed.users.map((u) => u.studentId)).size).toBe(seed.users.length)
    const ids = seed.users.flatMap((u) => (u.loginId ? [u.loginId] : []))
    expect(new Set(ids).size).toBe(ids.length)
    for (const u of seed.users) {
      if (u.pinStatus === 'set') expect(u.pinLinkExpiresAt, u.id).toBeNull()
      else expect(u.pinLinkExpiresAt, u.id).not.toBeNull()
      expect(!!u.loginId, u.id).toBe(u.type !== 'General')
    }
  })

  it('이력: 종류가 탭과 맞고, 최근 30일에 한 쪽(20건)이 넘으며, 이메일 같은 개인정보 값은 남기지 않는다', () => {
    for (const h of seed.history) {
      expect(h.kind, h.id).toBe(HISTORY_KIND_OF[h.action])
      expect(h.detail, h.id).not.toMatch(/@/)
    }
    const { from } = recentRange(NOW)
    expect(seed.history.filter((h) => kstDay(h.at) >= from).length).toBeGreaterThan(20)
    expect(new Set(seed.history.map((h) => h.kind))).toEqual(new Set(HISTORY_KINDS))
    expect(seed.history.some((h) => h.actor.kind === 'self') && seed.history.some((h) => h.actor.kind === 'system')).toBe(true)
  })
})

describe('덧붙인 규칙 (rules.ts)', () => {
  const t = (id: string, type: AdminUser['type'], status: AdminUser['status'] = 'active', pinStatus: AdminUser['pinStatus'] = 'set') => ({ id, type, status, pinStatus })

  it('관리 유형 변경: Lead 만, 자기 자신은 안 됨, 마지막 활성 Lead 는 다른 유형으로 못 바꿈', () => {
    expect(canChangeTypeTo(core, t('x', 'General'), 'Core', 2).reason).toBe('관리 유형은 Lead만 바꿀 수 있습니다.')
    expect(canChangeTypeTo(core, t('x', 'General'), 'General', 2).allowed).toBe(true)
    expect(canChangeTypeTo(lead, t('user-admin-a', 'Lead'), 'Core', 2).reason).toMatch(/자기 자신/)
    expect(canChangeTypeTo(lead, t('lead-2', 'Lead'), 'General', 1).reason).toBe('활성 상태의 Lead가 1명 이상 남아야 합니다.')
    expect(canChangeTypeTo(lead, t('lead-2', 'Lead'), 'Core', 2).allowed).toBe(true)
  })

  it('수정 팝업의 상태: 비활성화 규칙을 따르고, 잠김은 [잠금 해제]로만 푼다', () => {
    expect(canChangeStatusTo(lead, t('user-admin-a', 'Lead'), 'inactive', 2).reason).toBe('자기 자신은 비활성화할 수 없습니다.')
    expect(canChangeStatusTo(core, t('x', 'Core', 'inactive'), 'active', 2).allowed).toBe(false)
    expect(canChangeStatusTo(core, t('x', 'General', 'inactive'), 'active', 2).allowed).toBe(true)
    expect(canChangeStatusTo(lead, t('x', 'General', 'locked'), 'active', 2).reason).toMatch(/잠금 해제/)
  })

  it('PIN 초기화: 설정을 마친 활성 · 잠김 사용자만, Core 는 General 만', () => {
    expect(canResetPinOf(core, t('x', 'General')).allowed).toBe(true)
    expect(canResetPinOf(core, t('x', 'Core')).allowed).toBe(false)
    expect(canResetPinOf(lead, t('x', 'General', 'inactive')).reason).toMatch(/비활성/)
    expect(canResetPinOf(lead, t('x', 'General', 'active', 'pending')).reason).toMatch(/링크 재발송/)
    expect(canResetPinOf(lead, t('x', 'General', 'locked')).allowed).toBe(true)
  })

  it('링크 재발송: 대기 · 초기화됨만, 같은 사용자 1분 간격 (남은 초 안내)', () => {
    const sent = new Date(NOW - 20_000).toISOString()
    expect(canResendPinMail({ status: 'active', pinStatus: 'pending', pinMailSentAt: sent }, NOW).reason).toBe('같은 사용자에게는 1분 뒤에 다시 보낼 수 있습니다. 40초 뒤에 다시 시도해 주세요.')
    expect(canResendPinMail({ status: 'active', pinStatus: 'pending', pinMailSentAt: sent }, NOW - 20_000 + RESEND_GAP_MS).allowed).toBe(true)
    expect(canResendPinMail({ status: 'active', pinStatus: 'set', pinMailSentAt: null }, NOW).allowed).toBe(false)
    expect(canResendPinMail({ status: 'inactive', pinStatus: 'reset', pinMailSentAt: null }, NOW).allowed).toBe(false)
  })

  it('잠금 해제 + PIN도 초기화: Lead · Core 계정은 Lead 만, PIN 이 있어야 함께 초기화', () => {
    expect(canUnlockWith(core, t('x', 'Core', 'locked'), false).allowed).toBe(false)
    expect(canUnlockWith(core, t('x', 'General', 'locked'), true).allowed).toBe(true)
    expect(canUnlockWith(lead, t('x', 'General', 'locked', 'pending'), true).allowed).toBe(false)
    expect(canUnlockWith(lead, t('x', 'General', 'locked', 'pending'), false).allowed).toBe(true)
  })

  it('비밀번호 초기화: Lead 만, 비활성 계정은 먼저 재활성화', () => {
    expect(canResetPasswordOf(core, t('x', 'Core')).allowed).toBe(false)
    expect(canResetPasswordOf(lead, t('x', 'Core', 'inactive')).allowed).toBe(false)
    expect(canResetPasswordOf(lead, t('x', 'Core', 'locked')).allowed).toBe(true)
  })

  it('개인정보 삭제 예정: 비활성화 1년 뒤 처음 오는 0시(KST)', () => {
    // 2026-11-01 12:00 KST 비활성화 → 2027-11-02 00:00 KST
    expect(purgeAtOf('2026-11-01T03:00:00.000Z')).toBe('2027-11-01T15:00:00.000Z')
    // 0시(KST) 정각이면 그때
    expect(purgeAtOf('2026-10-31T15:00:00.000Z')).toBe('2027-10-31T15:00:00.000Z')
    expect(purgeAtOf(null)).toBeNull()
  })

  it('최근 30일 = 오늘을 포함한 30일 (한국 날짜)', () => {
    expect(recentRange(NOW)).toEqual({ from: '2026-10-03', to: '2026-11-01' })
    expect(recentRange(Date.parse('2026-10-31T16:30:00Z'), 7)).toEqual({ from: '2026-10-26', to: '2026-11-01' })
  })
})

describe('사용자 목록 (API-AMB-001 · 002)', () => {
  it('Lead → Core → General · 이름순, 20명씩, 탭 인원 · PIN 미설정 · 활성 Lead 수', async () => {
    const { repos } = await signedIn()
    const all = await repos.users.list({})
    expect(all.pageSize).toBe(20)
    expect(all.totalPages).toBe(2)
    expect(all.items.slice(0, 2).map((u) => u.type)).toEqual(['Lead', 'Lead'])
    expect(all.counts).toEqual({ all: 24, Lead: 2, Core: 4, General: 18 })
    expect(all.activeLeads).toBe(2)
    expect(all.pinNotSet).toBe(all.pin.pending + all.pin.reset)
    expect(all.pin).toMatchObject({ expired: 2, mailFailed: 1 })
  })

  it('검색: 이름 · 전체 학번 · 이메일 · 관리자 아이디 (화면에는 가린 학번만)', async () => {
    const { repos } = await signedIn()
    expect((await repos.users.list({ q: '2026000105' })).items.map((u) => u.name)).toEqual(['예시 멤버 05'])
    expect((await repos.users.list({ q: 'COREF' })).items.map((u) => u.name)).toEqual(['운영진F'])
    expect((await repos.users.list({ q: 'member12@' })).total).toBe(1)
    expect((await repos.users.list({ q: '없는 사람' })).total).toBe(0)
    expect((await repos.users.list({ q: '예시', type: 'Core' })).total).toBe(0)
  })

  it('수정 팝업의 전체 학번은 수정할 수 있는 사람만 (Core 는 Lead · Core 를 못 본다)', async () => {
    const { repos } = await signedIn('core-b')
    expect((await repos.users.get('user-member-01')).studentId).toBe('2026000101')
    expect((await rejects(repos.users.get('user-admin-a'))).code).toBe('FORBIDDEN')
  })

  it('선택 비활성화: 규칙에 걸린 사람은 빼고, 이력 · 삭제 예정일을 남긴다 (F-AMB-004)', async () => {
    const { repos, user, lastHistory } = await signedIn('core-b')
    const r = await repos.users.setStatus(['user-member-01', 'user-admin-b', 'user-admin-e', 'user-member-10'], 'inactive')
    expect(r.changed).toBe(1)
    expect(r.skipped.map((x) => x.reason)).toEqual(['자기 자신은 비활성화할 수 없습니다.', 'Core 계정은 General 사용자만 비활성화할 수 있습니다.', '이미 비활성 상태입니다.'])
    expect(user('user-member-01')).toMatchObject({ status: 'inactive', deactivatedAt: new Date(NOW).toISOString() })
    expect(lastHistory()[0]).toMatchObject({ action: 'deactivate', kind: 'deactivate', actor: { name: '운영진B' }, target: { maskedStudentId: '2026****01' } })
    const row = (await repos.users.list({ q: '예시 멤버 01' })).items[0]
    expect(row.purgeAt).toBe(purgeAtOf(new Date(NOW).toISOString()))
  })
})

describe('사용자 추가 · 수정 (API-AMB-004~007)', () => {
  it('Lead · Core 추가: 아이디 형식 · 중복, 임시 비밀번호 한 번, PIN 대기 + 메일 발송 + 이력', async () => {
    const { repos, user, lastHistory } = await signedIn()
    const base = { name: '예시 멤버 40', studentId: '2026000140', email: 'm40@example.com', type: 'Core' as const, generation: 5 }
    expect((await rejects(repos.users.create({ ...base, loginId: 'core-b' }))).fields?.loginId).toBe('영문 · 숫자 4~20자로 입력해 주세요.')
    expect((await rejects(repos.users.create({ ...base, loginId: 'LeadE' }))).fields?.loginId).toBe('이미 사용 중인 아이디입니다.')
    expect((await rejects(repos.users.create({ ...base, studentId: '20260001', loginId: 'core40' }))).fields?.studentId).toBe('학번은 숫자 10자리로 입력해 주세요.')
    const r = await repos.users.create({ ...base, loginId: 'core40' })
    expect(r.temporaryPassword).toMatch(/^[a-z]{6}\d{4}$/)
    expect(r.mail).toBe('sent')
    expect(r.user).toMatchObject({ loginId: 'core40', pinStatus: 'pending', mustChangePassword: true, pinLinkExpired: false })
    expect(r.user.pinLinkExpiresAt).toBe(new Date(NOW + 72 * 3_600_000).toISOString())
    // 임시 비밀번호는 저장하지 않는다 (표시만)
    expect(JSON.stringify(user(r.user.id))).not.toContain(r.temporaryPassword!)
    expect(lastHistory()[0]).toMatchObject({ action: 'create', detail: '사용자 추가 (Core · 5기) · 관리자 아이디 발급 · 임시 비밀번호 발급 · PIN 설정 링크 발송 완료', mail: 'sent' })
    expect(await repos.users.checkLoginId('core40')).toEqual({ available: false, message: '이미 사용 중인 아이디입니다.' })
  })

  it("메일 발송 실패 흉내 (주소가 bounce…): 'PIN 설정 상태 옆에 실패' 표시 (F-AMB-011 2)", async () => {
    expect(simulatePinMail('bounce01@example.com')).toBe('failed')
    const { repos } = await signedIn()
    const r = await repos.users.create({ name: '예시 멤버 41', studentId: '2026000141', email: 'bounce41@example.com', type: 'General', generation: 4, loginId: null })
    expect(r).toMatchObject({ mail: 'failed', user: { pinMailFailed: true } })
  })

  it('관리 유형 변경은 Lead 만: General → Core 면 아이디 · 임시 비밀번호, Core → General 이면 관리자 로그인 계정 비활성', async () => {
    const core = await signedIn('core-b')
    const m2 = { name: '예시 멤버 02', email: 'member02@example.com', generation: 4, loginId: 'newcore', status: undefined }
    expect((await rejects(core.repos.users.update('user-member-02', { ...m2, type: 'Core' }))).code).toBe('FORBIDDEN')

    const { repos, user, lastHistory } = await signedIn()
    expect((await rejects(repos.users.update('user-member-02', { ...m2, type: 'Core', loginId: null }))).fields?.loginId).toBe('아이디를 입력해 주세요.')
    const up = await repos.users.update('user-member-02', { ...m2, type: 'Core' })
    expect(up.temporaryPassword).toBeTruthy()
    expect(user('user-member-02')).toMatchObject({ type: 'Core', loginId: 'newcore', adminLogin: { temporaryPassword: true } })
    expect(lastHistory()[0]).toMatchObject({ action: 'type-change', kind: 'type', detail: 'General → Core · 관리자 아이디 발급 · 임시 비밀번호 발급' })

    const down = await repos.users.update('user-admin-b', { name: '운영진B', email: 'admin-b@example.com', generation: 4, type: 'General', loginId: null })
    expect(down.temporaryPassword).toBeNull()
    expect(user('user-admin-b')).toMatchObject({ type: 'General', loginId: null, adminLogin: null })
    expect(lastHistory()[0].detail).toBe('Core → General · 관리자 로그인 계정 비활성')
  })

  it('정보 수정 · 재활성화: 바뀐 칸만 이력에 (값 대신 칸 이름), 바뀐 게 없으면 이력 없음', async () => {
    const { repos, user, store, lastHistory } = await signedIn()
    const before = store.get('users').history.length
    await repos.users.update('user-member-10', { name: '예시 멤버 10', email: 'member10@example.com', generation: 3, type: 'General', loginId: null })
    expect(store.get('users').history.length).toBe(before)
    await repos.users.update('user-member-10', { name: '예시 멤버 10', email: 'new10@example.com', generation: 4, type: 'General', loginId: null, status: 'active' })
    expect(user('user-member-10')).toMatchObject({ status: 'active', deactivatedAt: null, email: 'new10@example.com' })
    expect(lastHistory(2).map((h) => [h.action, h.detail])).toEqual([
      ['update', '정보 수정 (이메일 · 기수 3기 → 4기)'],
      ['reactivate', '비활성 → 활성 · 개인정보 삭제 일정 취소'],
    ])
  })

  it('비밀번호 초기화는 Lead 만, 기존 비밀번호 무효 · 다음 로그인 때 변경', async () => {
    const core = await signedIn('core-b')
    expect((await rejects(core.repos.users.resetPassword('user-admin-c'))).code).toBe('FORBIDDEN')
    const { repos, user, lastHistory } = await signedIn()
    const r = await repos.users.resetPassword('user-admin-b')
    expect(r.temporaryPassword).toBeTruthy()
    expect(user('user-admin-b').adminLogin?.temporaryPassword).toBe(true)
    expect(lastHistory()[0]).toMatchObject({ action: 'password-reset', kind: 'pin' })
  })
})

describe('PIN · 잠금 (API-AMB-008~010)', () => {
  it('링크 재발송: 새 링크 72시간, 같은 사용자 1분 간격(429), 결과를 이력에', async () => {
    const { repos, clock, user, lastHistory } = await signedIn()
    const r = await repos.users.resendPinMail('user-member-08')
    expect(r.mail).toBe('sent')
    expect(r.user).toMatchObject({ pinLinkExpired: false, pinMailFailed: false })
    expect(r.user.pinMailRetryAt).toBe(new Date(NOW + RESEND_GAP_MS).toISOString())
    expect(lastHistory()[0]).toMatchObject({ action: 'pin-mail', detail: 'PIN 설정 링크 재발송 · 발송 완료', mail: 'sent' })
    clock.now = NOW + 30_000
    expect((await rejects(repos.users.resendPinMail('user-member-08'))).code).toBe('RATE_LIMITED')
    clock.now = NOW + RESEND_GAP_MS
    await repos.users.resendPinMail('user-member-08')
    expect(user('user-member-08').pinMailSentAt).toBe(new Date(NOW + RESEND_GAP_MS).toISOString())
    expect((await rejects(repos.users.resendPinMail('user-member-01'))).code).toBe('CONFLICT')
  })

  it('PIN 초기화: 초기화됨 + 재설정 링크, 잠긴 계정이면 잠금도 해제 (이력 2건). Core 는 General 만', async () => {
    const core = await signedIn('core-b')
    expect((await rejects(core.repos.users.resetPin('user-admin-e'))).code).toBe('CONFLICT')
    const { repos, user, lastHistory } = await signedIn()
    const r = await repos.users.resetPin('user-member-05')
    expect(r.user).toMatchObject({ pinStatus: 'reset', status: 'active', lockedAt: null, pinFailedCount: 0 })
    expect(lastHistory(2).map((h) => h.action)).toEqual(['pin-reset', 'unlock'])
    expect(user('user-member-05').pinLinkExpiresAt).toBe(new Date(NOW + 72 * 3_600_000).toISOString())
  })

  it('잠금 해제: 실패 횟수 0, Lead · Core 계정은 Lead 만, PIN도 초기화하기', async () => {
    const core = await signedIn('core-b')
    expect((await rejects(core.repos.users.unlock('user-admin-f', { resetPin: false }))).code).toBe('FORBIDDEN')
    const { repos, user, lastHistory } = await signedIn()
    const r = await repos.users.unlock('user-admin-f', { resetPin: false })
    expect(r).toMatchObject({ mail: null, user: { status: 'active', lockReason: null } })
    expect(user('user-admin-f').adminLogin).toMatchObject({ failedCount: 0, limitRounds: 0, limitedUntil: null })
    const r2 = await repos.users.unlock('user-member-05', { resetPin: true })
    expect(r2).toMatchObject({ mail: 'sent', user: { pinStatus: 'reset', status: 'active' } })
    expect(lastHistory(2).map((h) => h.action)).toEqual(['unlock', 'pin-reset'])
    expect((await rejects(repos.users.unlock('user-member-05', { resetPin: false }))).code).toBe('CONFLICT')
  })
})

describe('변경 이력 (API-AMB-003, F-AMB-005 · 014)', () => {
  it('최신순 20건씩, 기본 최근 30일, 종류 · 기간 · 검색(대상 이름 · 전체 학번 · 처리자)', async () => {
    const { repos } = await signedIn()
    const page1 = await repos.users.history({})
    expect(page1.pageSize).toBe(20)
    expect(page1.total).toBeGreaterThan(20)
    expect(page1.items.map((h) => h.at)).toEqual([...page1.items.map((h) => h.at)].sort().reverse())
    const { from } = recentRange(NOW)
    expect(page1.items.every((h) => kstDay(h.at) >= from)).toBe(true)
    const wide = await repos.users.history({ from: '2025-01-01', to: '2026-11-01' })
    expect(wide.total).toBeGreaterThan(page1.total)
    expect((await repos.users.history({ kind: 'lock' })).items.every((h) => h.kind === 'lock')).toBe(true)
    expect((await repos.users.history({ q: '2026000113' })).items.map((h) => h.action).sort()).toEqual(['lock', 'unlock'])
    expect((await repos.users.history({ q: '시스템' })).items.every((h) => h.actor.kind === 'system')).toBe(true)
    expect((await repos.users.history({ q: '운영진B · Core' })).items.every((h) => h.actor.name === '운영진B')).toBe(true)
  })

  it('이력은 고치거나 지우는 창구가 없다 (덧붙이기만)', async () => {
    const { repos } = await signedIn()
    const methods = Object.keys(repos.users)
    expect(methods.filter((m) => /history/i.test(m))).toEqual(['history'])
  })
})

describe('다른 구역이 쓰는 입구', () => {
  it('recordUserHistory: 대상 학번을 가려 덧붙이고 남긴 이력을 돌려준다', () => {
    const store = createAdminStore({ now: () => NOW })
    const before = store.get('users').history.length
    const target = store.get('users').users.find((u) => u.id === 'user-member-01')!
    const [h] = recordUserHistory(store, { actor: SYSTEM_ACTOR, target, action: 'bulk-register', detail: '최종 합격자 일괄 등록 (5기)', mail: 'sent' }, new Date(NOW).toISOString())
    expect(h).toMatchObject({ kind: 'add', target: { name: '예시 멤버 01', maskedStudentId: '2026****01' }, mail: 'sent' })
    expect(store.get('users').history.length).toBe(before + 1)
  })

  it('bulkRegisterUsers: General · PIN 대기 · 메일, 같은 학번은 제외, 형식 오류는 실패 (F-ARC-037)', () => {
    const store = createAdminStore({ now: () => NOW })
    const actor = { kind: 'admin' as const, id: 'user-admin-a', name: '운영진A', role: 'Lead' as const }
    const r = bulkRegisterUsers(store, {
      generation: 5,
      actor,
      now: NOW,
      people: [
        { key: 'a1', name: '예시 지원자 01', studentId: '2026000201', email: 'applicant01@example.com', department: '예시학과' },
        { key: 'a2', name: '예시 지원자 02', studentId: '2026000101', email: 'applicant02@example.com' },
        { key: 'a3', name: '예시 지원자 03', studentId: '123', email: 'applicant03@example.com' },
        { key: 'a4', name: '예시 지원자 04', studentId: '2026000201', email: 'applicant04@example.com' },
      ],
    })
    expect(r.registered.map((x) => x.key)).toEqual(['a1'])
    expect(r.skipped.map((x) => x.key)).toEqual(['a2', 'a4'])
    expect(r.failed.map((x) => x.key)).toEqual(['a3'])
    const u = store.get('users').users.find((x) => x.id === r.registered[0].userId)!
    expect(u).toMatchObject({ type: 'General', generation: 5, pinStatus: 'pending', department: '예시학과', loginId: null })
    expect(store.get('users').history.at(-1)).toMatchObject({ action: 'bulk-register', kind: 'add', actor: { name: '운영진A' } })
  })

  it('purgeExpiredUsers: 비활성 1년이 지나면 목록에서 지우고 이력의 이름을 탈퇴한 사용자로 (F-SYS-005)', () => {
    const seed = createUsersSeed({ now: NOW })
    const target = seed.users.find((u) => u.id === 'user-member-11')!
    const later = Date.parse(purgeAtOf(target.deactivatedAt)!)
    expect(purgeExpiredUsers(seed, later - 1).purged).toBe(0)
    const { state, purged } = purgeExpiredUsers(seed, later)
    expect(purged).toBe(1)
    expect(state.users.some((u) => u.id === 'user-member-11')).toBe(false)
    const mine = state.history.filter((h) => h.target.userId === 'user-member-11')
    expect(mine.every((h) => h.target.name === PURGED_NAME && h.target.maskedStudentId === '-')).toBe(true)
    expect(mine.at(-1)).toMatchObject({ action: 'purge', actor: { kind: 'system' } })
  })
})
