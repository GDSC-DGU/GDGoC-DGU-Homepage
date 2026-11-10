import { describe, expect, it } from 'vitest'
import { iso } from '@/lib/iso'
import { at, polySolid, prismX, sphere, toneOfNormal } from './kit'

describe('anatomy 어댑터', () => {
  it('anatomy 카메라가 캠퍼스 격자 투영과 같은 자리를 준다 (안내판 · 장면 맞추기가 그대로)', () => {
    for (const [x, y, z] of [
      [0, 0, 0],
      [9.7, 0.9, 1.37],
      [12.5, 12.5, 2.05],
      [-3, 7, 0.5],
    ] as const) {
      const [ax, ay] = at(x, y, z)
      const [bx, by] = iso(x, y, z)
      expect(ax).toBeCloseTo(bx, 6)
      expect(ay).toBeCloseTo(by, 6)
    }
  })

  it('빛은 왼쪽 위: +y 면이 밝고 +x 면이 어둡고 윗면은 top', () => {
    expect(toneOfNormal([0, 1, 0])).toBe(3)
    expect(toneOfNormal([1, 0, 0])).toBe(0)
    expect(toneOfNormal([0, 0, 1])).toBe('top')
  })

  it('톱니 하나: 비탈 · 톱니창 · 끝벽만 보이고 윤곽은 닫힌 껍질', () => {
    const p = polySolid(prismX([[0, 1], [1, 1.7], [1, 1]], 0, 3))
    expect(p.outline.endsWith('Z')).toBe(true)
    expect(p.shades.filter(Boolean).length + (p.top ? 1 : 0)).toBeGreaterThanOrEqual(2)
  })

  it('공은 네 단 (가장 밝은 단이 가장 작다)', () => {
    const s = sphere([0, 0, 1], 0.3)
    expect(s.shades.every(Boolean)).toBe(true)
    expect(s.shades[3].length).toBeLessThanOrEqual(s.shades[0].length + 200)
  })
})
