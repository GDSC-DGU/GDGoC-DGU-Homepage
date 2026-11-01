import { describe, expect, it } from 'vitest'
import { PLACES } from '@/config/places'
import { FLAG_AT, WALK_BAND } from '@/features/campus/layout'
import { GROUPS, HAIRS, LANES, PERSONAL, SHIRTS, WALKERS, inCrossing, makeWalkers, stepWalkers, walkerAt, type Walker } from './peeps'

const lane = (from: [number, number], to: [number, number], s: number, speed = 1): Walker => {
  const len = Math.hypot(to[0] - from[0], to[1] - from[1])
  return { from, dir: [(to[0] - from[0]) / len, (to[1] - from[1]) / len], length: len, speed, s, waiting: false }
}

describe('말뚝 사람', () => {
  it('걷는 길은 보행로 안에 있고 깃대를 지나지 않는다', () => {
    for (const l of Object.values(LANES)) {
      const horizontal = l.from[1] === l.to[1]
      const at = horizontal ? l.from[1] : l.from[0]
      expect(at).toBeGreaterThan(WALK_BAND[0])
      expect(at).toBeLessThan(WALK_BAND[1])
      expect(Math.abs(at - (horizontal ? FLAG_AT[1] : FLAG_AT[0]))).toBeGreaterThan(0.4)
    }
  })

  it('문 앞 사람은 건물 · 보행로 밖에 선다', () => {
    for (const [x, y] of GROUPS.flat()) {
      for (const p of PLACES) {
        const f = p.footprint
        if (f) expect(x > f.x && x < f.x + f.w && y > f.y && y < f.y + f.d).toBe(false)
      }
      expect(x > WALK_BAND[0] && x < WALK_BAND[1]).toBe(false)
      expect(y > WALK_BAND[0] && y < WALK_BAND[1]).toBe(false)
    }
  })

  it('색 번호는 모두 있는 색이다', () => {
    for (const [, , , shirt, hair] of WALKERS) {
      expect(SHIRTS[shirt]).toBeDefined()
      expect(HAIRS[hair]).toBeDefined()
    }
    for (const [, , shirt, hair] of GROUPS.flat()) {
      expect(SHIRTS[shirt]).toBeDefined()
      expect(HAIRS[hair]).toBeDefined()
    }
  })

  it('앞사람이 가까우면 뒤 사람은 기다린다', () => {
    const front = lane([0, 6.5], [20, 6.5], 2.3)
    const back = lane([0, 6.5], [20, 6.5], 2, 1.5)
    front.speed = 0 // 서 있는 앞사람
    stepWalkers([front, back], 0.1, { owner: null })
    expect(back.waiting).toBe(true)
    expect(back.s).toBe(2)
    expect(PERSONAL).toBeGreaterThan(0.3)
  })

  it('광장 가운데는 한 번에 한 사람만 지나간다', () => {
    const crossing = { owner: null as number | null }
    const ws = makeWalkers()
    for (let k = 0; k < 4000; k++) {
      stepWalkers(ws, 0.05, crossing)
      const inside = ws.filter((w) => inCrossing(...walkerAt(w)))
      expect(inside.length).toBeLessThanOrEqual(1)
    }
    // 오래 걸어도 모두 계속 움직인다 (서로 막혀 멈추지 않는다)
    const before = ws.map((w) => w.s)
    for (let k = 0; k < 400; k++) stepWalkers(ws, 0.05, crossing)
    ws.forEach((w, i) => expect(w.s).not.toBe(before[i]))
  })
})
