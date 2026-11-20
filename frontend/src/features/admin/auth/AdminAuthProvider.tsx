import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, type ReactNode } from 'react'
import { useAuth } from '@/features/auth/authContext'
import { EXAMPLE_ACCOUNTS } from '../data/common/accounts'
import { adminKeys, adminMeKey } from '../data/queryKeys'
import { useAdminRepos } from '../data/useAdminData'
import { AdminAuthContext, type AdminAuthValue } from './authContext'

/** 관리자 화면 예시 데이터에서 '나'로 쓰는 계정 (운영진A). 공개 로그인의 예시 운영진과 같은 사람이다 */
const EXAMPLE_ADMIN = EXAMPLE_ACCOUNTS[0]

/**
 * 관리자 화면의 로그인 상태 (F-AUTH-001 · 007). 따로 로그인하지 않는다: 공개 사이트 로그인(features/auth)을 그대로 쓴다.
 * - 로그인 전 → guest, 일반 회원 → denied, 운영진(ADMIN) → 관리자 화면
 * - 관리자 화면의 데이터는 아직 예시(mock)다. 그래서 운영진이 들어오면 예시 데이터의 운영진A 로 들어가
 *   처리자 기록 · 권한 판단이 예시 데이터 안에서 맞게 돌아간다. 관리자 API 를 붙이면 me 를 서버 응답으로 바꾼다 (docs/ADMIN.md).
 * - 공개 사이트에서 로그아웃하면 예시 관리자 상태와 받아 둔 관리자 데이터도 버린다.
 */
export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const site = useAuth()
  const repos = useAdminRepos()
  const queryClient = useQueryClient()
  // 작성 중에 로그인이 끝난(expired) 운영진도 그 화면에 남긴다 (새 탭에서 다시 로그인하면 이어서 저장)
  const isAdmin = (site.status === 'member' || site.status === 'expired') && site.isAdmin

  const me = useQuery({
    queryKey: adminMeKey,
    enabled: isAdmin,
    retry: false,
    queryFn: async () => (await repos.auth.me()) ?? repos.auth.login({ loginId: EXAMPLE_ADMIN.loginId, password: EXAMPLE_ADMIN.password }),
  })

  // 공개 사이트에서 로그아웃(다른 탭 포함) · 일반 회원으로 바뀜 → 예시 관리자 상태도 끝낸다
  useEffect(() => {
    if (site.status === 'loading' || isAdmin) return
    if (!queryClient.getQueryData(adminMeKey)) return
    void repos.auth.logout().then(() => {
      queryClient.setQueryData(adminMeKey, null)
      queryClient.removeQueries({ queryKey: adminKeys.all })
    })
  }, [site.status, isAdmin, repos, queryClient])

  const value = useMemo<AdminAuthValue>(() => {
    let status: AdminAuthValue['status']
    if (site.status === 'loading') status = 'loading'
    else if (site.status === 'guest') status = 'guest'
    else if (!isAdmin) status = 'denied'
    else if (me.isPending) status = 'loading'
    else status = me.data ? 'signedIn' : 'unavailable'
    return {
      status,
      me: status === 'signedIn' ? (me.data ?? null) : null,
      logout: site.logout,
    }
  }, [site.status, site.logout, isAdmin, me.isPending, me.data])

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}
