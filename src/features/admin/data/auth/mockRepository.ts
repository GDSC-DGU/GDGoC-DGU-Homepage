import { examplePasswordOf, type AdminMe, type UserCore } from '../common/accounts'
import { AdminRepoError } from '../common/errors'
import { respond, type MockContext } from '../common/mockContext'
import { canUseAdmin, isAdminRole } from '../permissions'
import type { AuthRepository } from './repository'
import { evaluateLogin, validatePasswordChange } from './loginPolicy'
import type { SessionStore } from './session'

export function toAdminMe(u: UserCore): AdminMe | null {
  if (!isAdminRole(u.type) || !u.loginId || !canUseAdmin(u).allowed) return null
  return { id: u.id, name: u.name, role: u.type, loginId: u.loginId, mustChangePassword: !!u.adminLogin?.temporaryPassword }
}

/**
 * 인증 예시 저장소.
 * 입력한 비밀번호는 예시 계정의 예시 비밀번호(common/accounts.ts)와 비교만 하고 어디에도 저장 · 전송하지 않는다.
 * 실패 횟수 · 15분 제한 · 잠김은 store 의 users 칸(사용자의 adminLogin · status)에 남는다:
 * 사용자 관리 화면에서 '잠김'으로 보이고, 다른 Lead 가 잠금 해제하면 풀린다 (F-AMB-015).
 */
export function createMockAuthRepository(ctx: MockContext, session: SessionStore): AuthRepository {
  const users = () => ctx.store.get('users').users
  const findByLoginId = (loginId: string) => users().find((u) => u.loginId?.toLowerCase() === loginId.trim().toLowerCase())
  const current = () => {
    const s = session.read()
    return s ? users().find((u) => u.id === s.userId) : undefined
  }
  const patchUser = (id: string, patch: Partial<UserCore>) => ctx.store.set('users', (st) => ({ ...st, users: st.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) }))

  return {
    login: ({ loginId, password }) =>
      respond(() => {
        const account = findByLoginId(loginId)
        const target = account && isAdminRole(account.type) ? account : undefined
        const expected = target?.loginId ? examplePasswordOf(target.loginId) : undefined
        const outcome = evaluateLogin(target, expected !== undefined && password === expected, ctx.now())
        if (target && 'login' in outcome && outcome.login) patchUser(target.id, { adminLogin: outcome.login, ...(outcome.kind === 'locked' && outcome.lockNow ? { status: 'locked' as const } : {}) })
        switch (outcome.kind) {
          case 'ok': {
            const me = toAdminMe({ ...target!, adminLogin: outcome.login })
            if (!me) throw new AdminRepoError('INVALID_CREDENTIALS', '아이디 또는 비밀번호가 올바르지 않습니다.')
            session.write({ userId: me.id, since: ctx.now() })
            return me
          }
          case 'invalid':
            throw new AdminRepoError('INVALID_CREDENTIALS', outcome.message)
          case 'inactive':
            throw new AdminRepoError('INACTIVE', outcome.message)
          case 'limited':
            throw new AdminRepoError('RATE_LIMITED', outcome.message)
          case 'locked':
            throw new AdminRepoError('LOCKED', outcome.message)
        }
      }),

    changePassword: ({ currentPassword, newPassword }) =>
      respond(() => {
        const u = current()
        if (!u?.loginId || !u.adminLogin) throw new AdminRepoError('UNAUTHORIZED', '로그인이 필요합니다. 다시 로그인해 주세요.')
        if (currentPassword !== examplePasswordOf(u.loginId)) {
          throw new AdminRepoError('VALIDATION', '현재 비밀번호가 올바르지 않습니다.', { fields: { current: '현재 비밀번호가 올바르지 않습니다.' } })
        }
        const errors = validatePasswordChange({ current: currentPassword, next: newPassword, confirm: newPassword })
        if (Object.keys(errors).length) throw new AdminRepoError('VALIDATION', '새 비밀번호를 확인해 주세요.', { fields: errors as Record<string, string> })
        // 새 비밀번호는 저장하지 않는다 (예시 화면): '바꿨다'는 표시만 남긴다
        patchUser(u.id, { adminLogin: { ...u.adminLogin, temporaryPassword: false } })
        return toAdminMe({ ...u, adminLogin: { ...u.adminLogin, temporaryPassword: false } })!
      }),

    me: () =>
      respond(() => {
        const u = current()
        const me = u ? toAdminMe(u) : null
        // 계정이 비활성 · 잠김이 되었거나 '예시 데이터 처음으로'로 사라졌으면 로그아웃
        if (!me) session.clear()
        return me
      }),

    logout: () =>
      respond(() => {
        session.clear()
      }),
  }
}
