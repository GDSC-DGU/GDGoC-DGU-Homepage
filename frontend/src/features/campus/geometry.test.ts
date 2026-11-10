import { describe, expect, it } from 'vitest'
import { PLACES } from '@/config/places'
import { overlaps, type Box } from '@/lib/fit'
import { estimateLabelWidth, labelScaleFor, NARROW_MIN_PX, plateGeometry, sceneTargets, SIGN, signAlign, signBox } from './geometry'
import { SCENE_BOUNDS, SCENE_BOUNDS_NARROW } from './layout'
import { fitScene, minLabelPx, type SceneLayout } from './sceneFit'

const inside = (b: Box, r: { x: number; y: number; w: number; h: number }) => b.x0 >= r.x && b.y0 >= r.y && b.x1 <= r.x + r.w && b.y1 <= r.y + r.h

/** 서로 겹치는 안내판 쌍 (이름으로) */
function overlappingSigns(k: number, flip: boolean, compact: boolean): string[] {
  const boxes = PLACES.map((p) => ({ id: p.id, box: signBox(p, { pinScale: k, flip, compact }) }))
  const hits: string[] = []
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) if (overlaps(boxes[i].box, boxes[j].box)) hits.push(`${boxes[i].id}↔${boxes[j].id}`)
  }
  return hits
}

/** 화면 전체를 장면 자리로 주는 배치 (첫 화면에서 지도 위에 카드가 없을 때) */
const full = (w: number, h: number, m = 8): SceneLayout => {
  const b = { x0: m, y0: m, x1: w - m, y1: h - m }
  return { bounds: b, prefer: b, obstacles: [] }
}

/** viewBox 를 읽어 SVG 좌표 상자를 화면 px 로 */
function toScreen(viewBox: string, frameW: number) {
  const [vx, vy, vw] = viewBox.split(' ').map(Number)
  const s = frameW / vw
  return (b: Box): Box => ({ x0: (b.x0 - vx) * s, y0: (b.y0 - vy) * s, x1: (b.x1 - vx) * s, y1: (b.y1 - vy) * s })
}

describe('안내판 모양', () => {
  it('기본: 판이 지시선 오른쪽으로, 지시선은 장소색 네모 밑으로 들어간다', () => {
    const g = plateGeometry(60, 'start', false)
    expect(g.x0).toBe(-(SIGN.padX + SIGN.mark / 2))
    expect(g.line).toEqual({ x1: 0, y1: 0, x2: 0, y2: -SIGN.leader })
    expect(g.y0 + g.height).toBe(-SIGN.leader)
    expect(g.height).toBe(SIGN.padY * 2 + SIGN.line)
  })

  it('오른쪽 끝 장소(flip): 판이 지시선 왼쪽으로 펼쳐진다', () => {
    const g = plateGeometry(60, 'end', false)
    expect(g.x0 + g.width).toBe(SIGN.padX + SIGN.mark / 2)
    expect(g.x0).toBeLessThan(-60)
  })

  it('광장 깃발: 판을 깃대 왼쪽에 매단다', () => {
    const g = plateGeometry(80, 'hang', false)
    expect(g.x0 + g.width).toBe(-SIGN.hang)
    expect(g.y0).toBe(0)
  })

  it('검색 건수가 있으면 판 오른쪽 끝에 뱃지 자리만큼 넓어진다', () => {
    expect(plateGeometry(60, 'start', false, 3).width - plateGeometry(60, 'start', false, 0).width).toBe(SIGN.badgeGap + SIGN.badge)
  })

  it('flip 은 화면 오른쪽 장소(프로젝트)만 돌리고, 깃발은 늘 매단다', () => {
    const align = Object.fromEntries(PLACES.map((p) => [p.id, signAlign(p, true)]))
    expect(align).toEqual({ about: 'hang', community: 'start', projects: 'end', teams: 'start', recruits: 'start' })
  })

  it('글자 폭 어림값은 실제 Pretendard 600 15px 폭보다 작지 않다 (자리 계산이 모자라지 않게)', () => {
    // 브라우저에서 잰 값 (2026-10, getComputedTextLength. '팀원 찾기' 는 이름을 바꾼 2026-10-18 에 다시 잼)
    const measured: Record<string, number> = { 커뮤니티: 51.5, 프로젝트: 51.5, '팀원 찾기': 55, '지원 안내': 54.9, 'GDGoC DGU': 86.2 }
    for (const [label, w] of Object.entries(measured)) expect(estimateLabelWidth(label)).toBeGreaterThanOrEqual(w)
  })
})

