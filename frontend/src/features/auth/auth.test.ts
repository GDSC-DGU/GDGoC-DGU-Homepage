import { describe, expect, it } from 'vitest'
import { ADMIN_ACCOUNT_SEED, EXAMPLE_ACCOUNTS } from '@/features/admin/data/common/accounts'
import { AuthError, authModeFrom, createExampleAuthApi, createHttpAuthApi, EXAMPLE_MEMBERS, isSignedOutError } from './authApi'
import { isInAppBrowser, loginPath, newerSession, parseSession, REFRESH_EARLY_MS, safeNextPath, sessionTimers, WARN_BEFORE_MS } from './session'

const T0 = Date.parse('2026-11-18T06:00:00Z')
const MIN = 60_000

/** API-AUTH-001 응답 예시 (명세 docs/api/openapi.yaml 과 같은 모양) */
const okBody = (over: Record<string, unknown> = {}) => ({
  success: true,
  data: {
    accessToken: 'access-1',
    tokenType: 'Bearer',
    expiresIn: 900,
    sessionExpiresAt: new Date(T0 + 60 * MIN).toISOString(),
    user: { userId: 'usr_001', name: '예시 멤버 01', role: 'GENERAL' },
    ...over,
  },
})

describe('로그인 응답 읽기', () => {
  it('access 15분 · 로그인 1시간', () => {
    const s = parseSession(okBody(), T0)!
    expect(s.accessExpiresAt).toBe(T0 + 15 * MIN)
    expect(s.sessionExpiresAt).toBe(T0 + 60 * MIN)
    expect(s.user).toEqual({ userId: 'usr_001', name: '예시 멤버 01', role: 'GENERAL' })
  })
  it('access token 은 로그인 최종 만료를 넘지 않는다', () => {
    const s = parseSession(okBody({ sessionExpiresAt: new Date(T0 + 5 * MIN).toISOString() }), T0)!
    expect(s.accessExpiresAt).toBe(T0 + 5 * MIN)
  })
  it('모양이 다르면 null (관리 유형은 ADMIN · GENERAL 만)', () => {
    expect(parseSession({ success: false }, T0)).toBeNull()
    expect(parseSession(okBody({ accessToken: '' }), T0)).toBeNull()
    expect(parseSession(okBody({ tokenType: 'Basic' }), T0)).toBeNull()
    expect(parseSession(okBody({ sessionExpiresAt: 'later' }), T0)).toBeNull()
    expect(parseSession(okBody({ user: { userId: 'u', name: 'n', role: 'Lead' } }), T0)).toBeNull()
  })
})

describe('로그인 시간 (55분 예고 · 1시간 만료 · 갱신)', () => {
  const s = { accessExpiresAt: T0 + 15 * MIN, sessionExpiresAt: T0 + 60 * MIN }
  it('55분에 예고, 60분에 로그아웃, access 끝나기 1분 전에 갱신', () => {
    expect(sessionTimers(s, T0)).toEqual({ refreshIn: 15 * MIN - REFRESH_EARLY_MS, warnIn: 60 * MIN - WARN_BEFORE_MS, endIn: 60 * MIN })
    expect(WARN_BEFORE_MS).toBe(5 * MIN)
  })
  it('지난 시각은 0 (새로고침했더니 이미 55분이 지남 → 바로 예고)', () => {
    expect(sessionTimers(s, T0 + 57 * MIN)).toMatchObject({ warnIn: 0, endIn: 3 * MIN })
  })
  it('access token 이 로그인 끝까지 가면 더 갱신하지 않는다 (연장되지 않음)', () => {
    expect(sessionTimers({ accessExpiresAt: T0 + 60 * MIN, sessionExpiresAt: T0 + 60 * MIN }, T0 + 50 * MIN).refreshIn).toBeNull()
  })
  it('다른 탭이 건넨 것과 내 것 중 더 늦게 끝나는 것', () => {
    const a = { ...parseSession(okBody(), T0)!, accessToken: 'old' }
    const b = { ...a, accessToken: 'new', accessExpiresAt: a.accessExpiresAt + 10 * MIN }
    expect(newerSession(a, b).accessToken).toBe('new')
    expect(newerSession(b, a).accessToken).toBe('new')
    expect(newerSession(null, a)).toBe(a)
  })
})

