import { memo } from 'react'
import { iso } from '@/lib/iso'
import { PEEP_K, PEEPS, peepSymbolId, seatOf, SIT_HIP, type PeepId } from './peepArt'

/**
 * 벤치에 앉은 사람 하나 (Open Peeps 앉은 자세, CC0).
 * 원본은 오른쪽 아래(+x)를 보고 앉아 있다. x 방향 벤치는 등받이가 -y 쪽이라 사람은 +y(왼쪽 아래)를 보므로 뒤집는다.
 * 움직이지 않는다 ('동작 줄이기'와 상관없이 같은 그림).
 */
export const BenchSitter = memo(function BenchSitter({ x, y, dir, pose }: { x: number; y: number; dir: 'x' | 'y'; pose: PeepId }) {
  const art = PEEPS[pose]
  const [sx, sy] = iso(...seatOf(x, y, dir))
  const flip = dir === 'x' ? -1 : 1
  return (
    <g transform={`translate(${sx.toFixed(1)},${sy.toFixed(1)}) scale(${flip},1)`} aria-hidden="true">
      <use href={`#${peepSymbolId(pose)}`} x={(-SIT_HIP.x * PEEP_K).toFixed(1)} y={(-SIT_HIP.y * PEEP_K).toFixed(1)} width={(art.w * PEEP_K).toFixed(1)} height={(art.h * PEEP_K).toFixed(1)} />
    </g>
  )
})
