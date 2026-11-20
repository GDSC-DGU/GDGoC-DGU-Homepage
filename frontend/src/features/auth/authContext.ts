import { createContext, useContext, useEffect } from 'react'
import type { AuthSession, AuthUser, ExampleMember } from './types'

export interface AuthValue {
  /**
   * loading: 새로고침 뒤 로그인을 되찾는 중 · guest: 로그인 전 · member: 로그인함
   * expired: 작성 중에 1시간이 끝남. 토큰은 없고(저장은 실패) user 는 남겨 둔다. 다시 로그인하면 member
   */
  status: 'loading' | 'guest' | 'member' | 'expired'
  user: AuthUser | null
  /** 운영진(ADMIN)이면 true: 머리말에 '관리자 페이지' 버튼, /admin 에 들어갈 수 있다 */
  isAdmin: boolean
  /** google: Google 로그인 버튼 · example: 예시 계정 버튼 */
  mode: 'google' | 'example'
  examples: readonly ExampleMember[]
  /** 실패하면 AuthError (message 를 그대로 보여 준다) */
  loginWithGoogle: (idToken: string) => Promise<AuthSession>
  loginAsExample: (userId: string) => Promise<AuthSession>
  /** 로그아웃하고 홈으로 (F-COM-001 동작 6) */
  logout: () => Promise<void>
  /** API 를 부를 때 Authorization: Bearer 에 붙일 값 (로그인 전이면 null). 저장하지 말고 부를 때마다 읽는다 */
  getAccessToken: () => string | null
  /** 화면 아래 짧은 안내 한 줄 (몇 초 뒤 사라진다) */
  notify: (text: string) => void
  /** 작성 중인 화면이 '로그인이 끝나도 이 화면에 남기'를 건다. 돌려받은 함수로 푼다 */
  holdOnExpiry: () => () => void
}

export const AuthContext = createContext<AuthValue | null>(null)

export function useAuth(): AuthValue {
  const v = useContext(AuthContext)
  if (!v) throw new Error('AuthProvider 안에서만 쓸 수 있습니다')
  return v
}

/**
 * 작성 중(active)인 동안 로그인 1시간이 끝나도 로그인 화면으로 옮기지 않는다 (F-AUTH-001 규칙 6 · F-BRD-003 규칙 7).
 * 대신 '새 탭에서 다시 로그인하면 이어서 저장할 수 있어요.' 안내를 띄운다. 새 탭에서 로그인하면 이 탭도 같이 로그인된다.
 */
export function useHoldOnExpiry(active: boolean) {
  const { holdOnExpiry } = useAuth()
  useEffect(() => (active ? holdOnExpiry() : undefined), [active, holdOnExpiry])
}
