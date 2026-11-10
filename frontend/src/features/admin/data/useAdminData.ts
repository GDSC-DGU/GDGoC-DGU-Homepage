import { useContext, useSyncExternalStore } from 'react'
import { AdminDataContext, type AdminDataValue } from './adminDataContext'
import type { AdminRepositories } from './repositories'
import type { AdminData } from './store'

function useAdminData(): AdminDataValue {
  const v = useContext(AdminDataContext)
  if (!v) throw new Error('AdminDataProvider 안에서만 쓸 수 있습니다')
  return v
}

/** 관리자 데이터 창구 (구역별 Repository). 화면은 이것으로 읽고 쓴다 */
export function useAdminRepos(): AdminRepositories {
  return useAdminData().repos
}

/** '예시 데이터 처음으로' */
export function useResetExampleData(): () => Promise<void> {
  return useAdminData().resetExampleData
}

/**
 * store 를 직접 구독 (개발 도구 · 예시 표시용). 화면 데이터는 repos + useQuery 로 읽는 것이 원칙이다
 * (서버로 바꿔도 화면 코드가 그대로이도록). select 는 같은 값이면 같은 참조를 돌려줘야 한다.
 */
export function useAdminSnapshot<T>(select: (data: AdminData) => T): T {
  const { store } = useAdminData()
  return useSyncExternalStore(store.subscribe, () => select(store.snapshot()))
}
