import { createContext } from 'react'
import type { AdminRepositories } from './repositories'
import type { AdminStore } from './store'

export interface AdminDataValue {
  repos: AdminRepositories
  /** 예시 데이터 store. 화면은 보통 repos 를 쓰고, store 는 '처음으로' · 개발 도구에서만 */
  store: AdminStore
  /** '예시 데이터 처음으로': seed 로 되돌리고 모든 관리자 쿼리를 다시 부른다 (로그인은 유지) */
  resetExampleData: () => Promise<void>
}

export const AdminDataContext = createContext<AdminDataValue | null>(null)
