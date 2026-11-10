import { createContext, useContext } from 'react'
import type { PlaceId } from '@/domain/types'

/**
 * 지도 미리보기(홈의 장소 패널)를 열고 닫는 창구.
 * 어떤 장소인지는 CampusState.selected 가 정하고, 여기는 '열려 있는지'만 가진다.
 * 처음 들어왔을 때는 닫혀 있다. 사람이 건물 · 범례 · 검색 결과를 눌렀을 때만 연다.
 *
 * 다른 화면에서 지도 미리보기를 열고 싶으면:
 *   const preview = usePlacePreview(); preview.show('projects', { reveal: true })
 * reveal 은 지도가 화면 밖이면 지도까지 스크롤한다.
 */
export interface PlacePreviewState {
  open: boolean
  /** show(…, { reveal: true }) 를 부를 때마다 1씩 오른다. 지도는 이 값이 바뀌면 화면 안으로 들어온다 */
  reveal: number
}

export interface PlacePreviewApi {
  /** id 를 주면 그 장소를 고르고 연다. 없으면 지금 고른 장소를 연다 */
  show: (id?: PlaceId, opts?: { reveal?: boolean }) => void
  hide: () => void
}

export const PlacePreviewStateContext = createContext<PlacePreviewState>({ open: false, reveal: 0 })
export const PlacePreviewApiContext = createContext<PlacePreviewApi>({ show: () => {}, hide: () => {} })

export const usePlacePreviewState = () => useContext(PlacePreviewStateContext)
export const usePlacePreview = () => useContext(PlacePreviewApiContext)
