import { createContext, useContext } from 'react'
import type { AdminMe } from '../data/common/accounts'
import type { PermissionActor } from '../data/permissions'

export interface AdminAuthValue {
  /**
   * loading: 로그인 · 예시 관리자 계정을 확인하는 중
   * guest: 로그인 전 (공개 로그인 화면으로 보낸다)
   * denied: 로그인했지만 일반 회원(GENERAL) (F-AUTH-007 예외 1: 안내 후 홈으로)
   * unavailable: 운영진인데 예시 관리자 계정을 쓸 수 없음 (예시 데이터에서 비활성 등)
   * signedIn: 관리자 화면을 쓸 수 있음
   */
  status: 'loading' | 'guest' | 'denied' | 'unavailable' | 'signedIn'
  me: AdminMe | null
  /** 로그아웃 (공개 사이트와 함께 로그아웃하고 홈으로) */
  logout: () => Promise<void>
}

export const AdminAuthContext = createContext<AdminAuthValue | null>(null)

export function useAdminAuth(): AdminAuthValue {
  const v = useContext(AdminAuthContext)
  if (!v) throw new Error('AdminAuthProvider 안에서만 쓸 수 있습니다')
  return v
}

/** 로그인한 관리자 (관리자 틀 안에서만: 로그인하지 않았으면 틀이 로그인 화면으로 보낸다) */
export function useAdminMe(): AdminMe {
  const { me } = useAdminAuth()
  if (!me) throw new Error('로그인한 관리자 화면 안에서만 쓸 수 있습니다')
  return me
}

/**
 * 권한 함수에 넘길 '나'. 버튼 · 메뉴를 숨기거나 막을 때:
 *   const actor = useAdminActor()
 *   const d = canEditUser(actor, user)
 */
export function useAdminActor(): PermissionActor {
  const me = useAdminMe()
  return { id: me.id, role: me.role }
}
