/**
 * 3D 지도의 카메라 계산 (DOM · three 없음 → 테스트 가능).
 *
 * 격자 좌표 (x, y, 높이 z) → 3D 세계 (X = x, Y = z · Z_SCALE, Z = y).
 * 카메라가 방위 45° · 고도 30° 직교 투영이고, 높이를 Z_SCALE 만큼 눌러 두면
 * lib/iso.ts 의 iso() (가로 64 · 세로 32 타일, 높이 1칸 = 32) 와 화면 위 자리가 정확히 같다.
 * → SVG 지도를 '첫 그림(포스터)'으로 먼저 보여 주고, 3D 가 준비되면 같은 자리에 겹쳐 바꿔 끼울 수 있다.
 */

/** 화면에서 격자 1칸(x-y 대각선 방향)이 차지하는 px: 32·√2 */
export const ISO_UNIT = 32 * Math.SQRT2
/** iso() 와 같은 그림이 나오는 카메라 */
export const ISO_AZ = Math.PI / 4
export const ISO_EL = Math.PI / 6
/** 높이를 누르는 비율: iso() 의 높이 1칸(32px) ÷ 고도 30° 직교 투영의 높이 1칸(ISO_UNIT·cos30°) */
export const Z_SCALE = 32 / (ISO_UNIT * Math.cos(ISO_EL))

export type V3 = [number, number, number]

/** 카메라 자세: 땅 위 바라보는 점(tx, tz) · 방위 · 고도 · 확대(px / 세계 1단위) */
export interface Pose {
  tx: number
  tz: number
  az: number
  el: number
  zoom: number
}

export interface ViewBox {
  x: number
  y: number
  w: number
  h: number
}

export const parseViewBox = (vb: string): ViewBox => {
  const [x, y, w, h] = vb.split(/[\s,]+/).map(Number)
  return { x, y, w, h }
}

const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

/** 카메라의 오른쪽 · 위 · (바라보는 점에서 카메라 쪽) 방향 */
export function basis(az: number, el: number): { right: V3; up: V3; back: V3 } {
  const [sa, ca, se, ce] = [Math.sin(az), Math.cos(az), Math.sin(el), Math.cos(el)]
  return {
    right: [ca, 0, -sa],
    up: [-se * sa, ce, -se * ca],
    back: [ce * sa, se, ce * ca],
  }
}

/** 격자 점 → 세계 점 */
export const world = (x: number, y: number, z = 0): V3 => [x, z * Z_SCALE, y]

/** 세계 점이 화면(틀 가운데 기준 px, 아래가 +)에서 놓이는 자리 */
export function project(p: V3, pose: Pose): [number, number] {
  const { right, up } = basis(pose.az, pose.el)
  const d: V3 = [p[0] - pose.tx, p[1], p[2] - pose.tz]
  return [dot(right, d) * pose.zoom, -dot(up, d) * pose.zoom]
}

/** 바라보는 점(세계)을 화면이 같은 곳(시선 방향)으로 땅(Y=0)까지 옮긴다 */
function ground(t: V3, back: V3): { tx: number; tz: number } {
  const k = t[1] / back[1]
  return { tx: t[0] - back[0] * k, tz: t[2] - back[2] * k }
}

/**
 * SVG viewBox(preserveAspectRatio xMinYMin meet) 와 같은 그림이 나오는 카메라.
 * frame: 그림이 그려지는 상자 크기 (px)
 */
export function poseFromViewBox(vb: ViewBox, frame: { w: number; h: number }): Pose {
  const k = Math.min(frame.w / vb.w, frame.h / vb.h)
  // 화면 가운데가 SVG 좌표로 어디인가
  const cx = vb.x + frame.w / (2 * k)
  const cy = vb.y + frame.h / (2 * k)
  const { right, up, back } = basis(ISO_AZ, ISO_EL)
  const a = cx / ISO_UNIT
  const b = -cy / ISO_UNIT
  const t: V3 = [a * right[0] + b * up[0], a * right[1] + b * up[1], a * right[2] + b * up[2]]
  return { ...ground(t, back), az: ISO_AZ, el: ISO_EL, zoom: ISO_UNIT * k }
}

/**
 * 세계 점 p 가 화면(틀 가운데 기준) offset 자리에 오도록 하는 바라보는 점.
 * 방위 · 고도 · 확대는 pose 그대로.
 */
export function aimAt(p: V3, offset: [number, number], pose: Omit<Pose, 'tx' | 'tz'>): Pose {
  const { right, up, back } = basis(pose.az, pose.el)
  const [dx, dy] = offset
  const t: V3 = [
    p[0] - (right[0] * dx) / pose.zoom + (up[0] * dy) / pose.zoom,
    p[1] - (right[1] * dx) / pose.zoom + (up[1] * dy) / pose.zoom,
    p[2] - (right[2] * dx) / pose.zoom + (up[2] * dy) / pose.zoom,
  ]
  return { ...pose, ...ground(t, back) }
}

/** 두 자세 사이 (방위는 짧은 쪽으로) */
export function mixPose(a: Pose, b: Pose, t: number): Pose {
  const m = (u: number, v: number) => u + (v - u) * t
  return { tx: m(a.tx, b.tx), tz: m(a.tz, b.tz), az: m(a.az, b.az), el: m(a.el, b.el), zoom: a.zoom * Math.pow(b.zoom / a.zoom, t) }
}

/** 부드럽게 시작해 부드럽게 멈춤 */
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
