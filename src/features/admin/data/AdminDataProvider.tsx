import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AdminDataContext, type AdminDataValue } from './adminDataContext'
import { createSessionStore } from './auth/session'
import { adminKeys, adminMeKey } from './queryKeys'
import { createMockAdminRepositories } from './repositories'
import { browserSessionStorage, createAdminStore } from './store'

/**
 * 관리자 화면의 데이터 연결 (의존성 주입, 공개 사이트 RepositoryProvider 와 같은 생각).
 * - 지금은 예시 저장소: 메모리 + sessionStorage store 위의 mock repos
 * - store 가 바뀌면 ['admin'] 쿼리를 모두 다시 부른다 → 저장 · 삭제 뒤 목록 · 대시보드가 저절로 새로 그려진다
 * - 서버가 생기면 여기서 createHttpAdminRepositories(...) 로 바꿔 끼운다 (docs/ADMIN.md)
 * 테스트 · 미리보기는 value 로 직접 넣을 수 있다.
 */
export function AdminDataProvider({ value, children }: { value?: AdminDataValue; children: ReactNode }) {
  const queryClient = useQueryClient()
  const [own] = useState(() => {
    // 관리자 쿼리 기본값 (자식 쿼리가 시작하기 전에 정해야 해서 여기서): 예시 데이터는 곧바로 바뀌므로 캐시를 오래 믿지 않고,
    // 실패(권한 · 없음)는 다시 시도하지 않는다
    queryClient.setQueryDefaults(adminKeys.all, { staleTime: 0, retry: false, refetchOnWindowFocus: false })
    queryClient.setQueryDefaults(adminMeKey, { staleTime: Infinity, retry: false, refetchOnWindowFocus: false })
    const storage = browserSessionStorage()
    const store = createAdminStore({ storage })
    const session = createSessionStore(storage)
    return { store, repos: createMockAdminRepositories({ store, session }) }
  })
  const store = value?.store ?? own.store
  const repos = value?.repos ?? own.repos

  useEffect(() => {
    return store.subscribe(() => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.all })
    })
  }, [queryClient, store])

  const ctx = useMemo<AdminDataValue>(
    () =>
      value ?? {
        store,
        repos,
        resetExampleData: async () => {
          store.reset()
          // 계정 상태(임시 비밀번호 · 잠김)도 처음으로 돌아가므로 로그인한 관리자를 다시 읽는다
          await queryClient.invalidateQueries({ queryKey: adminMeKey })
        },
      },
    [value, store, repos, queryClient],
  )

  return <AdminDataContext.Provider value={ctx}>{children}</AdminDataContext.Provider>
}
