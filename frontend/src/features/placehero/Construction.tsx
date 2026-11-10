import type { JSX } from 'react'
import { SITE } from '@/config/site'
import type { Footprint } from '@/domain/types'
import { iso, type Point3 } from '@/lib/iso'
import { FLOOR } from '@/features/campus/geometry'
import { Box, IsoLine, Poly } from '@/features/campus/primitives'
import { HOARDING, SCAFFOLD, hoardingLines } from './frame'
import s from './placehero.module.css'

/**
 * 공사 중: 가벼운 비계(쇠 파이프 + 나무 발판) + 앞을 두른 흰 가림막.
 * 노랑-검정 사선 띠 · 고깔 그림은 쓰지 않는다. 가림막에 인쇄된 글은 안내판 체계와 같다:
 * 장소색 네모 하나 + 먹색 글자 ('공사 중' · '여는 시기 미정' · 소식 채널).
 * 장면은 aria-hidden 이고, 같은 내용은 페이지 본문(지금 상태)이 글로 말한다.
 */

const PLANK = '#d9c9a8'
const f1 = (n: number) => n.toFixed(1)

/** 아이소 면 위에 글자를 눕히는 행렬: +y 면(L)은 x 방향으로, +x 면(R)은 -y 방향으로 읽힌다 */
const planeMatrix = (face: 'L' | 'R', at: Point3) => {
  const [ox, oy] = iso(at[0], at[1], at[2] ?? 0)
  return `matrix(1 ${face === 'L' ? 0.5 : -0.5} 0 1 ${f1(ox)} ${f1(oy)})`
}

/** 비계: 벽(L면) 앞 두 줄 기둥 + 가로대 + 발판 + 가새. 안쪽 줄 → 발판 → 바깥 줄 순서로 그린다 */
export function Scaffold({ fp }: { fp: Footprint }) {
  const { x, y, w, d, h } = fp
  const top = FLOOR + h
  const rail = top + SCAFFOLD.rail
  const yi = y + d + SCAFFOLD.inner
  const yo = y + d + SCAFFOLD.outer
  const x0 = x - 0.08
  const x1 = x + w + 0.08
  const bays = Math.max(2, Math.round((x1 - x0) / 1.15))
  const xs = Array.from({ length: bays + 1 }, (_, i) => x0 + ((x1 - x0) * i) / bays)
  const lifts = [...SCAFFOLD.decks, top]
  const back: JSX.Element[] = []
  const front: JSX.Element[] = []
  for (const xx of xs) {
    back.push(<IsoLine key={`si-${xx}`} className={s.tubeBack} from={[xx, yi, 0]} to={[xx, yi, top]} />)
    front.push(<IsoLine key={`so-${xx}`} className={s.tube} from={[xx, yo, 0]} to={[xx, yo, rail]} />)
  }
  for (const z of lifts) back.push(<IsoLine key={`li-${z}`} className={s.tubeBack} from={[x0, yi, z]} to={[x1, yi, z]} />)
  for (const z of [...lifts, rail]) front.push(<IsoLine key={`lo-${z}`} className={s.tube} from={[x0, yo, z]} to={[x1, yo, z]} />)
  // 가새: 첫 칸과 마지막 칸에만, 아래 단에서 한 번 (줄무늬처럼 보이지 않게)
  for (const i of [0, bays - 1]) {
    front.push(<IsoLine key={`br-${i}`} className={s.brace} from={[xs[i], yo, 0.04]} to={[xs[i + 1], yo, lifts[0]]} />)
  }
  const decks = lifts.map((z) => <Box key={`dk-${z}`} x={x0} y={yi - 0.03} w={x1 - x0} d={yo - yi + 0.06} z0={z} h={0.035} color={PLANK} />)
  return (
    <g>
      {back}
      {decks}
      {front}
    </g>
  )
}

/** 가림막 판 하나: 흰 판 + 판 이음매 + 아래 걸레받이 */
function Panel({ face, a0, a1, at }: { face: 'L' | 'R'; a0: number; a1: number; at: number }) {
  const H = HOARDING.h
  const P = (a: number, z: number): Point3 => (face === 'L' ? [a, at, z] : [at, a, z])
  const n = Math.max(1, Math.round((a1 - a0) / 0.95))
  const seams = Array.from({ length: n - 1 }, (_, i) => a0 + ((a1 - a0) * (i + 1)) / n)
  return (
    <g>
      <Poly className={face === 'L' ? s.hoardL : s.hoardR} pts={[P(a0, 0), P(a1, 0), P(a1, H), P(a0, H)]} />
      <Poly className={s.hoardBase} pts={[P(a0, 0), P(a1, 0), P(a1, 0.07), P(a0, 0.07)]} />
      {seams.map((a) => (
        <IsoLine key={a} className={s.hoardSeam} from={P(a, 0.07)} to={P(a, H)} />
      ))}
    </g>
  )
}

/** 앞을 두른 가림막 (L면 판 + R면 판). 안내는 가려지는 것 없는 긴 L면 판에만 인쇄한다 */
export function Hoarding({ fp, color }: { fp: Footprint; color: string }) {
  const { l, r } = hoardingLines(fp)
  const H = HOARDING.h
  return (
    <g>
      <Panel face="R" a0={r.y0} a1={r.y1} at={r.x} />
      <Panel face="L" a0={l.x0} a1={l.x1} at={l.y} />
      {/* 장소색 네모 + 공사 중 / 여는 시기 미정 | 소식 채널 */}
      <g transform={planeMatrix('L', [l.x0 + 0.28, l.y + 0.004, H - 0.1])}>
        <rect x={0} y={4.4} width={7} height={7} rx={1.2} fill={color} />
        <text x={11} y={12.6} className={s.hoardBig}>
          공사 중
        </text>
        <text x={0} y={23.4} className={s.hoardSmall}>
          여는 시기 미정
        </text>
        <line x1={59} y1={3.5} x2={59} y2={25} className={s.hoardRule} />
        <text x={65} y={12.4} className={s.hoardSmall}>
          소식은 인스타그램
        </text>
        <text x={65} y={23.4} className={`${s.hoardSmall} ${s.hoardNum}`}>
          {SITE.links.instagramHandle}
        </text>
      </g>
    </g>
  )
}
