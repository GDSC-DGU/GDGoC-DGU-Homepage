import { freshLoginState } from '../common/accounts'
import { AdminRepoError } from '../common/errors'
import { byNewest, matchesQuery, newId, paginate } from '../common/list'
import { isEmail, isStudentId, maskStudentId } from '../common/mask'
import { isoNow, requireActor, respond, type MockContext } from '../common/mockContext'
import type { ActorRef, AdminRole, ManagementType } from '../common/types'
import { canAddUserOfType, isAdminRole, type Decision, type PermissionActor } from '../permissions'
import { appendUserHistory, purgeExpiredUsers, statusChangeDetail, type UserHistoryInput } from './history'
import { mailResultLabel, pinLinkFields, simulatePinMail } from './mail'
import type { UsersRepository } from './repository'
import {
  canChangeStatusTo,
  canChangeTypeTo,
  canOpenEdit,
  canResendPinMail,
  canResetPasswordOf,
  canResetPinOf,
  canUnlockWith,
  GENERATIONS,
  HISTORY_PAGE_SIZE,
  LOGIN_ID_PATTERN,
  purgeAtOf,
  recentRange,
  resendWaitMs,
  USERS_PAGE_SIZE,
} from './rules'
import type { AdminUser, IssuedCredential, UserRow, UsersState } from './types'

export { LOGIN_ID_PATTERN } from './rules'

/** 저장된 사용자 → 목록 한 줄 (서버 응답 모양: 학번 가림 · 비밀번호 상태는 '바꿔야 하는지'만) */
export function toUserRow(u: AdminUser, now: number): UserRow {
  const { studentId, adminLogin, ...rest } = u
  const wait = u.pinStatus === 'set' ? 0 : resendWaitMs(u.pinMailSentAt, now)
  return {
    ...rest,
    maskedStudentId: maskStudentId(studentId),
    pinLinkExpired: u.pinStatus !== 'set' && !!u.pinLinkExpiresAt && Date.parse(u.pinLinkExpiresAt) <= now,
    pinMailRetryAt: wait > 0 ? new Date(now + wait).toISOString() : null,
    mustChangePassword: !!adminLogin?.temporaryPassword,
    purgeAt: u.status === 'inactive' ? purgeAtOf(u.deactivatedAt) : null,
  }
}

const TYPE_ORDER: Record<ManagementType, number> = { Lead: 0, Core: 1, General: 2 }
/** 목록 순서: 관리 유형(Lead → Core → General) → 이름 */
const byTypeThenName = (a: AdminUser, b: AdminUser) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || a.name.localeCompare(b.name, 'ko')

/** 예시 임시 비밀번호 (화면에 한 번 보여 주고 어디에도 저장하지 않는다. 영문 + 숫자 10자) */
function tempPassword(): string {
  const letters = 'abcdefghjkmnpqrstuvwxyz'
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)]
  return `${Array.from({ length: 6 }, () => pick(letters)).join('')}${Math.floor(1000 + Math.random() * 9000)}`
}

const UNLOCKED = { status: 'active' as const, lockedAt: null, lockReason: null, pinFailedCount: 0 }

/**
 * 사용자 예시 저장소 (store 의 users 칸).
 * 권한 · 상태 규칙은 permissions.ts + rules.ts 로 한 번 더 막고, 바꾼 것은 모두 변경 이력에 남긴다.
 * 메일 발송은 흉내만 (mail.ts: 주소가 bounce… 면 실패). 개인정보 자동 삭제(F-SYS-005)는 목록 · 이력을 부를 때 확인한다 (매일 0시 일괄 처리 대신).
 * 주인: 2단계 사용자 담당.
 */
