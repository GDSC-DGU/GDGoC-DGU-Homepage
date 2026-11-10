import { useContext } from 'react'
import { RepositoryContext } from './repositoryContext'
import type { Repositories } from './repositories'

/** 컴포넌트가 데이터 창구를 꺼내 쓰는 훅. 어떤 구현인지는 RepositoryProvider 가 정한다 */
export function useRepositories(): Repositories {
  const repos = useContext(RepositoryContext)
  if (!repos) throw new Error('RepositoryProvider 안에서만 쓸 수 있습니다')
  return repos
}
