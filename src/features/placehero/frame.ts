import { PLACE_BY_ID } from '@/config/places'
import type { Footprint } from '@/domain/types'
import type { Box } from '@/lib/fit'
import { iso, isoBounds, type Point3 } from '@/lib/iso'
import { FLOOR, buildingBox } from '@/features/campus/geometry'
import { ROOF_RISE, SCREEN } from '@/features/campus/roofs/heights'
import type { HeroPlace, HeroState } from './look'

/**
 * 하위 페이지 머리 장면의 자리 계산 (DOM 없음 → 테스트 가능).
 * 홈 지도와 같은 격자 · 같은 좌표를 쓰고 viewBox 만 그 건물 쪽으로 옮긴다 = 홈에서 건물을 눌러 '들어온' 자리.
 */

export const footprintOf = (place: HeroPlace): Footprint => PLACE_BY_ID[place].footprint!

/* ── 공사 중 (비계 + 가림막) 치수, 격자 단위 ── */
export const SCAFFOLD = {
  /** 벽(L면)에서 안쪽 · 바깥쪽 기둥 줄까지 */
  inner: 0.2,
  outer: 0.52,
  /** 처마 위로 솟는 난간 높이 */
  rail: 0.42,
  /** 발판 높이 */
  decks: [0.56],
} as const

export const HOARDING = {
  /** 벽에서 떨어진 거리 */
  gap: 0.86,
  h: 0.92,
  /** L면 가림막이 건물 뒤쪽(-x)으로 더 나간 길이 */
  back: 0.42,
  /** R면 가림막이 시작하는 자리 (건물 뒤쪽 끝에서) */
  rStart: 0.35,
} as const

/** 가림막 네 귀퉁이: L면 판(+y 를 봄)과 R면 판(+x 를 봄)이 앞 모서리에서 만난다 */
export function hoardingLines(fp: Footprint) {
  const { x, y, w, d } = fp
  const yl = y + d + HOARDING.gap
  const xr = x + w + HOARDING.gap
  return {
    /** L면 판: (x0 → x1, y = yl) */
    l: { x0: x - HOARDING.back, x1: xr, y: yl },
    /** R면 판: (y0 → y1, x = xr) */
    r: { y0: y + HOARDING.rStart, y1: yl, x: xr },
  }
}

function constructionBox(fp: Footprint): Box {
  const { l, r } = hoardingLines(fp)
  const top = FLOOR + fp.h + SCAFFOLD.rail
  return isoBounds([
    [l.x0, l.y, 0],
    [l.x1, l.y, 0],
    [l.x0, l.y, HOARDING.h],
    [r.x, r.y0, HOARDING.h],
    [fp.x - 0.1, fp.y + fp.d + SCAFFOLD.outer, top],
    [fp.x + fp.w + 0.1, fp.y + fp.d + SCAFFOLD.outer, top],
  ])
}

const union = (a: Box, b: Box): Box => ({ x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) })

/** 장면에서 꼭 보여야 하는 것: 건물 (+ 공사 중이면 비계 · 가림막). SVG 좌표 */
export function subjectBox(place: HeroPlace, state: HeroState): Box {
  const fp = footprintOf(place)
  const b = buildingBox(fp)
  return state === 'construction' ? union(b, constructionBox(fp)) : b
}

/**
 * 안내판을 매다는 자리: 지붕에서 화면상 가장 높고 오른쪽인 곳.
 * 판은 지시선 위에서 오른쪽으로 펼쳐지므로, 그 오른쪽 아래로는 지붕이 낮아져 판이 지붕을 덮지 않는다.
 * (홈 지도의 이름표 자리 SIGN_AT 은 광장 깃발 이름표를 피하려고 가운데에 있어서 여기서는 따로 둔다)
 */
