import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, type ReactNode } from 'react'
import { adminKeys, adminMeKey } from '../data/queryKeys'
import { useAdminRepos } from '../data/useAdminData'
import { AdminAuthContext, type AdminAuthValue } from './authContext'

/**
 * 로그인 상태 (F-ACM-001 · 002 · 004). repos.auth.me() 로 '누가 로그인했는지'를 한 번 읽고,
 * 로그인 · 로그아웃 · 비밀번호 변경 때 바로 고친다. 실제 서버로 바꿔도 이 파일은 그대로다.
 */
export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const repos = useAdminRepos()
  const queryClient = useQueryClient()
  const me = useQuery({ queryKey: adminMeKey, queryFn: () => repos.auth.me() })

  const value = useMemo<AdminAuthValue>(
    () => ({
      status: me.isPending ? 'loading' : me.data ? 'signedIn' : 'guest',
      me: me.data ?? null,
      login: async (input) => {
        const next = await repos.auth.login(input)
        queryClient.setQueryData(adminMeKey, next)
        return next
      },
      logout: async () => {
        await repos.auth.logout()
        queryClient.setQueryData(adminMeKey, null)
        // 다른 관리자로 다시 들어올 수 있으니 받아 둔 관리자 데이터는 버린다
        queryClient.removeQueries({ queryKey: adminKeys.all })
      },
      changePassword: async (input) => {
        const next = await repos.auth.changePassword(input)
        queryClient.setQueryData(adminMeKey, next)
        return next
      },
    }),
    [me.isPending, me.data, repos, queryClient],
  )

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}
