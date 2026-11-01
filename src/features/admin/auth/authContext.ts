import { createContext, useContext } from 'react'
import type { AdminMe } from '../data/common/accounts'
import type { PermissionActor } from '../data/permissions'

export interface AdminAuthValue {
  /** loading: 로그인 상태를 확인하는 중 · guest: 로그인 전 · signedIn: 로그인함 */
  status: 'loading' | 'guest' | 'signedIn'
  me: AdminMe | null
  /** 실패하면 AdminRepoError (message 를 그대로 보여 준다) */
  login: (input: { loginId: string; password: string }) => Promise<AdminMe>
  logout: () => Promise<void>
  changePassword: (input: { currentPassword: string; newPassword: string }) => Promise<AdminMe>
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
