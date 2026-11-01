import { beforeAll, describe, expect, it } from 'vitest'
import { safeReturnPath } from '../../auth/returnPath'
import { freshLoginState } from '../common/accounts'
import { AdminRepoError } from '../common/errors'
import { setMockOptions } from '../common/mockContext'
import { createMockAdminRepositories } from '../repositories'
import { createAdminStore, memoryStorage } from '../store'
import { evaluateLogin, LOGIN_MESSAGES, validatePasswordChange } from './loginPolicy'
import { createSessionStore } from './session'

const T0 = Date.parse('2026-11-01T03:00:00Z')

beforeAll(() => setMockOptions({ latency: [0, 0], failureRate: 0 }))

function setup() {
  let now = T0
  const storage = memoryStorage()
  const store = createAdminStore({ storage, now: () => now })
  const session = createSessionStore(storage)
  const repos = createMockAdminRepositories({ store, session, now: () => now })
  return { store, session, repos, tick: (ms: number) => (now += ms), userByLogin: (id: string) => store.get('users').users.find((u) => u.loginId === id)! }
}

const fail = (p: Promise<unknown>) => p.then(
  () => {
    throw new Error('실패해야 하는데 성공했습니다')
  },
  (e: AdminRepoError) => e,
)

describe('로그인 규칙 (F-ACM-001)', () => {
  const active = { status: 'active' as const, adminLogin: freshLoginState() }

  it('없는 아이디 · 틀린 비밀번호는 같은 문장', () => {
    expect(evaluateLogin(undefined, false, T0)).toMatchObject({ kind: 'invalid', message: '아이디 또는 비밀번호가 올바르지 않습니다.' })
    expect(evaluateLogin(active, false, T0)).toMatchObject({ kind: 'invalid', login: { failedCount: 1 } })
  })

  it('비활성 계정은 비밀번호가 맞을 때 비활성 안내', () => {
    expect(evaluateLogin({ ...active, status: 'inactive' }, true, T0)).toEqual({ kind: 'inactive', message: '비활성화된 계정입니다. 관리자에게 문의하세요.' })
  })

  it('5회 연속 틀리면 15분 제한 → 15분 뒤 다시 5회 틀리면 잠김', () => {
    let login = freshLoginState()
    for (let i = 1; i <= 4; i++) login = (evaluateLogin({ status: 'active', adminLogin: login }, false, T0) as { login: typeof login }).login
    const fifth = evaluateLogin({ status: 'active', adminLogin: login }, false, T0)
    expect(fifth.kind).toBe('limited')
    login = (fifth as { login: typeof login }).login
    expect(login).toMatchObject({ failedCount: 0, limitRounds: 1 })
    // 제한 중에는 비밀번호가 맞아도 막힘
    expect(evaluateLogin({ status: 'active', adminLogin: login }, true, T0 + 60_000).kind).toBe('limited')
    // 15분 뒤 다시 5회
    const later = T0 + 15 * 60_000 + 1
    for (let i = 1; i <= 4; i++) login = (evaluateLogin({ status: 'active', adminLogin: login }, false, later) as { login: typeof login }).login
    const locked = evaluateLogin({ status: 'active', adminLogin: login }, false, later)
    expect(locked).toMatchObject({ kind: 'locked', lockNow: true, message: LOGIN_MESSAGES.locked })
  })

  it('성공하면 실패 기록이 지워진다', () => {
    const r = evaluateLogin({ status: 'active', adminLogin: { ...freshLoginState(), failedCount: 3, limitRounds: 1 } }, true, T0)
    expect(r).toEqual({ kind: 'ok', login: freshLoginState() })
  })
})

describe('새 비밀번호 규칙 (F-ACM-002)', () => {
  it('8자 이상 · 영문과 숫자 · 임시 비밀번호와 다름 · 확인 값 일치', () => {
    expect(validatePasswordChange({ current: 'temp1234', next: 'short1', confirm: 'short1' }).next).toBe('8자 이상, 영문과 숫자를 함께 써 주세요.')
    expect(validatePasswordChange({ current: 'temp1234', next: 'onlyletters', confirm: 'onlyletters' }).next).toBeDefined()
    expect(validatePasswordChange({ current: 'temp1234', next: 'temp1234', confirm: 'temp1234' }).next).toBe('임시 비밀번호와 다른 비밀번호를 써 주세요.')
    expect(validatePasswordChange({ current: 'temp1234', next: 'newpass123', confirm: 'newpass124' }).confirm).toBe('비밀번호가 일치하지 않습니다.')
    expect(validatePasswordChange({ current: 'temp1234', next: 'newpass123', confirm: 'newpass123' })).toEqual({})
  })
})

