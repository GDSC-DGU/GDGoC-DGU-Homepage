import { memo, useContext } from 'react'
import { iso, shade } from '@/lib/iso'
import type { TreeKind } from './layout'
import { ring, slab, type Plan } from './anatomy/kit'
import { Line, MixedSolid, Solid, type Paint } from './anatomy/draw'
import { NightContext } from './nightContext'
import { useSeason } from './trees/season'
import { treeColors, treeSolids, type TreeRole } from './trees/treeModel'
import s from './campus.module.css'

/** 나무 색 한 벌 → anatomy 네 단 칠 (윗면이 가장 밝고, 빛 반대쪽 면이 가장 어둡다) */
function treePaint(c: string): Paint {
  return { top: shade(c, 0.2), shades: [shade(c, -0.2), shade(c, -0.09), shade(c, 0.02), shade(c, 0.11)], edge: shade(c, -0.42), crease: shade(c, -0.12) }
}

/**
 * 나무 한 그루 (anatomy 방식): 땅 그림자 · 심은 자리 고리 → 깎은 면 입체들(줄기 · 가지 · 수관 덩어리, 뒤 → 앞).
 * 모양은 trees/treeModel (3D 지도와 같은 모양), 색은 계절(한국 날짜, ?season=) · 밤을 따른다.
 */
export const Tree = memo(function Tree({ x, y, size = 1, kind }: { x: number; y: number; size?: number; kind: TreeKind }) {
  const night = useContext(NightContext)
  const season = useSeason()
  const [bx, by] = iso(x, y, 0)
  const k = size
  const colors = treeColors(kind, season, night)
  const paints = Object.fromEntries((Object.keys(colors) as TreeRole[]).map((r) => [r, treePaint(colors[r])])) as Record<TreeRole, Paint>
  const solids = treeSolids(kind, x, y, k, season)
  const leafEdge = paints[kind === 'cherry' && season === 'spring' ? 'bloom' : 'leaf'].edge
  return (
    <g data-tree={kind}>
      <ellipse className={s.treeShadow} cx={bx + 7 * k} cy={by + 1.5 * k} rx={11 * k} ry={4.2 * k} />
      <Line d={ring(x, y, 0.11 * k, 0, 14)} tone="faint" />
      {solids.map((solid, i) => {
        const bark = solid.faces.every((f) => f.role === 'bark')
        return <MixedSolid key={i} faces={solid.faces} paints={paints} edge={bark ? paints.bark.edge : leafEdge} crease={bark ? paints.bark.crease : paints.leaf.crease} />
      })}
    </g>
  )
})

const WOOD: Paint = { top: 'var(--c-wood-top)', shades: ['var(--c-wood-0)', 'var(--c-wood-1)', 'var(--c-wood-2)', 'var(--c-wood-3)'], edge: 'var(--c-wood-edge)' }
const IRON: Paint = { top: 'var(--c-iron-top)', shades: ['var(--c-iron-0)', 'var(--c-iron-1)', 'var(--c-iron-2)', 'var(--c-iron-3)'], edge: 'var(--c-iron-edge)' }

/**
 * 벤치: 다리 둘 + 앉는 판 + 등받이 (둥근 모서리 · 깎은 윗선). dir 은 긴 쪽 방향.
 * 등받이를 먼 쪽(-y 또는 -x)에 두어, 보는 사람에게 앉는 판이 보이게 한다.
 */
export const Bench = memo(function Bench({ x, y, dir }: { x: number; y: number; dir: 'x' | 'y' }) {
  const L = 0.7
  const D = 0.22
  const [w, d] = dir === 'x' ? [L, D] : [D, L]
  const legs: Plan[] = (dir === 'x' ? [[x + 0.06, y + 0.06], [x + L - 0.12, y + 0.06]] : [[x + 0.06, y + 0.06], [x + 0.06, y + L - 0.12]]).map(([lx, ly]) => ({
    x: lx,
    y: ly,
    w: dir === 'x' ? 0.06 : 0.12,
    d: dir === 'x' ? 0.12 : 0.06,
    r: 0.01,
  }))
  const back: Plan = { x, y, w: dir === 'x' ? L : 0.05, d: dir === 'x' ? 0.05 : L, r: 0.015 }
  const seat: Plan = { x, y, w, d, r: 0.02 }
  return (
    <g>
      {legs.map((p) => (
        <Solid key={`${p.x}-${p.y}`} paths={slab(p, 0, 0.13, 2)} paint={IRON} crease="none" />
      ))}
      <Solid paths={slab(back, 0.13, 0.24, 2, 0.008)} paint={WOOD} />
      <Solid paths={slab(seat, 0.13, 0.05, 2, 0.01)} paint={WOOD} />
    </g>
  )
})
