/**
 * 건물 몸체를 anatomy 방식으로: 받침 · 벽(둥근 모서리 + 깎은 윗선 + 층 줄눈) · 깊이 있는 창 · 문틀 · 계단 · 빗물 홈통.
 * 홈 지도(Building)와 하위 페이지 · 꼬리말(StaticBuilding)이 같이 쓴다.
 * 장소색은 문틀에만. 벽 · 창은 중립색 (DESIGN 9장).
 */
import type { JSX } from 'react'
import type { Face, Footprint } from '@/domain/types'
import { FLOOR, PAD } from '../geometry'
import { arc, cyl, faceRect, inset, line3, onFace, planOutline, seam, slab, type Plan, type V3 } from './kit'
import { Line, Solid } from './draw'
import { placePaint } from './paint'

const DOOR_HALF = 0.28
const DOOR_H = 0.62
/** 문틀 두께 · 튀어나온 깊이 */
const FRAME = 0.08
const FRAME_OUT = 0.035
/** 창 띠: 층 높이 · 창 높이 · 창 한 칸 폭 (기존 Openings 와 같은 격자) */
const STOREY = 0.62
const RIBBON = 0.3
const MULLION = 0.85
/** 창이 벽 안으로 들어간 깊이 · 창 사이 벽 */
const DEPTH = 0.05
const GAP = 0.14

/** 받침 + 벽. 벽 둘레 줄눈: 굽도리 · 층 사이 · 처마 밑 (모서리를 돌아 실루엣에서 끝난다) */
export function Shell({ fp }: { fp: Footprint }) {
  const { x, y, w, d, h } = fp
  const top = FLOOR + h
  const plinth: Plan = { x: x - PAD, y: y - PAD, w: w + PAD * 2, d: d + PAD * 2, r: 0.1 }
  const wall: Plan = { x, y, w, d, r: 0.05 }
  const lines = [FLOOR + 0.07, top - 0.07, ...storeys(top).slice(1).map((z) => z - 0.16)]
  return (
    <>
      <Solid paths={slab(plinth, 0, FLOOR, 4, 0.03)} tone="lo" />
      <Line d={planOutline(inset(plinth, 0.065), FLOOR, 4)} tone="faint" />
      <Solid paths={slab(wall, FLOOR, h, 3, 0.02)} tone="mid" inner={<Line d={lines.map((z) => seam(wall, z, 3)).join('')} tone="faint" />} />
    </>
  )
}

/** 창 띠가 시작하는 높이들 (아래층부터) */
function storeys(top: number): number[] {
  const out: number[] = []
  for (let zz = FLOOR + 0.3; zz + RIBBON <= top - 0.16; zz += STOREY) out.push(zz)
  return out
}

export interface OpeningsProps {
  fp: Footprint
  color: string
  glass?: { readonly L: string; readonly R: string }
  door?: 'open' | 'closed'
}

/**
 * 창 하나 = 벽 안으로 들어간 구멍(옆 벽 · 창턱이 보임) + 유리 + 가운데 창살 + 밖으로 나온 창대.
 * 들어간 깊이만큼 유리가 면을 따라 (+u, +z) 로 밀려 보인다 (격자 투영에서 정확히 같은 자리).
 */