describe('로그인 뒤 돌아갈 주소', () => {
  it('사이트 안 주소만, 로그인 화면 자신은 홈으로', () => {
    expect(safeNextPath('/teams/write')).toBe('/teams/write')
    expect(safeNextPath('/admin/users?type=Core')).toBe('/admin/users?type=Core')
    expect(safeNextPath('https://evil.example')).toBe('/')
    expect(safeNextPath('//evil.example')).toBe('/')
    expect(safeNextPath('/\\evil.example')).toBe('/')
    expect(safeNextPath('/login?next=/x')).toBe('/')
    expect(safeNextPath('/loginhelp')).toBe('/loginhelp')
    expect(safeNextPath(null)).toBe('/')
  })
  it('로그인 화면 주소', () => {
    expect(loginPath('/')).toBe('/login')
    expect(loginPath('/teams/write')).toBe('/login?next=%2Fteams%2Fwrite')
    expect(loginPath('/admin', { reason: 'expired' })).toBe('/login?next=%2Fadmin&reason=expired')
  })
})

describe('앱 안 브라우저 (외부 브라우저 안내 P-COM-011)', () => {
  it('카카오톡 · 인스타그램 · 네이버 앱 · 안드로이드 WebView', () => {
    expect(isInAppBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.4.5')).toBe(true)
    expect(isInAppBrowser('Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Mobile/15E148 Instagram 312.0.0')).toBe(true)
    expect(isInAppBrowser('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 NAVER(inapp; search; 2000; 12.1.0)')).toBe(true)
    expect(isInAppBrowser('Mozilla/5.0 (Linux; Android 14; SM-S921N; wv) AppleWebKit/537.36 Version/4.0 Chrome/129.0 Mobile Safari/537.36')).toBe(true)
  })
  it('보통 브라우저는 아니다', () => {
    expect(isInAppBrowser('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36')).toBe(false)
    expect(isInAppBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1')).toBe(false)
  })
})

/** 주고받은 요청을 적어 두는 가짜 fetch */
function fakeFetch(reply: (url: string, init: RequestInit) => { status: number; body?: unknown } | Error) {
  const calls: { url: string; init: RequestInit }[] = []
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    calls.push({ url, init: init ?? {} })
    const r = reply(url, init ?? {})
    if (r instanceof Error) throw r
    return new Response(r.body === undefined ? null : JSON.stringify(r.body), { status: r.status, headers: { 'Content-Type': 'application/json' } })
  }) as typeof fetch
  return { fetcher, calls }
}

describe('로그인 방식 (VITE_AUTH)', () => {
  it('VITE_AUTH 가 있으면 그대로 쓴다 (공개 데이터 VITE_DATA_SOURCE 와 따로)', () => {
    expect(authModeFrom({ VITE_AUTH: 'google', VITE_DATA_SOURCE: 'mock' })).toBe('google')
    expect(authModeFrom({ VITE_AUTH: 'example', VITE_DATA_SOURCE: 'http' })).toBe('example')
  })
  it('VITE_AUTH 가 없거나 모르는 값이면 VITE_DATA_SOURCE 를 따른다', () => {
    expect(authModeFrom({ VITE_DATA_SOURCE: 'http' })).toBe('google')
    expect(authModeFrom({ VITE_DATA_SOURCE: 'mock' })).toBe('example')
    expect(authModeFrom({})).toBe('example')
    expect(authModeFrom({ VITE_AUTH: '', VITE_DATA_SOURCE: 'mock' })).toBe('example')
  })
})

