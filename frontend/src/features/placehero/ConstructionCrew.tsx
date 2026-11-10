import type { Footprint } from '@/domain/types'
import { iso } from '@/lib/iso'
import { FLOOR } from '@/features/campus/geometry'
import { PEEPS, peepSymbolId, type PeepId } from '@/features/campus/peeps/peepArt'
import { HOARDING, SCAFFOLD } from './frame'

/** 걷는 사람과 같은 배율 (원본 713 높이 → 37) */
const K = 37 / 713

/** 사람 하나를 발(또는 엉덩이) 자리에 세운다. flip 이면 좌우를 뒤집는다 */
function Peep({ id, at, pivot, flip = false, className }: { id: PeepId; at: [number, number]; pivot: [number, number]; flip?: boolean; className?: string }) {
  const art = PEEPS[id]
  return (
    <g transform={`translate(${at[0].toFixed(1)},${at[1].toFixed(1)}) scale(${flip ? -1 : 1},1)`} className={className}>
      <use href={`#${peepSymbolId(id)}`} x={(-pivot[0] * K).toFixed(1)} y={(-pivot[1] * K).toFixed(1)} width={(art.w * K).toFixed(1)} height={(art.h * K).toFixed(1)} />
    </g>
  )
}

/**
 * 공사 현장의 사람들 (Open Peeps, CC0): 비계 맨 위 발판에 걸터앉은 사람 + 가림막 앞에서 건물을 가리키는 사람.
 * 일꾼 흉내(안전모 · 공구)는 그리지 않는다. 같은 그림체의 '구경꾼'이라 사이트의 다른 사람들과 같다.
 * 움직이지 않는다. 장면 맨 앞(가림막 다음)에 그린다.
 */
export function ConstructionCrew({ fp }: { fp: Footprint }) {
  const deckZ = FLOOR + fp.h + 0.035
  const yo = fp.y + fp.d + SCAFFOLD.outer
  // 앉은 사람: 엉덩이를 맨 위 발판 바깥 끝에, 다리는 앞(+y, 화면 왼쪽 아래)으로 늘어뜨린다
  const sit = iso(fp.x + 0.95, yo - 0.02, deckZ)
  // 가리키는 사람: 가림막 오른쪽 앞 모서리 바깥 길에 서서 건물(왼쪽 위)을 손가락으로 가리킨다
  // (가림막 글씨 · 나무를 가리지 않는 자리)
  const stand = iso(fp.x + fp.w + HOARDING.gap + 0.74, fp.y + fp.d + HOARDING.gap + 0.34, 0)
  return (
    <g aria-hidden="true">
      <Peep id="sitA" at={sit} pivot={[150, 372]} flip />
      <ellipse cx={stand[0]} cy={stand[1] + 0.4} rx={7.5} ry={2.4} fill="rgba(25,27,31,.13)" />
      <Peep id="pointA" at={stand} pivot={[PEEPS.pointA.w * 0.42, PEEPS.pointA.h]} flip />
    </g>
  )
}
