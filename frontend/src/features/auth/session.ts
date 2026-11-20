import type { AuthSession, AuthUser, MemberRole } from './types'

/** 로그인 끝나기 이만큼 전에 '5분 뒤 로그아웃돼요.'를 띄운다 (F-AUTH-001 규칙 5: 55분) */
export const WARN_BEFORE_MS = 5 * 60_000
/** access token 이 끝나기 이만큼 전에 새로 받는다 (요청 도중에 끝나지 않게) */
export const REFRESH_EARLY_MS = 60_000

export const SESSION_WARNING = '5분 뒤 로그아웃돼요.'
export const SESSION_EXPIRED = '로그인 시간(1시간)이 끝나 로그아웃했어요. 다시 로그인해 주세요.'
export const ADMIN_ONLY = '운영진만 쓸 수 있는 페이지예요.'
/** 서버 오류 · 연결 실패 (F-COM-003 일시적 오류 문구) */
export const TEMPORARY_ERROR = '일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요.'

const ROLES: readonly MemberRole[] = ['ADMIN', 'GENERAL']

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

function toUser(v: unknown): AuthUser | null {
  if (!isRecord(v)) return null
  const { userId, name, role } = v
  if (typeof userId !== 'string' || !userId || typeof name !== 'string' || !ROLES.includes(role as MemberRole)) return null
  return { userId, name, role: role as MemberRole }
}

/**
 * 로그인 · 갱신 응답 → AuthSession. 모양이 다르면 null (화면에서 '일시적인 오류'로 처리).
 * { success: true, data: { accessToken, tokenType: 'Bearer', expiresIn(초), sessionExpiresAt(ISO), user } }
 * access token 은 로그인 최종 만료를 넘지 않는다 (서버가 expiresIn 을 줄여 주지만 한 번 더 막는다).
 */
export function parseSession(body: unknown, now: number): AuthSession | null {
  if (!isRecord(body) || body.success !== true || !isRecord(body.data)) return null
  const { accessToken, tokenType, expiresIn, sessionExpiresAt, user } = body.data
  const end = typeof sessionExpiresAt === 'string' ? Date.parse(sessionExpiresAt) : NaN
  const u = toUser(user)
  if (typeof accessToken !== 'string' || !accessToken || (tokenType !== undefined && tokenType !== 'Bearer')) return null
  if (typeof expiresIn !== 'number' || !(expiresIn > 0) || !Number.isFinite(end) || !u) return null
  return { accessToken, accessExpiresAt: Math.min(now + expiresIn * 1000, end), sessionExpiresAt: end, user: u }
}

/**
 * 지금부터 몇 밀리초 뒤에 무엇을 할지.
 * - refreshIn: access token 을 새로 받을 때 (로그인 끝까지 지금 token 으로 버티면 null)
 * - warnIn: '5분 뒤 로그아웃돼요.' (이미 지났으면 0)
 * - endIn: 로그아웃 (이미 지났으면 0)
 */
export function sessionTimers(s: Pick<AuthSession, 'accessExpiresAt' | 'sessionExpiresAt'>, now: number) {
  const endIn = Math.max(0, s.sessionExpiresAt - now)
  const warnIn = Math.max(0, s.sessionExpiresAt - WARN_BEFORE_MS - now)
  const needsRefresh = s.accessExpiresAt < s.sessionExpiresAt
  const refreshIn = needsRefresh ? Math.max(0, s.accessExpiresAt - REFRESH_EARLY_MS - now) : null
  return { refreshIn, warnIn, endIn }
}

/** 둘 중 더 늦게 끝나는(새로 받은) 로그인 정보 */
export const newerSession = (a: AuthSession | null, b: AuthSession): AuthSession => (a && a.accessExpiresAt > b.accessExpiresAt ? a : b)

/**
 * 로그인 뒤 돌아갈 주소: 이 사이트 안의 주소만 (바깥 주소 · //host · 로그인 화면 자신은 홈으로).
 * 관리자 주소(/admin…)도 된다: 로그인하고 관리자 화면으로 돌아간다.
 */
export function safeNextPath(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return '/'
  if (/^\/login(\/|\?|#|$)/.test(raw)) return '/'
  return raw
}

/** 로그인 화면 주소. 보던 페이지(next)로 돌아오게 붙인다 (홈이면 생략) */
export function loginPath(next = '/', extra: Record<string, string> = {}): string {
  const q = new URLSearchParams()
  const target = safeNextPath(next)
  if (target !== '/') q.set('next', target)
  for (const [k, v] of Object.entries(extra)) q.set(k, v)
  const qs = q.toString()
  return qs ? `/login?${qs}` : '/login'
}

/**
 * 앱 안 브라우저(카카오톡 · 인스타그램 · 네이버 앱 등)인지. 이런 곳에서는 Google 이 로그인을 막는다
 * (Google 정책: 내장 WebView 로그인 차단). 그럴 때 로그인 화면은 외부 브라우저 안내(P-COM-011)를 보여 준다.
 */
export function isInAppBrowser(ua: string): boolean {
  return /KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|FB_IAB|\bLine\/|DaumApps|everytimeApp|; wv\)/i.test(ua)
}
