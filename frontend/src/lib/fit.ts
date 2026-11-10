/**
 * 장면을 화면의 '빈 자리'에 맞추는 계산.
 * 카드(HUD)가 덮지 않는 사각형(free) 안에 장면 경계(bbox)가 꽉 차도록 배율을 정하고,
 * 그 배율로 SVG viewBox 를 만든다. DOM 을 건드리지 않는 순수 함수라 테스트하기 쉽다.
 */

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface FitInput {
  /** 장면 내용의 경계 (SVG 좌표) */
  bbox: Rect
  /** SVG 요소의 화면 크기 (px) */
  frame: { w: number; h: number }
  /** 장면을 놓을 빈 자리 (SVG 요소 기준 px) */
  free: { x0: number; y0: number; x1: number; y1: number }
  maxScale?: number
}

export interface FitResult {
  viewBox: string
  scale: number
}

export function fitViewBox({ bbox, frame, free, maxScale = 1.7 }: FitInput): FitResult {
  const fw = Math.max(1, free.x1 - free.x0)
  const fh = Math.max(1, free.y1 - free.y0)
  const scale = Math.min(fw / bbox.w, fh / bbox.h, maxScale)
  const cx = (free.x0 + free.x1) / 2
  const cy = (free.y0 + free.y1) / 2
  const vx = bbox.x + bbox.w / 2 - cx / scale
  const vy = bbox.y + bbox.h / 2 - cy / scale
  const viewBox = [vx, vy, frame.w / scale, frame.h / scale].map((n) => n.toFixed(1)).join(' ')
  return { viewBox, scale }
}

/** 장면이 작게 그려질수록 이름표 핀을 키운다 (최대 1.75배) */
export const pinScaleFor = (sceneScale: number) => Math.min(1.75, Math.max(1, 1.02 / sceneScale))

/** 화면 위 사각형 (왼쪽 위 x0,y0 ~ 오른쪽 아래 x1,y1) */
export interface Box {
  x0: number
  y0: number
  x1: number
  y1: number
}

export const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1

export interface AvoidInput {
  /** 장면 내용의 경계 (SVG 좌표) */
  bbox: Rect
  /** SVG 요소의 화면 크기 (px) */
  frame: { w: number; h: number }
  /** 장면 경계가 들어가야 하는 자리 (px). 바닥은 카드 밑으로 들어가도 된다 */
  bounds: Box
  /** 장면 가운데를 되도록 이 자리 가운데에 둔다 (px) */
  prefer: Box
  /** 장면을 덮는 카드들 (px) */
  obstacles: readonly Box[]
  /** 카드에 가려지면 안 되는 것: 건물 · 이름표 (SVG 좌표). 배율에 따라 이름표 크기가 바뀌어서 함수로 받는다 */
  targets: (scale: number) => readonly Box[]
  maxScale?: number
  minScale?: number
}

/** 배율을 0.02씩 줄여 가며, 한 배율에서 자리 후보를 이만큼 잘게 나눠 본다 */
const SCALE_STEP = 0.02
const GRID_STEPS = 16

/**
 * 카드를 피해서 장면을 '가능한 한 크게' 놓는 계산.
 * 바닥(땅)은 카드 밑으로 들어가도 되지만, 건물과 이름표는 카드에 가리면 안 된다.
 * 큰 배율부터 내려오며, 그 배율에서 가능한 자리 중 prefer 가운데에 가장 가까운 자리를 고른다.
 * 어느 배율에서도 못 찾으면 예전 방식(fitViewBox)으로 prefer 안에 맞춘다.
 */
export function fitAvoiding({ bbox, frame, bounds, prefer, obstacles, targets, maxScale = 1.7, minScale = 0.3 }: AvoidInput): FitResult {
  const pcx = (prefer.x0 + prefer.x1) / 2
  const pcy = (prefer.y0 + prefer.y1) / 2
  for (let s = maxScale; s >= minScale - 1e-9; s -= SCALE_STEP) {
    const bw = bbox.w * s
    const bh = bbox.h * s
    const spanX = bounds.x1 - bounds.x0 - bw
    const spanY = bounds.y1 - bounds.y0 - bh
    if (spanX < 0 || spanY < 0) continue
    const ts = targets(s)
    const candidates: Array<{ ox: number; oy: number; d: number }> = []
    for (let i = 0; i <= GRID_STEPS; i++) {
      for (let j = 0; j <= GRID_STEPS; j++) {
        const ox = bounds.x0 + (spanX * i) / GRID_STEPS
        const oy = bounds.y0 + (spanY * j) / GRID_STEPS
        candidates.push({ ox, oy, d: (ox + bw / 2 - pcx) ** 2 + (oy + bh / 2 - pcy) ** 2 })
      }
    }
    candidates.sort((a, b) => a.d - b.d)
    for (const { ox, oy } of candidates) {
      const clear = ts.every((t) => {
        const box = { x0: ox + (t.x0 - bbox.x) * s, y0: oy + (t.y0 - bbox.y) * s, x1: ox + (t.x1 - bbox.x) * s, y1: oy + (t.y1 - bbox.y) * s }
        return obstacles.every((o) => !overlaps(box, o))
      })
      if (clear) {
        const viewBox = [bbox.x - ox / s, bbox.y - oy / s, frame.w / s, frame.h / s].map((n) => n.toFixed(1)).join(' ')
        return { viewBox, scale: s }
      }
    }
  }
  return fitViewBox({ bbox, frame, free: prefer, maxScale })
}
