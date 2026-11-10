import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMemo, useState, type ReactNode } from 'react'
import { createHttpRepositories } from './http/httpRepositories'
import { createSnapshotRepositories } from './snapshot/snapshotRepositories'
import { RepositoryContext } from './repositoryContext'
import type { Repositories } from './repositories'

/**
 * 어떤 데이터 구현을 쓸지 한 곳에서 정한다 (의존성 주입).
 * .env 에 VITE_DATA_SOURCE=http 를 넣으면 Spring Boot API 를, 아니면 저장소의 JSON 스냅샷(src/content)을 쓴다.
 * 테스트에서는 value 로 가짜 구현을 직접 넣을 수 있다.
 * 서버 데이터 캐시(TanStack Query)도 여기서 같이 연다.
 */
export function RepositoryProvider({ value, children }: { value?: Repositories; children: ReactNode }) {
  const repos = useMemo(
    () =>
      value ??
      (import.meta.env.VITE_DATA_SOURCE === 'http'
        ? createHttpRepositories(import.meta.env.VITE_API_BASE ?? '/api')
        : createSnapshotRepositories()),
    [value],
  )
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          // 동아리 일정 · 글은 자주 바뀌지 않는다. 5분 동안은 다시 부르지 않는다
          queries: { staleTime: 5 * 60_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  )
  return (
    <QueryClientProvider client={queryClient}>
      <RepositoryContext.Provider value={repos}>{children}</RepositoryContext.Provider>
    </QueryClientProvider>
  )
}