describe('안내판 크기', () => {
  it('장면이 아무리 작아도 글자는 13px 아래로, 커도 16px 위로 가지 않는다', () => {
    for (let s = 0.3; s <= 1.7; s += 0.05) {
      const px = SIGN.font * s * labelScaleFor(s, NARROW_MIN_PX)
      expect(px).toBeGreaterThanOrEqual(13 - 1e-9)
      expect(px).toBeLessThanOrEqual(16 + 1e-9)
    }
  })
})

describe('장면 경계', () => {
  it('데스크톱: 건물 · 깃발 · 안내판이 모두 SCENE_BOUNDS 안에 든다', () => {
    for (const t of sceneTargets({ pinScale: 1, flip: false })) expect(inside(t, SCENE_BOUNDS)).toBe(true)
    for (const t of sceneTargets({ pinScale: 1, flip: true })) expect(inside(t, SCENE_BOUNDS)).toBe(true)
  })

  it('폰: 13px 로 키운 작은 안내판까지 SCENE_BOUNDS_NARROW 안에 든다', () => {
    const s = 390 / SCENE_BOUNDS_NARROW.w
    const k = labelScaleFor(s, NARROW_MIN_PX)
    for (const t of sceneTargets({ pinScale: k, flip: true, compact: true })) expect(inside(t, SCENE_BOUNDS_NARROW)).toBe(true)
  })

  it('경계는 꼭 맞다: 위아래 · 좌우 여유가 12 이하', () => {
    const ts = sceneTargets({ pinScale: 1, flip: false })
    const x0 = Math.min(...ts.map((t) => t.x0))
    const x1 = Math.max(...ts.map((t) => t.x1))
    const y0 = Math.min(...ts.map((t) => t.y0))
    const y1 = Math.max(...ts.map((t) => t.y1))
    expect(x0 - SCENE_BOUNDS.x).toBeLessThanOrEqual(12)
    expect(SCENE_BOUNDS.x + SCENE_BOUNDS.w - x1).toBeLessThanOrEqual(12)
    expect(y0 - SCENE_BOUNDS.y).toBeLessThanOrEqual(12)
    expect(SCENE_BOUNDS.y + SCENE_BOUNDS.h - y1).toBeLessThanOrEqual(12)
  })
})

describe('안내판끼리 겹치지 않는다', () => {
  it('데스크톱 배율 1.0 (펼침 방향 둘 다)', () => {
    expect(overlappingSigns(1, false, false)).toEqual([])
    expect(overlappingSigns(1, true, false)).toEqual([])
  })

  it('폰 배율 (390px, flip, 작은 판)', () => {
    const { labelScale } = fitScene({ frame: { w: 390, h: 320 }, layout: full(390, 320, 6), narrow: true, flip: true, compact: true })
    expect(labelScale).toBeGreaterThan(1.5)
    expect(overlappingSigns(labelScale, true, true)).toEqual([])
  })
})

describe('첫 화면 크기별 맞추기 (카드 없이 전체 폭)', () => {
  const cases: Array<[string, number, number, boolean]> = [
    ['1920×640', 1920, 640, false],
    ['1440×540', 1440, 540, false],
    ['1280×440', 1280, 440, false],
    ['1200×440', 1200, 440, false],
    ['390×320', 390, 320, true],
  ]
  for (const [name, w, h, narrow] of cases) {
    it(`${name}: 건물 · 안내판이 화면 안에 다 들어오고, 글자는 하한 이상`, () => {
      const r = fitScene({ frame: { w, h }, layout: full(w, h), narrow, flip: narrow, compact: narrow })
      const px = toScreen(r.viewBox, w)
      for (const t of sceneTargets({ pinScale: r.labelScale, flip: narrow, compact: narrow }).map(px)) {
        expect(t.x0).toBeGreaterThanOrEqual(0)
        expect(t.y0).toBeGreaterThanOrEqual(0)
        expect(t.x1).toBeLessThanOrEqual(w)
        expect(t.y1).toBeLessThanOrEqual(h)
      }
      expect(SIGN.font * r.scale * r.labelScale).toBeGreaterThanOrEqual(minLabelPx(narrow) - 1e-9)
    })
  }

  it('높이가 정해진 넓은 화면에서는 높이를 꽉 채운다 (1920×640 에서 배율 1.15 이상)', () => {
    expect(fitScene({ frame: { w: 1920, h: 640 }, layout: full(1920, 640), narrow: false, flip: false, compact: false }).scale).toBeGreaterThanOrEqual(1.15)
  })
})
