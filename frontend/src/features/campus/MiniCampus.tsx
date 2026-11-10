import { memo, useMemo } from 'react'
import { PLACES } from '@/config/places'
import type { PlaceId } from '@/domain/types'
import { depthOfBox, depthOfPoint, iso } from '@/lib/iso'
import { FLAG_BASE, FLAG_CLOTH, FLAG_POLE } from './geometry'
import { Ground } from './Ground'
import { FLAG_AT } from './layout'
import { sceneryItems, type SceneItem } from './scenery'
import { QUIET_ROOF, StaticBuilding } from './StaticBuilding'
import s from './campus.module.css'

/** 건물 넷 + 광장이 들어가는 자리 (SVG 좌표). 가장자리는 CSS 마스크로 녹이므로 둘레를 넉넉히 둔다 */
const VIEW = { x: -480, y: -110, w: 960, h: 580 } as const

/** 꼬리말용 작은 깃발 (누를 수 없음, 올라가는 연출 없음) */
function MiniFlag({ on }: { on: boolean }) {
  const [bx, by] = iso(FLAG_AT[0], FLAG_AT[1], FLAG_BASE)
  const top = by - FLAG_POLE
  const len = FLAG_CLOTH.len * 32
  const ch = FLAG_CLOTH.h * 32
  const c0 = top + 3
  const cloth = [
    [bx + 1, c0],
    [bx + 1 + len, c0 - len / 2],
    [bx + 1 + len, c0 - len / 2 + ch],
    [bx + 1, c0 + ch],
  ]
    .map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`)
    .join(' ')
  return (
    <g>
      <line className={s.pole} x1={bx} y1={by} x2={bx} y2={top - 2} />
      <polygon points={cloth} className={on ? s.cloth : undefined} fill={on ? undefined : QUIET_ROOF} />
    </g>
  )
}

/**
 * 꼬리말 '지금 여기' 작은 지도. 홈 지도와 같은 땅 · 나무 · 건물을 아주 작게.
 * here = 'all'(홈): 모두 장소색, 장소 id: 그 건물만 장소색, null: 모두 중립색.
 * 꾸밈이라 aria-hidden: 같은 메뉴를 옆 목록(aria-current)이 글로 준다.
 */
export const MiniCampus = memo(function MiniCampus({ here, className = '' }: { here: PlaceId | 'all' | null; className?: string }) {
  const items = useMemo<SceneItem[]>(() => {
    const list = sceneryItems()
    for (const p of PLACES) {
      const on = here === 'all' || here === p.id
      if (!p.footprint) {
        list.push({ key: p.id, depth: depthOfPoint(FLAG_AT[0], FLAG_AT[1]) + 0.4, node: <MiniFlag on={on} /> })
        continue
      }
      const fp = p.footprint
      list.push({ key: p.id, depth: depthOfBox(fp.x, fp.y, fp.w, fp.d), node: <StaticBuilding fp={fp} color={on ? p.color : QUIET_ROOF} /> })
    }
    return list.sort((a, b) => a.depth - b.depth)
  }, [here])
  return (
    <svg className={`campus-iso ${className}`} viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`} aria-hidden="true" focusable="false">
      <Ground />
      {items.map((it) => (
        <g key={it.key}>{it.node}</g>
      ))}
    </svg>
  )
})