export function plateAnchor(fp: Footprint): Point3 {
  const top = FLOOR + fp.h
  switch (fp.roof) {
    case 'screen':
      return [fp.x + SCREEN.dx + SCREEN.w - 0.22, fp.y + SCREEN.dy, top + ROOF_RISE.screen]
    case 'saw':
      return [fp.x + fp.w - 0.22, fp.y + fp.d / 3, top + ROOF_RISE.saw]
    case 'arch':
      return [fp.x + fp.w - 0.3, fp.y + fp.d / 2, top + ROOF_RISE.arch]
    case 'gable':
      // 용마루 뒤 끝 (앞 박공 꼭짓점에 매달면 용마루가 판 밑으로 들어간다)
      return [fp.x + fp.w / 2, fp.y + 0.12, top + ROOF_RISE.gable]
  }
}

export interface StageSize {
  w: number
  h: number
}

export interface HeroFrame {
  /** SVG viewBox (x y w h) */
  vb: { x: number; y: number; w: number; h: number }
  /** 화면 px / SVG 단위 */
  k: number
  /** 안내판 지시선 발 자리 (무대 왼쪽 위 기준 px) */
  anchor: { left: number; top: number }
}

/** 안내판 지시선 길이 (px) · 판 왼쪽 끝에서 지시선까지 (여백 12 + 표식 8 의 절반) */
export const LEADER = 32
export const PLATE_INSET = 16

/** 넓은 화면 배율 범위 (홈 지도는 1440 에서 ≈1.1) */
export const K_WIDE = { min: 0.8, max: 1.4 } as const
/** 좁은 화면 배율 상한 */
export const K_NARROW_MAX = 1.05

const WIDE = {
  /** 판 위 여백 */
  top: 2,
  /** 건물 받침 아래로 남길 땅 (아래 흐림 띠 높이쯤) */
  bottom: 52,
  /** 왼쪽 흐림 띠 · 오른쪽 끝 여백 (무대가 넓으면 남는 폭을 나눠 건물이 흐림 띠에서 더 멀어진다) */
  left: 40,
  right: 20,
  /** 장면이 아주 넓어도 건물 + 판을 글자 쪽에 붙여 둔다 */
  span: 820,
} as const

const toViewBox = (sx: number, sy: number, k: number, ax: number, ay: number, stage: StageSize): HeroFrame['vb'] => ({
  x: sx - ax / k,
  y: sy - ay / k,
  w: stage.w / k,
  h: stage.h / k,
})

/**
 * 넓은 화면: 글자 오른쪽 무대에 건물을 두고, 지붕에서 지시선 → 안내판(HTML)을 세운다.
 * 판 높이(행 수에 따라 다름) + 지시선 + 지시선 아래 건물이 무대 높이에 들어가게 배율을 고르고,
 * 남는 높이는 위아래로 나눈다. 가로는 (건물 왼쪽 끝 ~ 판 오른쪽 끝) 덩어리를 무대 가운데에.
 * bleed: 무대가 본문 틀 밖(화면 끝)으로 나간 길이. 판 오른쪽 끝은 본문 틀 오른쪽 끝을 넘지 않는다.
 */
export function wideFrame(place: HeroPlace, state: HeroState, stage: StageSize, plate: StageSize | null, bleed = 0): HeroFrame {
  const fp = footprintOf(place)
  const b = subjectBox(place, state)
  const [sx, sy] = iso(...(plateAnchor(fp) as [number, number, number]))
  const p = plate ?? { w: 0, h: 0 }
  const lead = plate ? LEADER : 0
  const above = WIDE.top + p.h + lead
  const below = Math.max(1, b.y1 - sy)
  const room = stage.h - above - WIDE.bottom
  // 판이 없으면 건물 위도 보여야 한다
  const kV = plate ? room / below : (stage.h - WIDE.top - WIDE.bottom) / (b.y1 - b.y0)
  const right = WIDE.left + Math.min(stage.w - WIDE.left - Math.max(WIDE.right, bleed), WIDE.span)
  const avail = right - WIDE.left
  const leftPart = Math.max(1, sx - b.x0)
  const plateRight = Math.max(0, p.w - PLATE_INSET)
  const kH = (avail - plateRight) / leftPart
  const k = Math.max(K_WIDE.min, Math.min(K_WIDE.max, kV, kH))

  const comp = leftPart * k + Math.max(plateRight, (b.x1 - sx) * k)
  const left = WIDE.left + Math.max(0, (avail - comp) / 2)
  // 가장 작은 배율로도 안 들어가면 판이 무대 밖으로 나가지 않게 덩어리를 왼쪽으로 민다 (가로 넘침 금지)
  const ax = Math.min(left + leftPart * k, right - plateRight)
  const slack = Math.max(0, room - below * k)
  const ay = plate ? above + slack / 2 : WIDE.top + (sy - b.y0) * k + slack / 2
  return { vb: toViewBox(sx, sy, k, ax, ay, stage), k, anchor: { left: ax, top: ay } }
}

