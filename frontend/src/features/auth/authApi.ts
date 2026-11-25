import { parseSession, TEMPORARY_ERROR } from './session'
import type { AuthSession, ExampleMember } from './types'

/**
 * 로그인 API 실패. code 는 서버 오류 코드 (INVALID_GOOGLE_TOKEN · GOOGLE_ACCOUNT_NOT_LINKED · USER_INACTIVE ·
 * SESSION_EXPIRED · SESSION_REVOKED …), 서버에 닿지 못하면 NETWORK. message 는 그대로 화면에 보여 준다.
 */
export class AuthError extends Error {
  readonly code: string
  readonly status: number
  constructor(code: string, message: string, status = 0) {
    super(message)
    this.name = 'AuthError'
    this.code = code
    this.status = status
  }
}

/** 로그인이 없다는 뜻의 실패 (refresh token 없음 · 만료 · 무효): 조용히 '로그인 전'으로 둔다 */
export const isSignedOutError = (e: unknown): boolean => e instanceof AuthError && e.status === 401

export interface AuthApi {
  /** google: Google 로그인 버튼 · example: 예시 계정 버튼 (백엔드 없이 보는 화면) */
  readonly mode: 'google' | 'example'
  readonly examples: readonly ExampleMember[]
  /** Google ID 토큰을 서버에 보내 로그인 (API-AUTH-001) */
  loginWithGoogle(idToken: string): Promise<AuthSession>
  /** 예시 계정으로 로그인 (example 에서만) */
  loginAsExample(userId: string): Promise<AuthSession>
  /** refresh token 쿠키로 access token 을 새로 받는다 (API-AUTH-002). 로그인이 없으면 401 AuthError */
  refresh(accessToken: string | null): Promise<AuthSession>
  /** 로그아웃 (API-AUTH-003). 실패해도 화면은 로그아웃한다 */
  logout(accessToken: string | null): Promise<void>
}

type Fetcher = typeof fetch

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json()
  } catch {
    return null
  }
}

/** 실패 응답 { success: false, code, message } → AuthError */
async function toError(res: Response): Promise<AuthError> {
  const body = await readJson(res)
  const code = typeof (body as { code?: unknown })?.code === 'string' ? (body as { code: string }).code : `HTTP_${res.status}`
  const message = typeof (body as { message?: unknown })?.message === 'string' && (body as { message: string }).message ? (body as { message: string }).message : TEMPORARY_ERROR
  return new AuthError(code, message, res.status)
}

/**
 * Spring Boot API (VITE_AUTH=google, 또는 VITE_AUTH 없이 VITE_DATA_SOURCE=http).
 * credentials: 'include' 로 refresh token 쿠키(HttpOnly, Path=/api/v1/auth)를 주고받는다.
 * 프론트와 API 가 같은 사이트(같은 도메인 또는 /api 를 넘겨 주는 주소)여야 쿠키(SameSite=Lax)가 붙는다.
 */
export function createHttpAuthApi(base = '/api', fetcher: Fetcher = (...args) => fetch(...args), now: () => number = Date.now): AuthApi {
  const post = async (path: string, init: { body?: unknown; accessToken?: string | null } = {}): Promise<Response> => {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (init.body !== undefined) headers['Content-Type'] = 'application/json'
    if (init.accessToken) headers.Authorization = `Bearer ${init.accessToken}`
    try {
      return await fetcher(`${base}${path}`, {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers,
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
      })
    } catch {
      throw new AuthError('NETWORK', TEMPORARY_ERROR)
    }
  }

  const sessionFrom = async (res: Response): Promise<AuthSession> => {
    if (!res.ok) throw await toError(res)
    const s = parseSession(await readJson(res), now())
    if (!s) throw new AuthError('BAD_RESPONSE', TEMPORARY_ERROR, res.status)
    return s
  }

  return {
    mode: 'google',
    examples: [],
    loginWithGoogle: async (idToken) => sessionFrom(await post('/v1/auth/google', { body: { idToken } })),
    loginAsExample: () => Promise.reject(new AuthError('NOT_EXAMPLE', '예시 계정은 예시 화면에서만 쓸 수 있습니다.')),
    refresh: async (accessToken) => sessionFrom(await post('/v1/auth/refresh', { accessToken })),
    logout: async (accessToken) => {
      try {
        await post('/v1/auth/logout', { accessToken })
      } catch {
        // 서버에 닿지 못해도 화면은 로그아웃한다 (refresh token 은 1시간 뒤 서버에서 끝난다)
      }
    },
  }
}

