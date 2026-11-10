import { describe, expect, it } from 'vitest'
import { iso } from '@/lib/iso'
import { aimAt, poseFromViewBox, project, world } from './projection'

describe('3D 카메라는 SVG 지도와 같은 그림을 만든다', () => {
  const vb = { x: -410, y: -96, w: 820, h: 510 }
  const frame = { w: 1440, h: 760 }
  const pose = poseFromViewBox(vb, frame)
  const k = Math.min(frame.w / vb.w, frame.h / vb.h)
  it.each([
    [0, 0, 0],
    [14, 0, 0],
    [0, 14, 0],
    [9.7, 0.9, 2.1],
    [7, 7, 2.6],
  ])('격자 (%d, %d, %d)', (x, y, z) => {
    const [sx, sy] = iso(x, y, z)
    // SVG: viewBox 왼쪽 위가 틀 왼쪽 위 (xMinYMin meet)
    const svg = [(sx - vb.x) * k - frame.w / 2, (sy - vb.y) * k - frame.h / 2]
    const [px, py] = project(world(x, y, z), pose)
    expect(px).toBeCloseTo(svg[0], 6)
    expect(py).toBeCloseTo(svg[1], 6)
  })
  it('aimAt: 고른 점이 원하는 화면 자리에 온다', () => {
    const p = world(11.4, 2.5, 1)
    const aimed = aimAt(p, [-120, 40], { az: 1, el: 0.6, zoom: 80 })
    const [px, py] = project(p, aimed)
    expect(px).toBeCloseTo(-120, 6)
    expect(py).toBeCloseTo(40, 6)
  })
})
