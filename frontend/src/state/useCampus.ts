import { useContext, useMemo } from 'react'
import type { PlaceId } from '@/domain/types'
import { CampusDispatchContext, CampusStateContext } from './campusContext'
import type { CampusState } from './campusReducer'

export const useCampus = () => useContext(CampusStateContext)

/** 상태를 바꾸는 함수만 필요한 컴포넌트는 이걸 쓴다 */
export function useCampusActions() {
  const dispatch = useContext(CampusDispatchContext)
  return useMemo(
    () => ({
      select: (id: PlaceId) => dispatch({ type: 'select', id }),
      hover: (id: PlaceId | null) => dispatch({ type: 'hover', id }),
      setHits: (hits: CampusState['hits']) => dispatch({ type: 'hits', hits }),
    }),
    [dispatch],
  )
}
