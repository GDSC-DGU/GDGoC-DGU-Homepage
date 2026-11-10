import { describe, expect, it } from 'vitest'
import { iso } from '@/lib/iso'
import { K_WIDE, LEADER, footprintOf, narrowFrame, plateAnchor, subjectBox, wideFrame } from './frame'
import { buildingLook, defaultState, sprintRunning, type HeroPlace } from './look'

const PLACES: HeroPlace[] = ['projects', 'community', 'recruits', 'teams']
const SPRINT = { steps: [{ date: '2026-09-22' }, { date: '2026-10-13' }], demoDay: '2026-12-29' }

describe('건물 상태 (실제 데이터에서만)', () => {
  it('G-Sprint 는 첫 단계 날부터 데모데이까지', () => {
    expect(sprintRunning('2026-09-21', SPRINT)).toBe(false)
    expect(sprintRunning('2026-09-22', SPRINT)).toBe(true)
    expect(sprintRunning('2026-10-17', SPRINT)).toBe(true)
    expect(sprintRunning('2026-12-29', SPRINT)).toBe(true)
    expect(sprintRunning('2026-12-30', SPRINT)).toBe(false)
  })
  it('기본값: 팀원 모집은 공사 중, 지원 안내는 모집 상태, 나머지는 열림', () => {
    expect(defaultState('teams')).toBe('construction')
    expect(defaultState('recruits', 'closed')).toBe('closed')
    expect(defaultState('recruits', 'open')).toBe('open')
    expect(defaultState('projects')).toBe('open')
    expect(defaultState('community')).toBe('open')
  })
  it('불: 프로젝트 랩은 G-Sprint 기간에만, 지원 안내는 모집 중에만', () => {
    expect(buildingLook('projects', '2026-10-17').lit).toBe(true)
    expect(buildingLook('projects', '2027-02-01').lit).toBe(false)
    expect(buildingLook('projects', '2026-10-17', 'closed').lit).toBe(false)
    expect(buildingLook('recruits', '2026-10-17', undefined, 'closed')).toEqual({ state: 'closed', lit: false })
    expect(buildingLook('recruits', '2026-10-17', undefined, 'open')).toEqual({ state: 'open', lit: true })
    expect(buildingLook('community', '2026-10-17').lit).toBe(false)
    expect(buildingLook('teams', '2026-10-17')).toEqual({ state: 'construction', lit: false })
  })
})

const toPx = (f: ReturnType<typeof wideFrame>, x: number, y: number) => [(x - f.vb.x) * f.k, (y - f.vb.y) * f.k]

describe('넓은 화면 장면 자리', () => {
  const plate = { w: 336, h: 41 + 5 * 45 }
  for (const stage of [
    { w: 581, h: 480 },
    { w: 810, h: 520 },
    { w: 940, h: 520 },
  ]) {
    for (const place of PLACES) {
      it(`${place} ${stage.w}×${stage.h}: 판 · 지시선 · 건물이 무대 안에 들어간다`, () => {
        const look = buildingLook(place, '2026-10-17')
        const f = wideFrame(place, look.state, stage, plate)
        expect(f.k).toBeGreaterThanOrEqual(K_WIDE.min)
        expect(f.k).toBeLessThanOrEqual(K_WIDE.max)
        // 지시선 발 = 지붕 자리
        const [ax, ay] = iso(...(plateAnchor(footprintOf(place)) as [number, number, number]))
        const [px, py] = toPx(f, ax, ay)
        expect(px).toBeCloseTo(f.anchor.left, 3)
        expect(py).toBeCloseTo(f.anchor.top, 3)
        // 판은 무대 위 · 오른쪽 끝을 넘지 않는다
        expect(f.anchor.top - LEADER - plate.h).toBeGreaterThanOrEqual(0)
        expect(f.anchor.left - 16 + plate.w).toBeLessThanOrEqual(stage.w)
        // 건물은 무대 안 (아래 흐림 띠 위)
        const b = subjectBox(place, look.state)
        const [, by1] = toPx(f, b.x0, b.y1)
        const [bx0] = toPx(f, b.x0, b.y0)
        expect(by1).toBeLessThanOrEqual(stage.h - 40)
        expect(bx0).toBeGreaterThanOrEqual(0)
      })
    }
  }
})

describe('좁은 화면 장면 자리', () => {
  for (const place of PLACES) {
    it(`${place} 390×220: 건물이 가운데, 무대 안`, () => {
      const look = buildingLook(place, '2026-10-17')
      const stage = { w: 390, h: 220 }
      const f = narrowFrame(place, look.state, stage)
      const b = subjectBox(place, look.state)
      const [x0, y0] = toPx(f, b.x0, b.y0)
      const [x1, y1] = toPx(f, b.x1, b.y1)
      expect(x0).toBeGreaterThanOrEqual(0)
      expect(y0).toBeGreaterThanOrEqual(0)
      expect(x1).toBeLessThanOrEqual(stage.w)
      expect(y1).toBeLessThanOrEqual(stage.h)
      expect(Math.abs((x0 + x1) / 2 - stage.w / 2)).toBeLessThan(1)
    })
  }
})