export function createMockUsersRepository(ctx: MockContext): UsersRepository {
  const state = () => ctx.store.get('users')
  const now = () => ctx.now()
  const me = (): { actor: ActorRef; perm: PermissionActor } => {
    const actor = requireActor(ctx)
    if (actor.kind !== 'admin' || !isAdminRole(actor.role)) throw new AdminRepoError('FORBIDDEN', '관리 권한이 없습니다.')
    return { actor, perm: { id: actor.id, role: actor.role as AdminRole } }
  }
  const allow = (d: Decision, code: 'FORBIDDEN' | 'CONFLICT' = 'FORBIDDEN') => {
    if (!d.allowed) throw new AdminRepoError(code, d.reason)
  }
  const find = (id: string) => {
    const u = state().users.find((x) => x.id === id)
    if (!u) throw new AdminRepoError('NOT_FOUND', '사용자를 찾을 수 없습니다. 목록을 새로 불러와 주세요.')
    return u
  }
  const activeLeads = () => state().users.filter((u) => u.type === 'Lead' && u.status === 'active').length
  const loginIdTaken = (loginId: string, exceptId?: string) => state().users.some((u) => u.id !== exceptId && u.loginId?.toLowerCase() === loginId.toLowerCase())
  /** 사용자 한 명을 바꾸고 이력을 같이 남긴다 (한 번에 store 에 쓴다) */
  const commit = (id: string, change: (u: AdminUser) => AdminUser, logs: (next: AdminUser) => UserHistoryInput[]): AdminUser => {
    const next = change(find(id))
    ctx.store.set('users', (s) => appendUserHistory({ ...s, users: s.users.map((u) => (u.id === id ? next : u)) }, logs(next), isoNow(ctx)))
    return next
  }
  /** F-SYS-005 흉내: 비활성화 1년이 지난 사용자의 개인정보 삭제 */
  const sweep = () => {
    const r = purgeExpiredUsers(state(), now())
    if (r.purged) ctx.store.set('users', r.state)
  }
  const fieldErrors = (fields: Record<string, string>) => {
    if (Object.keys(fields).length) throw new AdminRepoError('VALIDATION', '입력한 내용을 확인해 주세요.', { fields })
  }
  const validGeneration = (g: number) => (GENERATIONS as readonly number[]).includes(g)
  const loginIdError = (loginId: string | null, exceptId?: string): string | null => {
    if (!loginId?.trim()) return '아이디를 입력해 주세요.'
    if (!LOGIN_ID_PATTERN.test(loginId)) return '영문 · 숫자 4~20자로 입력해 주세요.'
    if (loginIdTaken(loginId, exceptId)) return '이미 사용 중인 아이디입니다.'
    return null
  }
  /** PIN 초기화로 바뀌는 값: 기존 PIN 무효, 재설정 링크 72시간, 잠겼으면 함께 해제 (F-AMB-012) */
  const pinResetChange = (u: AdminUser, mail: 'sent' | 'failed'): AdminUser => ({
    ...u,
    pinStatus: 'reset',
    ...pinLinkFields(now(), mail),
    ...(u.status === 'locked' ? UNLOCKED : {}),
    adminLogin: u.adminLogin && u.status === 'locked' ? { ...u.adminLogin, failedCount: 0, limitedUntil: null, limitRounds: 0 } : u.adminLogin,
  })

  return {
    list: (query) =>
      respond(() => {
        sweep()
        const users = state().users
        const t = now()
        const counts = { all: users.length, Lead: 0, Core: 0, General: 0 } as Record<'all' | ManagementType, number>
        for (const u of users) counts[u.type]++
        const waiting = users.filter((u) => u.status !== 'inactive' && u.pinStatus !== 'set')
        const rows = users
          .filter((u) => !query.type || u.type === query.type)
          .filter((u) => matchesQuery(query.q, [u.name, u.studentId, u.email, u.loginId]))
          .sort(byTypeThenName)
          .map((u) => toUserRow(u, t))
        return {
          ...paginate(rows, { pageSize: USERS_PAGE_SIZE, ...query }),
          counts,
          activeLeads: activeLeads(),
          pinNotSet: waiting.length,
          pin: {
            pending: waiting.filter((u) => u.pinStatus === 'pending').length,
            reset: waiting.filter((u) => u.pinStatus === 'reset').length,
            expired: waiting.filter((u) => u.pinLinkExpiresAt && Date.parse(u.pinLinkExpiresAt) <= t).length,
            mailFailed: waiting.filter((u) => u.pinMailFailed).length,
          },
        }
      }),

    get: (id) =>
      respond(() => {
        const { perm } = me()
        const u = find(id)
        allow(canOpenEdit(perm, u))
        return { ...toUserRow(u, now()), studentId: u.studentId }
      }),

    setStatus: (ids, status) =>
      respond(() => {
        const { actor, perm } = me()
        const skipped: { userId: string; name: string; reason: string }[] = []
        let changed = 0
        for (const id of ids) {
          const u = find(id)
          if ((status === 'inactive') === (u.status === 'inactive')) {
            skipped.push({ userId: id, name: u.name, reason: status === 'inactive' ? '이미 비활성 상태입니다.' : '비활성 상태가 아닙니다.' })
            continue
          }
          const d = canChangeStatusTo(perm, u, status, activeLeads())
          if (!d.allowed) {
            skipped.push({ userId: id, name: u.name, reason: d.reason })
            continue
          }
          commit(
            id,
            (x) => (status === 'inactive' ? { ...x, status, deactivatedAt: isoNow(ctx), lockedAt: null, lockReason: null } : { ...x, status, deactivatedAt: null }),
            (x) => [{ actor, target: x, action: status === 'inactive' ? 'deactivate' : 'reactivate', detail: statusChangeDetail(status, !!x.loginId) }],
          )
          changed++
        }
        return { changed, skipped }
      }),

    history: (query) =>
      respond(() => {
        sweep()
        const range = recentRange(now())
        const from = query.from || range.from
        const to = query.to || range.to
        const studentIdOf = new Map(state().users.map((u) => [u.id, u.studentId]))
        const rows = state()
          .history.filter((h) => !query.kind || h.kind === query.kind)
          .filter((h) => {
            const day = new Date(Date.parse(h.at) + 9 * 3_600_000).toISOString().slice(0, 10)
            return day >= from && day <= to
          })
          .filter((h) => matchesQuery(query.q, [h.target.name, h.target.maskedStudentId, studentIdOf.get(h.target.userId), h.actor.name, h.actor.kind === 'admin' ? `${h.actor.name} · ${h.actor.role}` : null]))
          .sort(byNewest((h) => h.at))
        return paginate(rows, { ...query, pageSize: HISTORY_PAGE_SIZE })
      }),

    checkLoginId: (loginId) =>
      respond(() => {
        me()
        const error = loginIdError(loginId)
        return error ? { available: false, message: error } : { available: true, message: '사용할 수 있는 아이디입니다.' }
      }),

    create: (input) =>
      respond((): IssuedCredential => {
        const { actor, perm } = me()
        allow(canAddUserOfType(perm, input.type))
        const admin = isAdminRole(input.type)
        const fields: Record<string, string> = {}
        if (!input.name.trim()) fields.name = '이름을 입력해 주세요.'
        if (!input.studentId) fields.studentId = '학번을 입력해 주세요.'
        else if (!isStudentId(input.studentId)) fields.studentId = '학번은 숫자 10자리로 입력해 주세요.'
        if (!input.email.trim()) fields.email = '이메일을 입력해 주세요.'
        else if (!isEmail(input.email)) fields.email = '이메일 형식이 올바르지 않습니다.'
        if (!validGeneration(input.generation)) fields.generation = '기수를 선택해 주세요.'
        const idError = admin ? loginIdError(input.loginId) : null
        if (idError) fields.loginId = idError
        fieldErrors(fields)
        // 학번 중복 (409, F-AMB-006 2)
        if (state().users.some((u) => u.studentId === input.studentId)) throw new AdminRepoError('CONFLICT', '이미 등록된 학번이에요.', { fields: { studentId: '이미 등록된 학번이에요.' } })

        const mail = simulatePinMail(input.email)
        const user: AdminUser = {
          id: newId('user'),
          name: input.name.trim(),
          studentId: input.studentId,
          email: input.email.trim(),
          type: input.type,
          generation: input.generation,
          status: 'active',
          loginId: admin ? input.loginId!.trim() : null,
          adminLogin: admin ? freshLoginState(true) : null,
          pinStatus: 'pending',
          ...pinLinkFields(now(), mail),
          pinFailedCount: 0,
          lockedAt: null,
          lockReason: null,
          deactivatedAt: null,
          department: null,
          created: { by: actor, at: isoNow(ctx) },
        }
        const detail = `사용자 추가 (${user.type} · ${user.generation}기)${admin ? ' · 관리자 아이디 발급 · 임시 비밀번호 발급' : ''} · PIN 설정 링크 ${mailResultLabel(mail)}`
        ctx.store.set('users', (s: UsersState) => appendUserHistory({ ...s, users: [...s.users, user] }, { actor, target: user, action: 'create', detail, mail }, isoNow(ctx)))
        return { user: toUserRow(user, now()), temporaryPassword: admin ? tempPassword() : null, mail }
      }),

    update: (id, input) =>
      respond((): IssuedCredential => {
        const { actor, perm } = me()
        const prev = find(id)
        allow(canOpenEdit(perm, prev))
        const leads = activeLeads()
        allow(canChangeTypeTo(perm, prev, input.type, leads))
        const nextStatus = input.status && input.status !== prev.status && !(prev.status === 'locked' && input.status === 'active') ? input.status : null
        if (nextStatus) allow(canChangeStatusTo(perm, prev, nextStatus, leads))

        const becomesAdmin = isAdminRole(input.type) && !isAdminRole(prev.type)
        const becomesGeneral = input.type === 'General' && isAdminRole(prev.type)
        const fields: Record<string, string> = {}
        if (!input.name.trim()) fields.name = '이름을 입력해 주세요.'
        if (!input.email.trim()) fields.email = '이메일을 입력해 주세요.'
        else if (!isEmail(input.email)) fields.email = '이메일 형식이 올바르지 않습니다.'
        if (!validGeneration(input.generation)) fields.generation = '기수를 선택해 주세요.'
        const idError = becomesAdmin ? loginIdError(input.loginId, id) : null
        if (idError) fields.loginId = idError
        fieldErrors(fields)

        const name = input.name.trim()
        const email = input.email.trim()
        const changed = [name !== prev.name && '이름', email !== prev.email && '이메일', input.generation !== prev.generation && `기수 ${prev.generation}기 → ${input.generation}기`].filter(Boolean) as string[]
        const logs = (x: AdminUser): UserHistoryInput[] => [
          ...(input.type !== prev.type
            ? [{ actor, target: x, action: 'type-change' as const, detail: `${prev.type} → ${input.type}${becomesAdmin ? ' · 관리자 아이디 발급 · 임시 비밀번호 발급' : ''}${becomesGeneral ? ' · 관리자 로그인 계정 비활성' : ''}` }]
            : []),
          ...(changed.length ? [{ actor, target: x, action: 'update' as const, detail: `정보 수정 (${changed.join(' · ')})` }] : []),
          ...(nextStatus === 'inactive' ? [{ actor, target: x, action: 'deactivate' as const, detail: statusChangeDetail('inactive', !!x.loginId) }] : []),
          ...(nextStatus === 'active' ? [{ actor, target: x, action: 'reactivate' as const, detail: statusChangeDetail('active', !!x.loginId) }] : []),
        ]
        if (input.type === prev.type && !changed.length && !nextStatus) return { user: toUserRow(prev, now()), temporaryPassword: null, mail: null }

        const next = commit(
          id,
          (u) => ({
            ...u,
            name,
            email,
            generation: input.generation,
            type: input.type,
            // General 이 되면 관리자 로그인 계정 비활성 (F-AMB-009 3), Lead · Core 가 되면 아이디 · 임시 비밀번호 발급 (2)
            loginId: isAdminRole(input.type) ? (becomesAdmin ? input.loginId!.trim() : u.loginId) : null,
            adminLogin: isAdminRole(input.type) ? (becomesAdmin ? freshLoginState(true) : u.adminLogin) : null,
            ...(nextStatus === 'inactive' ? { status: 'inactive' as const, deactivatedAt: isoNow(ctx), lockedAt: null, lockReason: null } : {}),
            ...(nextStatus === 'active' ? { status: 'active' as const, deactivatedAt: null } : {}),
          }),
          logs,
        )
        return { user: toUserRow(next, now()), temporaryPassword: becomesAdmin ? tempPassword() : null, mail: null }
      }),

    resetPassword: (id) =>
      respond((): IssuedCredential => {
        const { actor, perm } = me()
        allow(canResetPasswordOf(perm, find(id)))
        const next = commit(
          id,
          (u) => ({ ...u, adminLogin: { ...freshLoginState(true), limitRounds: u.adminLogin?.limitRounds ?? 0 } }),
          (x) => [{ actor, target: x, action: 'password-reset', detail: '관리자 비밀번호 초기화 · 임시 비밀번호 발급 (기존 비밀번호 무효)' }],
        )
        return { user: toUserRow(next, now()), temporaryPassword: tempPassword(), mail: null }
      }),

    resetPin: (id) =>
      respond(() => {
        const { actor, perm } = me()
        const prev = find(id)
        allow(canResetPinOf(perm, prev), 'CONFLICT')
        const mail = simulatePinMail(prev.email)
        const next = commit(
          id,
          (u) => pinResetChange(u, mail),
          (x) => [
            { actor, target: x, action: 'pin-reset', detail: `PIN 초기화 · 재설정 링크 ${mailResultLabel(mail)}`, mail },
            ...(prev.status === 'locked' ? [{ actor, target: x, action: 'unlock' as const, detail: '잠금 해제 (PIN 초기화와 함께) · 실패 횟수 0으로 초기화' }] : []),
          ],
        )
        return { user: toUserRow(next, now()), mail }
      }),

    resendPinMail: (id) =>
      respond(() => {
        const { actor } = me()
        const prev = find(id)
        const d = canResendPinMail(prev, now())
        if (!d.allowed) {
          const coolingDown = prev.status !== 'inactive' && prev.pinStatus !== 'set' && resendWaitMs(prev.pinMailSentAt, now()) > 0
          throw new AdminRepoError(coolingDown ? 'RATE_LIMITED' : 'CONFLICT', d.reason)
        }
        const mail = simulatePinMail(prev.email)
        const next = commit(
          id,
          (u) => ({ ...u, ...pinLinkFields(now(), mail) }),
          (x) => [{ actor, target: x, action: 'pin-mail', detail: `${prev.pinStatus === 'reset' ? 'PIN 재설정' : 'PIN 설정'} 링크 재발송 · ${mailResultLabel(mail)}`, mail }],
        )
        return { user: toUserRow(next, now()), mail }
      }),

    unlock: (id, { resetPin }) =>
      respond(() => {
        const { actor, perm } = me()
        const prev = find(id)
        const d = canUnlockWith(perm, prev, resetPin)
        if (!d.allowed) throw new AdminRepoError(prev.status === 'locked' ? 'FORBIDDEN' : 'CONFLICT', d.reason)
        const mail = resetPin ? simulatePinMail(prev.email) : null
        const next = commit(
          id,
          (u) => {
            const unlocked: AdminUser = { ...u, ...UNLOCKED, adminLogin: u.adminLogin ? { ...u.adminLogin, failedCount: 0, limitedUntil: null, limitRounds: 0 } : null }
            return mail ? pinResetChange(unlocked, mail) : unlocked
          },
          (x) => [
            { actor, target: x, action: 'unlock', detail: '잠금 해제 · 실패 횟수 0으로 초기화' },
            ...(mail ? [{ actor, target: x, action: 'pin-reset' as const, detail: `PIN 초기화 (잠금 해제와 함께) · 재설정 링크 ${mailResultLabel(mail)}`, mail }] : []),
          ],
        )
        return { user: toUserRow(next, now()), mail }
      }),
  }
}
