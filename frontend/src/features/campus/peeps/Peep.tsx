import { memo } from 'react'
import { iso } from '@/lib/iso'
import { FOOT_X, PEEP_K, PEEPS, peepSymbolId, type PeepId } from './peepArt'
import s from '../campus.module.css'

/**
 * 서 있는 사람 하나 (Open Peeps, CC0): 발밑 작은 그림자 + 발을 (x, y) 땅에 세운 그림. 움직이지 않는다.
 * 같은 문서에 PEEP_DEFS(<symbol>)가 있어야 한다.
 */
export const StandingPeep = memo(function StandingPeep({ x, y, pose, flip = false }: { x: number; y: number; pose: PeepId; flip?: boolean }) {
  const art = PEEPS[pose]
  const [sx, sy] = iso(x, y, 0)
  const fx = FOOT_X[pose] * art.w
  return (
    <g aria-hidden="true">
      <ellipse className={s.peepShadow} cx={sx + 1.5} cy={sy + 0.4} rx={7.5} ry={2.4} />
      <g transform={`translate(${sx.toFixed(1)},${sy.toFixed(1)}) scale(${flip ? -1 : 1},1)`}>
        <use href={`#${peepSymbolId(pose)}`} x={(-fx * PEEP_K).toFixed(1)} y={(-art.h * PEEP_K).toFixed(1)} width={(art.w * PEEP_K).toFixed(1)} height={(art.h * PEEP_K).toFixed(1)} />
      </g>
    </g>
  )
})