/** 안내판을 글자 쪽에 둘 때 건물 배율 상한 (넓은 화면에서 건물이 무대를 채우는 크기) */
export const K_FOCUS_MAX = 2.1

/**
 * 넓은 화면, 안내판이 글자 쪽에 있을 때 (프로젝트): 지붕 위를 비워 둘 까닭이 없으니 건물을 무대 가운데에 크게 둔다.
 * 무대는 본문 틀 안에서 끝나고 양옆이 흐려지므로, 양옆 흐림 띠를 빼고 가운데에. 아래는 받침 아래 땅을 남긴다.
 */
export function focusFrame(place: HeroPlace, state: HeroState, stage: StageSize, bleed = 0): HeroFrame {
  const fp = footprintOf(place)
  const b = subjectBox(place, state)
  // 양옆 흐림 띠(96) + 24 를 비우고 가운데에 (장면이 화면 끝까지 나가면 그 몫도 뺀다)
  const pad = { t: 40, b: WIDE.bottom + 12, l: 120, r: 120 + bleed }
  const availW = Math.max(1, stage.w - pad.l - pad.r)
  const availH = Math.max(1, stage.h - pad.t - pad.b)
  const k = Math.max(K_WIDE.min, Math.min(K_FOCUS_MAX, availW / (b.x1 - b.x0), availH / (b.y1 - b.y0)))
  const vb = toViewBox((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, k, pad.l + availW / 2, pad.t + availH / 2, stage)
  const [sx, sy] = iso(...(plateAnchor(fp) as [number, number, number]))
  return { vb, k, anchor: { left: (sx - vb.x) * k, top: (sy - vb.y) * k } }
}

/** 좁은 화면: 건물(+ 공사 비계)을 무대 가운데에. 안내판은 장면 아래 글 목록이 맡는다 */
export function narrowFrame(place: HeroPlace, state: HeroState, stage: StageSize): HeroFrame {
  const fp = footprintOf(place)
  const b = subjectBox(place, state)
  const pad = { t: 18, b: 26, l: 24, r: 24 }
  const k = Math.min(K_NARROW_MAX, (stage.w - pad.l - pad.r) / (b.x1 - b.x0), (stage.h - pad.t - pad.b) / (b.y1 - b.y0))
  const cx = (b.x0 + b.x1) / 2
  const cy = (b.y0 + b.y1) / 2
  const px = pad.l + (stage.w - pad.l - pad.r) / 2
  const py = pad.t + (stage.h - pad.t - pad.b) / 2
  const [sx, sy] = iso(...(plateAnchor(fp) as [number, number, number]))
  const vb = toViewBox(cx, cy, k, px, py, stage)
  return { vb, k, anchor: { left: (sx - vb.x) * k, top: (sy - vb.y) * k } }
}

export const viewBoxString = (vb: HeroFrame['vb']) => `${vb.x.toFixed(1)} ${vb.y.toFixed(1)} ${vb.w.toFixed(1)} ${vb.h.toFixed(1)}`
