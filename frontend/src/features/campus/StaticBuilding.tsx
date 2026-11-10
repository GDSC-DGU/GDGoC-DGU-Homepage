import { memo, type ReactNode } from 'react'
import type { Footprint } from '@/domain/types'
import { Shadow } from './Building'
import { FLOOR } from './geometry'
import { ROOFS } from './roofs'
import { Downpipe, Openings, Shell } from './anatomy/shell'

/**
 * 누를 수 없는 건물 (하위 페이지 머리 장면 · 꼬리말 작은 지도).
 * 홈 지도의 Building 과 같은 조각(그림자 · 받침 · 벽 · 창 · 지붕)을 쓰고, 상태만 바깥에서 받는다.
 * 홈 지도는 이 컴포넌트를 쓰지 않는다 (홈은 Building: 누르기 · 올라오기 · 미리보기).
 */

/** 지금 페이지가 아닌 건물의 지붕 색: 진한 선 색 (꺼진 건물) */
export const QUIET_ROOF = '#c9cdd2'

export interface StaticBuildingProps {
  fp: Footprint
  /** 지붕 · 문틀 색 (장소색 또는 QUIET_ROOF) */
  color: string
  /** 톱니창 불 (프로젝트 랩) */
  live?: boolean
  /** 창 유리 색 (생략하면 낮 유리) */
  glass?: { readonly L: string; readonly R: string }
  door?: 'open' | 'closed'
  /** 창 · 문을 그리지 않는다 (아주 작게 그릴 때) */
  plain?: boolean
  /** 건물 위에 덧그리는 것 (지붕 화면 글자 등) */
  children?: ReactNode
}

export const StaticBuilding = memo(function StaticBuilding({ fp, color, live = false, glass, door, plain = false, children }: StaticBuildingProps) {
  const { x, y, w, d, h } = fp
  const roof = ROOFS[fp.roof]
  const Roof = roof.Component
  return (
    <g>
      <Shadow fp={fp} rise={roof.height} />
      <Shell fp={fp} />
      {!plain && <Openings fp={fp} color={color} glass={glass} door={door} />}
      {!plain && <Downpipe fp={fp} />}
      <Roof fp={fp} color={color} top={FLOOR + h} doorCenter={fp.door === 'L' ? x + w / 2 : y + d / 2} live={live} glass={glass} />
      {children}
    </g>
  )
})
