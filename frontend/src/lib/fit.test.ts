import { describe, expect, it } from 'vitest'
import { fitAvoiding, fitViewBox, pinScaleFor } from './fit'

describe('fitViewBox', () => {
  it('빈 자리의 짧은 쪽에 맞춰 배율을 정한다', () => {
    const r = fitViewBox({
      bbox: { x: -500, y: -100, w: 1000, h: 500 },
      frame: { w: 1000, h: 1000 },
      free: { x0: 0, y0: 0, x1: 1000, y1: 1000 },
    })
    expect(r.scale).toBe(1)
    expect(r.viewBox).toBe('-500.0 -350.0 1000.0 1000.0')
  })

  it('빈 자리가 왼쪽에 치우치면 장면도 왼쪽으로 간다', () => {
    const r = fitViewBox({
      bbox: { x: 0, y: 0, w: 100, h: 100 },
      frame: { w: 400, h: 200 },
      free: { x0: 0, y0: 0, x1: 200, y1: 200 },
      maxScale: 4,
    })
    // 빈 자리 가운데(100,100)에 bbox 가운데(50,50)가 오도록
    expect(r.scale).toBe(2)
    expect(r.viewBox).toBe('0.0 0.0 200.0 100.0')
  })

  it('최대 배율을 넘지 않는다', () => {
    const r = fitViewBox({
      bbox: { x: 0, y: 0, w: 10, h: 10 },
      frame: { w: 1000, h: 1000 },
      free: { x0: 0, y0: 0, x1: 1000, y1: 1000 },
      maxScale: 1.5,
    })
    expect(r.scale).toBe(1.5)
  })

  it('장면이 작을수록 핀을 키운다', () => {
    expect(pinScaleFor(1.2)).toBe(1)
    expect(pinScaleFor(0.4)).toBe(1.75)
  })
})

describe('fitAvoiding', () => {
  const bbox = { x: 0, y: 0, w: 100, h: 100 }
  const frame = { w: 400, h: 200 }
  const bounds = { x0: 0, y0: 0, x1: 400, y1: 200 }

  it('가릴 것이 없으면 bounds 안에서 가장 크게', () => {
    const r = fitAvoiding({ bbox, frame, bounds, prefer: bounds, obstacles: [], targets: () => [], maxScale: 4 })
    expect(r.scale).toBeCloseTo(2)
  })

  it('카드가 건물을 덮으면 건물이 비켜 갈 때까지 줄이거나 옮긴다', () => {
    // 건물은 장면 오른쪽 아래 구석, 카드는 화면 오른쪽 절반
    const card = { x0: 200, y0: 0, x1: 400, y1: 200 }
    const building = { x0: 80, y0: 80, x1: 100, y1: 100 }
    const r = fitAvoiding({ bbox, frame, bounds, prefer: bounds, obstacles: [card], targets: () => [building], maxScale: 4 })
    const [vx, vy, vw] = r.viewBox.split(' ').map(Number)
    const s = frame.w / vw
    // 건물 오른쪽 끝이 카드 왼쪽(200px)을 넘지 않는다
    expect((building.x1 - vx) * s).toBeLessThanOrEqual(200)
    expect((building.y1 - vy) * s).toBeLessThanOrEqual(200)
    expect(r.scale).toBeGreaterThan(1.5)
  })

  it('땅(bbox)은 카드 밑으로 들어가도 된다: 건물만 피하면 더 크게 그린다', () => {
    const card = { x0: 300, y0: 150, x1: 400, y1: 200 }
    const building = { x0: 0, y0: 0, x1: 20, y1: 20 }
    const r = fitAvoiding({ bbox, frame, bounds, prefer: bounds, obstacles: [card], targets: () => [building], maxScale: 4 })
    expect(r.scale).toBeCloseTo(2)
  })
})