function Window({ face, at, u0, u1, z0, z1, glass }: { face: Face; at: number; u0: number; u1: number; z0: number; z1: number; glass: string }) {
  const F = (u: number, z: number): V3 => onFace(face, at, u, z)
  const reveal = face === 'L' ? 'var(--anatomy-shade-0)' : 'var(--anatomy-shade-3)'
  const sillPlan: Plan = face === 'L' ? { x: u0 - 0.03, y: at, w: u1 - u0 + 0.06, d: 0.045, r: 0 } : { x: at, y: u0 - 0.03, w: 0.045, d: u1 - u0 + 0.06, r: 0 }
  const glassD = faceRect(face, at, u0 + DEPTH, u1, z0 + DEPTH, z1)
  const mid = (u0 + DEPTH + u1) / 2
  return (
    <g>
      <path d={faceRect(face, at, u0, u1, z0, z1)} style={{ fill: reveal }} />
      <path d={line3([F(u0, z0), F(u1, z0), F(u1, z0 + DEPTH), F(u0 + DEPTH, z0 + DEPTH)], true)} className="iso-top" />
      <path d={glassD} style={{ fill: glass }} data-glass={face} />
      <Line d={glassD} tone="faint" />
      {u1 - u0 > 0.42 && <Line d={line3([F(mid, z0 + DEPTH), F(mid, z1)])} tone="lo" />}
      <Line d={faceRect(face, at, u0, u1, z0, z1)} tone="lo" />
      <Solid paths={slab(sillPlan, z0 - 0.03, 0.03, 2)} tone="lo" crease="faint" />
    </g>
  )
}

/** 문 = 장소색 문틀(세 조각, 벽에서 튀어나옴) + 문간(열림: 어두운 안, 닫힘: 두 짝) + 문턱 · 바깥 계단 + 문 위 등 */
function Door({ fp, color, state }: { fp: Footprint; color: string; state: 'open' | 'closed' }) {
  const { x, y, w, d, door } = fp
  const at = door === 'L' ? y + d : x + w
  const dc = door === 'L' ? x + w / 2 : y + d / 2
  const F = (u: number, z: number): V3 => onFace(door, at, u, z)
  const paint = placePaint(color)
  const bar = (u0: number, u1: number, z0: number, z1: number) => {
    const plan: Plan = door === 'L' ? { x: u0, y: at, w: u1 - u0, d: FRAME_OUT, r: 0 } : { x: at, y: u0, w: FRAME_OUT, d: u1 - u0, r: 0 }
    return slab(plan, z0, z1 - z0, 2)
  }
  const fo = DOOR_HALF + FRAME
  const zTop = FLOOR + DOOR_H
  const step: Plan = door === 'L' ? { x: dc - fo - 0.06, y: at + PAD, w: fo * 2 + 0.12, d: 0.16, r: 0.02 } : { x: at + PAD, y: dc - fo - 0.06, w: 0.16, d: fo * 2 + 0.12, r: 0.02 }
  const lamp: Plan = door === 'L' ? { x: dc - 0.07, y: at, w: 0.14, d: 0.07, r: 0.02 } : { x: at, y: dc - 0.07, w: 0.07, d: 0.14, r: 0.02 }
  const open = state === 'open'
  return (
    <g>
      {/* 문간: 열리면 어두운 안 + 밝은 문턱, 닫히면 두 짝 문 */}
      <path d={faceRect(door, at, dc - DOOR_HALF, dc + DOOR_HALF, FLOOR, zTop)} className={open ? 'door-dark' : undefined} style={open ? undefined : { fill: 'var(--c-door-shut)' }} />
      {open ? (
        <path d={line3([F(dc - DOOR_HALF, FLOOR), F(dc + DOOR_HALF, FLOOR), F(dc + DOOR_HALF, FLOOR + 0.06), F(dc - DOOR_HALF + 0.06, FLOOR + 0.06)], true)} style={{ fill: 'var(--c-door-sill)' }} />
      ) : (
        <>
          <Line d={line3([F(dc, FLOOR), F(dc, zTop)])} tone="mid" />
          <Line d={line3([F(dc - 0.07, FLOOR + 0.27), F(dc - 0.07, FLOOR + 0.37)]) + line3([F(dc + 0.07, FLOOR + 0.27), F(dc + 0.07, FLOOR + 0.37)])} tone="hi" width={1.2} />
        </>
      )}
      <Line d={faceRect(door, at, dc - DOOR_HALF, dc + DOOR_HALF, FLOOR, zTop)} tone="mid" />
      {/* 문틀: 왼쪽 기둥 → 오른쪽 기둥 → 윗틀 (가까운 것을 나중에) */}
      <Solid paths={bar(dc - fo, dc - DOOR_HALF, FLOOR, zTop + FRAME)} paint={paint} tone="lo" />
      <Solid paths={bar(dc + DOOR_HALF, dc + fo, FLOOR, zTop + FRAME)} paint={paint} tone="lo" />
      <Solid paths={bar(dc - fo, dc + fo, zTop, zTop + FRAME)} paint={paint} tone="lo" />
      {/* 문 위 등: 받침 + 갓 */}
      <Solid paths={slab(lamp, zTop + FRAME + 0.06, 0.05, 2, 0.01)} tone="mid" />
      {/* 바깥 계단 (받침 앞 땅 위) */}
      <Solid paths={slab(step, 0, FLOOR * 0.5, 2, 0.015)} tone="lo" />
    </g>
  )
}

