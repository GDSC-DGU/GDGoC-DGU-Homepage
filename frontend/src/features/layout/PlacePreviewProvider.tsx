import { useMemo, useState, type ReactNode } from 'react'
import { useCampusActions } from '@/state/useCampus'
import { PlacePreviewApiContext, PlacePreviewStateContext, type PlacePreviewApi, type PlacePreviewState } from './placePreview'

/** 머리말의 검색 창과 홈의 지도가 같은 미리보기를 열 수 있게 레이아웃에서 한 번 연다 */
export function PlacePreviewProvider({ children }: { children: ReactNode }) {
  const { select } = useCampusActions()
  const [state, setState] = useState<PlacePreviewState>({ open: false, reveal: 0 })
  const api = useMemo<PlacePreviewApi>(
    () => ({
      show: (id, opts) => {
        if (id) select(id)
        setState((s) => ({ open: true, reveal: opts?.reveal ? s.reveal + 1 : s.reveal }))
      },
      hide: () => setState((s) => (s.open ? { ...s, open: false } : s)),
    }),
    [select],
  )
  return (
    <PlacePreviewApiContext.Provider value={api}>
      <PlacePreviewStateContext.Provider value={state}>{children}</PlacePreviewStateContext.Provider>
    </PlacePreviewApiContext.Provider>
  )
}