describe('인증 예시 저장소 (API-ACM-001~004)', () => {
  it('예시 계정으로 로그인 → me → 로그아웃. 세션에는 사용자 id 만 남는다', async () => {
    const { repos, session } = setup()
    expect(await repos.auth.me()).toBeNull()
    const me = await repos.auth.login({ loginId: 'lead-a', password: 'example1234' })
    expect(me).toEqual({ id: 'user-admin-a', name: '운영진A', role: 'Lead', loginId: 'lead-a', mustChangePassword: false })
    expect(session.read()).toEqual({ userId: 'user-admin-a', since: T0 })
    expect(JSON.stringify(session.read())).not.toContain('example1234')
    expect(await repos.auth.me()).toMatchObject({ id: 'user-admin-a' })
    await repos.auth.logout()
    expect(await repos.auth.me()).toBeNull()
  })

  it('임시 비밀번호 계정은 비밀번호를 바꿔야 하고, 바꾸면 표시만 남는다', async () => {
    const { repos, userByLogin } = setup()
    expect((await repos.auth.login({ loginId: 'core-c', password: 'temp1234' })).mustChangePassword).toBe(true)
    const wrong = await fail(repos.auth.changePassword({ currentPassword: 'nope', newPassword: 'newpass123' }))
    expect(wrong.fields?.current).toBe('현재 비밀번호가 올바르지 않습니다.')
    const me = await repos.auth.changePassword({ currentPassword: 'temp1234', newPassword: 'newpass123' })
    expect(me.mustChangePassword).toBe(false)
    expect(userByLogin('core-c').adminLogin?.temporaryPassword).toBe(false)
    expect(JSON.stringify(userByLogin('core-c'))).not.toContain('newpass123')
  })

  it('비활성 계정 · 없는 아이디', async () => {
    const { repos } = setup()
    expect((await fail(repos.auth.login({ loginId: 'core-d', password: 'example1234' }))).code).toBe('INACTIVE')
    expect((await fail(repos.auth.login({ loginId: 'nobody', password: 'x' }))).code).toBe('INVALID_CREDENTIALS')
  })

  it('5회 틀리면 15분 제한, 그 뒤 5회 더 틀리면 사용자 관리에서도 잠김으로 보인다', async () => {
    const { repos, tick, userByLogin } = setup()
    for (let i = 0; i < 4; i++) expect((await fail(repos.auth.login({ loginId: 'core-b', password: 'wrong' }))).code).toBe('INVALID_CREDENTIALS')
    expect((await fail(repos.auth.login({ loginId: 'core-b', password: 'wrong' }))).code).toBe('RATE_LIMITED')
    expect((await fail(repos.auth.login({ loginId: 'core-b', password: 'example1234' }))).code).toBe('RATE_LIMITED')
    tick(15 * 60_000 + 1)
    for (let i = 0; i < 4; i++) await fail(repos.auth.login({ loginId: 'core-b', password: 'wrong' }))
    expect((await fail(repos.auth.login({ loginId: 'core-b', password: 'wrong' }))).code).toBe('LOCKED')
    expect(userByLogin('core-b').status).toBe('locked')
    expect((await fail(repos.auth.login({ loginId: 'core-b', password: 'example1234' }))).code).toBe('LOCKED')
  })

  it('다른 Lead 가 잠금을 풀면 다시 로그인할 수 있다 (F-AMB-015)', async () => {
    const { repos, store } = setup()
    store.set('users', (s) => ({ ...s, users: s.users.map((u) => (u.loginId === 'core-b' ? { ...u, status: 'locked' } : u)) }))
    await repos.auth.login({ loginId: 'lead-a', password: 'example1234' })
    await repos.users.unlock('user-admin-b', { resetPin: false })
    await repos.auth.logout()
    expect((await repos.auth.login({ loginId: 'core-b', password: 'example1234' })).role).toBe('Core')
  })

  it("'예시 데이터 처음으로' 뒤에는 임시 비밀번호 상태로 돌아간다", async () => {
    const { repos, store } = setup()
    await repos.auth.login({ loginId: 'core-c', password: 'temp1234' })
    await repos.auth.changePassword({ currentPassword: 'temp1234', newPassword: 'newpass123' })
    store.reset()
    expect((await repos.auth.me())?.mustChangePassword).toBe(true)
  })

  it('로그인 뒤 돌아갈 주소는 관리자 화면 안만', () => {
    expect(safeReturnPath('/admin/users?type=Core')).toBe('/admin/users?type=Core')
    expect(safeReturnPath('/admin')).toBe('/admin')
    expect(safeReturnPath('/admin/login')).toBe('/admin')
    expect(safeReturnPath('https://evil.example')).toBe('/admin')
    expect(safeReturnPath('/projects')).toBe('/admin')
    expect(safeReturnPath(undefined)).toBe('/admin')
  })
})
