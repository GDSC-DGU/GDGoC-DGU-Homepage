import { memo } from 'react'
import { PLACES } from '@/config/places'
import { entryPath } from './geometry'
import { FLAG_AT, GRID as N, GROUND_FAR as F, LAWNS, PLAZA, WALK_BAND } from './layout'
import { Poly } from './primitives'
import { inset, onTop, planOutline, ring, slab, type Plan } from './anatomy/kit'
import { Line, Solid, type Paint } from './anatomy/draw'
import s from './campus.module.css'

/** 잔디판: 윗면은 --scene-grass, 옆 네 단은 한 톤씩 진하게, 윤곽은 --scene-grass-line 보다 조금 진하게 */
const GRASS: Paint = { top: 'var(--c-grass-top)', shades: ['var(--c-grass-0)', 'var(--c-grass-1)', 'var(--c-grass-2)', 'var(--c-grass-3)'], edge: 'var(--c-grass-edge)' }
const PLAZA_PAINT: Paint = { top: 'var(--c-plaza-top)', shades: ['var(--c-plaza-0)', 'var(--c-plaza-1)', 'var(--c-plaza-2)', 'var(--c-plaza-3)'], edge: 'var(--c-plaza-edge)' }
/** 잔디판 두께 · 광장판 두께 (격자) */
const LAWN_H = 0.03
const PLAZA_H = 0.025

/**
 * 땅 + 잔디 + 문 앞 길 + 십자 보행로 + 광장 (anatomy 방식).
 * 잔디는 얇은 판(둥근 모서리 · 깎은 윗선 · 안쪽 경계석 홈), 광장은 판 + 깔개 고리 두 겹 (눈금은 시계판처럼 보여서 뺐다).
 * 받침판 없이 아주 넓은 땅 한 장을 깔아서, 화면이 장면을 어디서 자르든 땅과 길이 화면 밖으로 이어진다.
 */
export const Ground = memo(function Ground() {
  const [w0, w1] = WALK_BAND
  const [px0, py0, px1, py1] = PLAZA
  const [cx, cy] = FLAG_AT
  const plaza: Plan = { x: px0, y: py0, w: px1 - px0, d: py1 - py0, r: 0.12 }
  return (
    <g>
      <Poly className={s.ground} pts={[[-F, -F], [N + F, -F], [N + F, N + F], [-F, N + F]]} />
      <Poly className={s.walk} pts={[[-F, w0], [N + F, w0], [N + F, w1], [-F, w1]]} />
      <Poly className={s.walk} pts={[[w0, -F], [w1, -F], [w1, N + F], [w0, N + F]]} />
      {LAWNS.map(([a, b, c, d]) => {
        const plan: Plan = { x: a, y: b, w: c - a, d: d - b, r: 0.14 }
        return (
          <g key={`${a}-${b}`}>
            <Solid paths={slab(plan, 0, LAWN_H, 4, 0.02)} paint={GRASS} />
            <Line d={planOutline(inset(plan, 0.1), LAWN_H, 4)} color="var(--c-grass-line)" />
          </g>
        )
      })}
      {PLACES.flatMap((p) => (p.footprint ? [entryPath(p.footprint)] : [])).map(([a, b, c, d]) => (
        <path key={`door-${a}-${b}`} className={s.walk} d={onTop([[a, b], [c, b], [c, d], [a, d]], LAWN_H, true)} />
      ))}
      <Solid paths={slab(plaza, 0, PLAZA_H, 4, 0.02)} paint={PLAZA_PAINT} />
      <Line d={planOutline(inset(plaza, 0.12), PLAZA_H, 4)} color="var(--c-plaza-line)" />
      <Line d={ring(cx, cy, 1.45, PLAZA_H, 72)} color="var(--c-plaza-ring)" />
      <Line d={ring(cx, cy, 0.42, PLAZA_H, 40)} color="var(--c-plaza-line)" />
    </g>
  )
})
