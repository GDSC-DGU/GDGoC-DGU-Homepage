import type { ReactNode } from 'react'
import { PLACES } from '@/config/places'
import { depthOfBox, depthOfPoint } from '@/lib/iso'
import { Bench, Tree } from './Greenery'
import { BENCHES, PEOPLE, SITTERS, TREES } from './layout'
import { BenchSitter } from './peeps/BenchSitter'
import { StandingPeep } from './peeps/Peep'

export interface SceneItem {
  key: string
  /** 앞뒤 순서 키 (lib/iso depthOf*). 큰 값이 앞 */
  depth: number
  node: ReactNode
}

/**
 * 나무 · 벤치 (홈 지도와 같은 자리). 한 번 만들어 두고 건물과 섞어 앞뒤로 정렬한다.
 * people: 문 앞 · 광장에 서 있는 사람과 벤치에 앉은 사람 (걷지 않는다). 아주 작은 지도(꼬리말)는 빼고 그린다.
 * 사람을 그리는 장면은 PEEP_DEFS(<symbol>)를 함께 넣어야 한다.
 */
/**
 * 앞뒤 키: 점 물체(나무 · 사람)가 어떤 건물의 앞 벽(+y 면) 앞이나 오른쪽 벽(+x 면) 앞에 서 있으면 그 건물보다 나중에 그린다.
 * (건물 키는 앞 모서리라서, 벽 앞이지만 모서리보다 왼쪽에 선 사람이 건물에 가려지는 일을 막는다)
 */
export function pointDepth(x: number, y: number, add = 0): number {
  let d = depthOfPoint(x, y) + add
  for (const p of PLACES) {
    const fp = p.footprint
    if (!fp) continue
    const front = y >= fp.y + fp.d - 0.05 && x >= fp.x - 0.4 && x <= fp.x + fp.w + 0.4
    const side = x >= fp.x + fp.w - 0.05 && y >= fp.y - 0.4 && y <= fp.y + fp.d + 0.4
    if (front || side) d = Math.max(d, depthOfBox(fp.x, fp.y, fp.w, fp.d) + 0.01 + add)
  }
  return d
}

export function sceneryItems(people = false): SceneItem[] {
  const items: SceneItem[] = [
    ...TREES.map(([x, y, size, kind], i) => ({ key: `tree-${i}`, depth: pointDepth(x, y, 0.05), node: <Tree x={x} y={y} size={size} kind={kind} /> })),
    ...BENCHES.map(([x, y, dir], i) => ({ key: `bench-${i}`, depth: depthOfPoint(x, y) + 0.9, node: <Bench x={x} y={y} dir={dir} /> })),
  ]
  if (!people) return items
  return [
    ...items,
    // 벤치에 앉은 사람: 벤치 바로 앞에 그린다
    ...BENCHES.map(([x, y, dir], i) => ({ key: `sitter-${i}`, depth: depthOfPoint(x, y) + 0.95, node: <BenchSitter x={x} y={y} dir={dir} pose={SITTERS[i % SITTERS.length]} /> })),
    ...PEOPLE.map(([x, y, pose, flip], i) => ({ key: `peep-${i}`, depth: pointDepth(x, y, 0.02), node: <StandingPeep x={x} y={y} pose={pose} flip={flip} /> })),
  ]
}
