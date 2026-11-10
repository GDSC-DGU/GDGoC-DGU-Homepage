import { DEFAULT_PLACE } from '@/config/places'
import type { PlaceId } from '@/domain/types'

/**
 * 지도 · 메뉴 · 미리보기 패널 · 검색이 같이 보는 상태.
 * 어디서 바꾸든(건물 클릭, 메뉴 호버, 검색) 같은 곳을 고치므로 서로 어긋나지 않는다.
 */
export interface CampusState {
  selected: PlaceId
  hovered: PlaceId | null
  /** 검색 결과 장소별 건수. null 이면 검색 중 아님 */
  hits: Partial<Record<PlaceId, number>> | null
}

export type CampusAction =
  | { type: 'select'; id: PlaceId }
  | { type: 'hover'; id: PlaceId | null }
  | { type: 'hits'; hits: CampusState['hits'] }

export const initialCampusState: CampusState = { selected: DEFAULT_PLACE, hovered: null, hits: null }

/** 순수 함수라 화면 없이 테스트할 수 있다. 값이 같으면 같은 객체를 돌려줘서 리렌더를 막는다 */
export function campusReducer(state: CampusState, action: CampusAction): CampusState {
  switch (action.type) {
    case 'select':
      return state.selected === action.id ? state : { ...state, selected: action.id }
    case 'hover':
      return state.hovered === action.id ? state : { ...state, hovered: action.id }
    case 'hits':
      return { ...state, hits: action.hits }
  }
}