/** 예시 계정. 운영진A 는 관리자 화면 예시 데이터(features/admin/data/common/accounts.ts)의 운영진A 와 같은 사람이다 */
export const EXAMPLE_MEMBERS: readonly ExampleMember[] = [
  { userId: 'user-admin-a', name: '운영진A', role: 'ADMIN', button: '예시 운영진으로 로그인', note: '운영진A · 관리자 페이지까지' },
  { userId: 'example-member-01', name: '예시 멤버 01', role: 'GENERAL', button: '예시 회원으로 로그인', note: '예시 멤버 01 · 일반 회원' },
]

export const EXAMPLE_LOGIN_KEY = 'gdgoc-example-login'
const ACCESS_MS = 15 * 60_000
const SESSION_MS = 60 * 60_000

interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function safeLocalStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

/**
 * 예시 로그인 (백엔드 없이 보는 화면 · 테스트). 서버의 refresh token 쿠키 대신 브라우저 저장소에
 * '누가 언제까지 로그인했는지'만 둔다 (탭끼리 같이 쓰는 쿠키처럼). 비밀값은 없다.
 * 규칙(access 15분 · 로그인 1시간 · 연장 없음)은 서버와 같게 흉내 낸다.
 */
export function createExampleAuthApi(storage: StorageLike | null = safeLocalStorage(), now: () => number = Date.now): AuthApi {
  let memory: string | null = null
  const read = (): { userId: string; sessionExpiresAt: number } | null => {
    let raw = memory
    try {
      raw = storage ? storage.getItem(EXAMPLE_LOGIN_KEY) : memory
    } catch {
      // 저장소를 못 쓰면 메모리만
    }
    if (!raw) return null
    try {
      const v = JSON.parse(raw) as { userId?: unknown; sessionExpiresAt?: unknown }
      return typeof v.userId === 'string' && typeof v.sessionExpiresAt === 'number' ? { userId: v.userId, sessionExpiresAt: v.sessionExpiresAt } : null
    } catch {
      return null
    }
  }
  const write = (v: { userId: string; sessionExpiresAt: number } | null) => {
    memory = v ? JSON.stringify(v) : null
    try {
      if (v) storage?.setItem(EXAMPLE_LOGIN_KEY, memory!)
      else storage?.removeItem(EXAMPLE_LOGIN_KEY)
    } catch {
      // 무시
    }
  }
  const issue = (member: ExampleMember, sessionExpiresAt: number): AuthSession => {
    const t = now()
    return {
      accessToken: `example-${member.userId}-${t}`,
      accessExpiresAt: Math.min(t + ACCESS_MS, sessionExpiresAt),
      sessionExpiresAt,
      user: { userId: member.userId, name: member.name, role: member.role },
    }
  }

  return {
    mode: 'example',
    examples: EXAMPLE_MEMBERS,
    loginWithGoogle: () => Promise.reject(new AuthError('NOT_GOOGLE', '예시 화면에서는 예시 계정으로 로그인합니다.')),
    loginAsExample: async (userId) => {
      const member = EXAMPLE_MEMBERS.find((m) => m.userId === userId)
      if (!member) throw new AuthError('GOOGLE_ACCOUNT_NOT_LINKED', '연결되지 않은 Google 계정. 초대 링크로 계정 먼저 연결해 주세요.', 403)
      const end = now() + SESSION_MS
      write({ userId, sessionExpiresAt: end })
      return issue(member, end)
    },
    refresh: async () => {
      const saved = read()
      const member = saved && EXAMPLE_MEMBERS.find((m) => m.userId === saved.userId)
      if (!saved || !member) throw new AuthError('REFRESH_TOKEN_REQUIRED', '다시 로그인해 주세요.', 401)
      if (saved.sessionExpiresAt <= now()) {
        write(null)
        throw new AuthError('SESSION_EXPIRED', '로그인 시간 만료. 다시 로그인해 주세요.', 401)
      }
      return issue(member, saved.sessionExpiresAt)
    },
    logout: async () => {
      write(null)
    },
  }
}

/**
 * 로그인 방식 정하기. 로그인만 실제 서버로 돌리고 공개 사이트 데이터는 예시로 둘 수 있게 VITE_DATA_SOURCE 와 따로 둔다.
 * - VITE_AUTH=google : 실제 Google 로그인 (백엔드 /api/v1/auth)
 * - VITE_AUTH=example : 예시 계정 로그인
 * - 비어 있으면 VITE_DATA_SOURCE 를 따른다 (http → google, 그 밖 → example)
 */
export function authModeFrom(env: { VITE_AUTH?: string; VITE_DATA_SOURCE?: string }): AuthApi['mode'] {
  if (env.VITE_AUTH === 'google' || env.VITE_AUTH === 'example') return env.VITE_AUTH
  return env.VITE_DATA_SOURCE === 'http' ? 'google' : 'example'
}

export function createAuthApi(): AuthApi {
  return authModeFrom(import.meta.env) === 'google' ? createHttpAuthApi(import.meta.env.VITE_API_BASE ?? '/api') : createExampleAuthApi()
}