/** 빗물 홈통: 앞 모서리 옆 오른쪽 면(+x)에 붙은 가는 관 + 고정쇠 둘 + 바닥 꺾임 */
export function Downpipe({ fp, from }: { fp: Footprint; from?: number }) {
  const { x, y, w, d, h } = fp
  const top = from ?? FLOOR + h - 0.02
  const cx = x + w + 0.032
  const cy = y + d - 0.11
  const r = 0.028
  const bands = [FLOOR + 0.18, (FLOOR + top) / 2, top - 0.12]
  return (
    <Solid paths={cyl(cx, cy, r, FLOOR, top - FLOOR, 10)} tone="mid" crease="none" inner={<Line d={bands.map((z) => arc(cx, cy, r, z, 8)).join('')} tone="lo" />} />
  )
}

/**
 * 창 · 문 전부 (기존 Openings 와 같은 자리 규칙: 층마다 띠, 문 있는 면 1층은 문 자리를 비움).
 * 창 띠는 MULLION 폭마다 한 칸씩 끊어 실제 창처럼 벽 사이를 둔다.
 */
export function Openings({ fp, color, glass = { L: 'var(--c-glass-l)', R: 'var(--c-glass-r)' }, door: doorState = 'open' }: OpeningsProps) {
  const { x, y, w, d, h, door } = fp
  const top = FLOOR + h
  const dc = door === 'L' ? x + w / 2 : y + d / 2
  const items: JSX.Element[] = []
  const ribbon = (f: Face, a0: number, a1: number, zz: number) => {
    if (a1 - a0 < 0.4) return
    const n = Math.max(1, Math.round((a1 - a0) / MULLION))
    const step = (a1 - a0) / n
    for (let i = 0; i < n; i++) {
      const u0 = a0 + i * step + (i === 0 ? 0 : GAP / 2)
      const u1 = a0 + (i + 1) * step - (i === n - 1 ? 0 : GAP / 2)
      items.push(<Window key={`${f}-${zz.toFixed(2)}-${i}-${a0.toFixed(2)}`} face={f} at={f === 'L' ? y + d : x + w} u0={u0} u1={u1} z0={zz} z1={zz + RIBBON} glass={glass[f]} />)
    }
  }
  for (const zz of storeys(top)) {
    for (const f of ['R', 'L'] as const) {
      const a0 = (f === 'L' ? x : y) + 0.26
      const a1 = (f === 'L' ? x + w : y + d) - 0.26
      if (f === door && zz < FLOOR + DOOR_H + 0.1) {
        ribbon(f, a0, dc - DOOR_HALF - FRAME - 0.16, zz)
        ribbon(f, dc + DOOR_HALF + FRAME + 0.16, a1, zz)
      } else {
        ribbon(f, a0, f === 'R' ? a1 - 0.08 : a1, zz)
      }
    }
  }
  return (
    <>
      {items}
      <Door fp={fp} color={color} state={doorState} />
    </>
  )
}
