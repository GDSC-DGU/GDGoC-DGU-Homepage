import { describe, expect, it } from 'vitest'
import { boxBounds, iso, isoBounds, points, shade } from './iso'

describe('iso', () => {
  it('격자 좌표를 화면 좌표로 바꾼다', () => {
    expect(iso(0, 0)).toEqual([0, 0])
    expect(iso(1, 0)).toEqual([32, 16])
    expect(iso(0, 1)).toEqual([-32, 16])
    expect(iso(0, 0, 1)).toEqual([0, -32])
  })

  it('polygon points 문자열', () => {
    expect(points([[0, 0], [1, 0, 0]])).toBe('0.0,0.0 32.0,16.0')
  })

  it('점들의 화면 경계', () => {
    expect(isoBounds([[0, 0], [1, 0], [0, 1, 1]])).toEqual({ x0: -32, y0: -16, x1: 32, y1: 16 })
  })

  it('상자의 화면 경계: 왼쪽 · 오른쪽 · 아래 모서리와 꼭대기', () => {
    // 1×1 칸, 높이 1 상자: 왼쪽 끝 (0,1), 오른쪽 끝 (1,0), 아래 (1,1), 꼭대기 (0,0,1)
    expect(boxBounds(0, 0, 1, 1, 0, 1)).toEqual({ x0: -32, y0: -32, x1: 32, y1: 32 })
  })

  it('색을 밝게, 어둡게', () => {
    expect(shade('#808080', 0)).toBe('#808080')
    expect(shade('#000000', 0.5)).toBe('#808080')
    expect(shade('#ffffff', -0.5)).toBe('#808080')
  })
})
