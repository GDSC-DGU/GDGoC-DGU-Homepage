import { memo, useContext } from 'react'
import type { Footprint, Place, PlaceId } from '@/domain/types'
import { shade } from '@/lib/iso'
import { FLOOR, PAD } from './geometry'
import { Poly } from './primitives'
import { PLACE_PANEL_ID } from '@/config/ui'
import { sprintRunning } from '@/features/placehero/look'
import { useToday } from '@/hooks/useToday'
import { ROOFS } from './roofs'
import { Downpipe, Openings, Shell } from './anatomy/shell'
import { NightContext } from './nightContext'
import s from './campus.module.css'

export interface BuildingProps {
  place: Place
  fp: Footprint
  selected: boolean
  hovered: boolean
  /** 검색에 걸림. 표시는 안내판(진한 테두리 + 건수)이 맡고, 건물은 흐려지지만 않는다 */
  hit: boolean
  dim: boolean
  onSelect: (id: PlaceId) => void
  onHover: (id: PlaceId | null) => void
}

/** 땅에 지는 그림자: 빛이 왼쪽 위에서 오므로 오른쪽(+x)으로 눕는다. 건물이 올라와도 그림자는 땅에 남는다 */
export function Shadow({ fp, rise }: { fp: Footprint; rise: number }) {
  const { x, y, w, d, h } = fp
  const L = (h + rise * 0.6) * 0.75
  const x1 = x + w + PAD
  return <Poly className={s.shadow} pts={[[x1, y + 0.2], [x1 + L, y + 0.2 + L * 0.3], [x1 + L, y + d + L * 0.3], [x1, y + d + PAD]]} />
}

export { Openings, type OpeningsProps } from './anatomy/shell'

/**
 * 건물 하나 = 그림자 + 받침 + 몸체(중립색 벽 · 유리 띠 · 문) + 지붕(장소색).
 * 지붕은 fp.roof 값으로 등록부(ROOFS)에서 꺼내 그린다.
 * 마우스를 올리거나 고르면 몸체가 4px 올라온다 (그림자는 땅에 남음).
 * memo: 자기 props 가 바뀔 때만 다시 그린다 (다른 건물을 눌러도 이 건물은 그대로).
 */
export const Building = memo(function Building({ place, fp, selected, hovered, dim, onSelect, onHover }: BuildingProps) {
  const { x, y, w, d, h } = fp
  // 밤: 지붕 · 문틀 장소색을 어둡게 (불 켜진 창(LIT)은 그대로 밝다)
  const night = useContext(NightContext)
  // 불 켜진 창: 이 장소가 작업실(live)이고 실제로 G-Sprint 기간일 때만
  const today = useToday()
  const live = place.live === true && sprintRunning(today)
  const color = night ? shade(place.color, -0.5) : place.color
  const top = FLOOR + h
  const roof = ROOFS[fp.roof]
  const Roof = roof.Component
  const cls = [s.bld, selected && s.sel, hovered && s.hov, dim && s.dim].filter(Boolean).join(' ')

  return (
    <g
      className={cls}
      data-place={place.id}
      tabIndex={0}
      role="button"
      aria-label={`${place.label} 미리보기 열기`}
      aria-current={selected ? 'true' : undefined}
      aria-controls={PLACE_PANEL_ID}
      onClick={() => onSelect(place.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(place.id)
        }
      }}
      onMouseEnter={() => onHover(place.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(place.id)}
      onBlur={() => onHover(null)}
    >
      <Shadow fp={fp} rise={roof.height} />
      <g className={s.lift}>
        <Shell fp={fp} />
        <Openings fp={fp} color={color} />
        <Downpipe fp={fp} />
        <Roof fp={fp} color={color} top={top} doorCenter={fp.door === 'L' ? x + w / 2 : y + d / 2} live={live} />
      </g>
    </g>
  )
})