describe('로그인 API (VITE_AUTH=google)', () => {
  it('Google ID 토큰을 POST /api/v1/auth/google 로, 쿠키를 주고받게 보낸다', async () => {
    const { fetcher, calls } = fakeFetch(() => ({ status: 200, body: okBody() }))
    const api = createHttpAuthApi('/api', fetcher, () => T0)
    const s = await api.loginWithGoogle('google-id-token')
    expect(s.accessToken).toBe('access-1')
    expect(calls[0].url).toBe('/api/v1/auth/google')
    expect(calls[0].init.method).toBe('POST')
    expect(calls[0].init.credentials).toBe('include')
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ idToken: 'google-id-token' })
  })
  it('갱신 · 로그아웃은 access token 을 Authorization 에 붙인다 (있을 때만)', async () => {
    const { fetcher, calls } = fakeFetch((url) => (url.endsWith('/refresh') ? { status: 200, body: okBody() } : { status: 200, body: { success: true } }))
    const api = createHttpAuthApi('/api', fetcher, () => T0)
    await api.refresh(null)
    await api.logout('access-1')
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBeUndefined()
    expect(calls[1].url).toBe('/api/v1/auth/logout')
    expect((calls[1].init.headers as Record<string, string>).Authorization).toBe('Bearer access-1')
  })
  it('실패 응답의 code · message 를 그대로 (연결 안 된 Google 계정)', async () => {
    const { fetcher } = fakeFetch(() => ({ status: 403, body: { success: false, code: 'GOOGLE_ACCOUNT_NOT_LINKED', message: '연결되지 않은 Google 계정. 초대 링크로 계정 먼저 연결해 주세요.' } }))
    const err = await createHttpAuthApi('/api', fetcher).loginWithGoogle('t').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(AuthError)
    expect(err).toMatchObject({ code: 'GOOGLE_ACCOUNT_NOT_LINKED', status: 403 })
    expect(isSignedOutError(err)).toBe(false)
  })
  it('갱신 401 은 로그인이 없다는 뜻', async () => {
    const { fetcher } = fakeFetch(() => ({ status: 401, body: { success: false, code: 'SESSION_EXPIRED', message: '로그인 시간 만료. 다시 로그인해 주세요.' } }))
    expect(isSignedOutError(await createHttpAuthApi('/api', fetcher).refresh(null).catch((e: unknown) => e))).toBe(true)
  })
  it('서버에 닿지 못하면 NETWORK, 로그아웃은 실패해도 조용히 끝난다', async () => {
    const { fetcher } = fakeFetch(() => new TypeError('Failed to fetch'))
    const api = createHttpAuthApi('/api', fetcher)
    await expect(api.loginWithGoogle('t')).rejects.toMatchObject({ code: 'NETWORK' })
    await expect(api.logout('a')).resolves.toBeUndefined()
  })
  it('응답 모양이 다르면 BAD_RESPONSE', async () => {
    const { fetcher } = fakeFetch(() => ({ status: 200, body: { success: true, data: { token: 'x' } } }))
    await expect(createHttpAuthApi('/api', fetcher).refresh(null)).rejects.toMatchObject({ code: 'BAD_RESPONSE' })
  })
})

function memoryStorage() {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }
}

describe('예시 로그인 (백엔드 없이 보는 화면)', () => {
  it('예시 운영진 · 예시 회원 두 계정', () => {
    expect(EXAMPLE_MEMBERS.map((m) => m.role)).toEqual(['ADMIN', 'GENERAL'])
  })
  it('예시 운영진은 관리자 예시 데이터의 운영진A 와 같은 사람이다', () => {
    const admin = EXAMPLE_MEMBERS.find((m) => m.role === 'ADMIN')!
    expect(admin.userId).toBe(EXAMPLE_ACCOUNTS[0].userId)
    expect(ADMIN_ACCOUNT_SEED.find((u) => u.id === admin.userId)?.name).toBe(admin.name)
  })
  it('새로고침(refresh)해도 이어지고, 1시간이 지나면 끝난다 (연장 없음)', async () => {
    let now = T0
    const storage = memoryStorage()
    const api = createExampleAuthApi(storage, () => now)
    await expect(api.refresh(null)).rejects.toMatchObject({ status: 401 })
    const first = await api.loginAsExample('example-member-01')
    expect(first.sessionExpiresAt).toBe(T0 + 60 * MIN)
    now = T0 + 50 * MIN
    const again = await createExampleAuthApi(storage, () => now).refresh(null)
    expect(again.sessionExpiresAt).toBe(T0 + 60 * MIN)
    expect(again.accessExpiresAt).toBe(T0 + 60 * MIN)
    now = T0 + 61 * MIN
    await expect(api.refresh(null)).rejects.toMatchObject({ code: 'SESSION_EXPIRED' })
  })
  it('로그아웃하면 refresh 도 안 된다', async () => {
    const api = createExampleAuthApi(memoryStorage(), () => T0)
    await api.loginAsExample('user-admin-a')
    await api.logout(null)
    await expect(api.refresh(null)).rejects.toMatchObject({ status: 401 })
  })
  it('없는 계정은 연결되지 않은 계정', async () => {
    await expect(createExampleAuthApi(memoryStorage()).loginAsExample('nobody')).rejects.toMatchObject({ code: 'GOOGLE_ACCOUNT_NOT_LINKED' })
  })
})
