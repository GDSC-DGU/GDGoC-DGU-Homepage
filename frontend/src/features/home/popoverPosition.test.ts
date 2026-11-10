import { describe, expect, it } from 'vitest'
import { dockInset, placePopover } from './popoverPosition'

const frame = { w: 1440, h: 560 }
const panel = { w: 340, h: 300 }
const plate = (left: number, top: number, w = 110, h = 30) => ({ left, top, right: left + w, bottom: top + h })

describe('미리보기 자리', () => {
  it('자리가 있으면 이름표 오른쪽', () => {
    const p = placePopover({ anchor: plate(400, 100), panel, frame })
    expect(p.side).toBe('right')
    expect(p.left).toBe(522)
    expect(p.top).toBe(92)
  })

  it('좌우는 8px 까지 붙일 수 있다 (몇 px 차이로 뒤집히지 않게)', () => {
    expect(placePopover({ anchor: plate(950, 100), panel, frame }).side).toBe('right')
  })

  it('오른쪽이 모자라면 왼쪽으로 뒤집는다', () => {
    const p = placePopover({ anchor: plate(1200, 100), panel, frame })
    expect(p.side).toBe('left')
    expect(p.left + panel.w).toBeLessThanOrEqual(1200 - 12)
  })

  it('양옆이 모두 모자라면 아래, 아래도 모자라면 위', () => {
    const narrow = { w: 500, h: 560 }
    expect(placePopover({ anchor: plate(200, 60), panel, frame: narrow }).side).toBe('below')
    expect(placePopover({ anchor: plate(200, 400), panel, frame: narrow }).side).toBe('above')
  })

  it('틀 밖으로 나가지 않는다', () => {
    const p = placePopover({ anchor: plate(400, 520), panel, frame })
    expect(p.top + panel.h).toBeLessThanOrEqual(frame.h - 16)
    expect(p.top).toBeGreaterThanOrEqual(16)
  })

  it('화면에 보이는 구간 안으로 민다', () => {
    const p = placePopover({ anchor: plate(400, 20), panel, frame, visible: { top: 120, bottom: 560 } })
    expect(p.top).toBe(136)
  })

  it('보이는 구간이 패널보다 작으면 틀 안에만 맞춘다', () => {
    const p = placePopover({ anchor: plate(400, 20), panel, frame, visible: { top: 400, bottom: 560 } })
    expect(p.top).toBe(16)
  })
})

describe('오른쪽에 붙이기 (dockRight)', () => {
  it('이름표와 겹치지 않으면 틀 오른쪽 끝선에, 세로는 보이는 구간 가운데', () => {
    const p = placePopover({ anchor: { left: 300, top: 200, right: 400, bottom: 230 }, panel: { w: 340, h: 300 }, frame: { w: 1440, h: 600 }, dockRight: 150 })
    expect(p).toEqual({ left: 1440 - 150 - 340, top: 150, side: 'right' })
  })
  it('이름표가 그 자리에 걸리면 이름표 옆 규칙으로', () => {
    const p = placePopover({ anchor: { left: 900, top: 200, right: 1000, bottom: 230 }, panel: { w: 340, h: 300 }, frame: { w: 1440, h: 600 }, dockRight: 150 })
    expect(p.left).not.toBe(1440 - 150 - 340)
  })
  it('본문 틀 오른쪽 끝선까지의 거리', () => {
    expect(dockInset(1440)).toBe(150)
    expect(dockInset(1000)).toBe(24)
  })
})
