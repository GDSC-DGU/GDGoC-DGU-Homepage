/**
 * anatomy(iso-kit) 를 캠퍼스 격자에 맞춘 어댑터.
 *
 * 캠퍼스 격자(lib/iso.ts)는 64×32 타일, 높이 1칸 = 화면 32. anatomy 카메라(방위 45° · 고도 30°)는
 * 바닥은 같은 2:1 이지만 높이가 0.866 배 더 길다. 그래서 격자 z 를 ZK 배 해서 넘기면
 * k.iso(…) 가 lib/iso.ts 의 iso(…) 와 소수점까지 같은 자리를 돌려준다 (anatomy.test.ts 가 확인).
 * 바닥 치수 · 둥근 모서리 · 경사 · 깎은 면(bevel)은 모두 격자 단위로 받는다.
 *
 * 여기 있는 것은 모두 순수 함수(문자열 path 를 돌려줌)라서 모듈을 불러올 때 한 번 계산해 둘 수 있다.
 */
import * as k from '@/vendor/anatomy/iso-kit'
import type { Flat, Plan, Plane, Projection, SolidPaths } from '@/vendor/anatomy/iso-kit'

export type { Plan, Plane, SolidPaths, Flat }
export type V3 = readonly [number, number, number]

const SCALE = 32 / Math.SQRT1_2 / Math.sqrt(1.6)
/** 캠퍼스 격자 투영과 같은 anatomy 카메라 */
export const P: Projection = { origin: [0, 0], scale: SCALE, azimuth: 45, elevation: 30 }
/** 격자 높이 → anatomy 높이 */
export const ZK = Math.SQRT1_2 / Math.cos(Math.PI / 6)

const w = ([x, y, z]: V3): [number, number, number] => [x, y, z * ZK]

/** 격자 점 → 화면 점 */
export const at = (x: number, y: number, z = 0): Flat => k.iso([x, y, z * ZK], P)
export const pathOf = k.pathOf

/* ── 바닥에서 세운 기둥 꼴 (anatomy 그대로) ───────────────────────── */

export const slab = (plan: Plan, z0: number, h: number, steps = 4, bevel = 0) => k.slabOf(plan, z0 * ZK, h * ZK, P, steps, bevel)
export const cyl = (cx: number, cy: number, r: number, z0: number, h: number, steps = 20, bevel = 0) =>
  k.cylinder(cx, cy, r, z0 * ZK, h * ZK, P, steps, bevel)
export const extrude = (ring: Plane[], z0: number, h: number, opts: k.ExtrudeOptions = {}) => k.extrude(ring, z0 * ZK, h * ZK, P, opts)
export const inset = k.insetPlan
export const corners = k.corners
export const ringOf = k.ringOf

/* ── 면 위의 선 ───────────────────────────────────────────── */

/** 상자 옆면을 한 바퀴 두르는 줄눈 (모서리를 돌아 실루엣에서 끝난다) */
export const seam = (plan: Plan, z: number, steps = 4) => k.sideSeam(plan, z * ZK, P, steps)
export const ringSeam = (ring: Plane[], z: number) => k.ringSeam(ring, z * ZK, P)
/** 원기둥 옆면 띠 */
export const arc = (cx: number, cy: number, r: number, z: number, steps = 16) => k.sideArc(cx, cy, r, z * ZK, P, steps)
export const planOutline = (plan: Plan, z: number, steps = 4) => k.planOutline(plan, z * ZK, P, steps)
export const ring = (cx: number, cy: number, r: number, z: number, steps = 24) => k.ring(cx, cy, r, z * ZK, P, steps)
export const onTop = (points: Plane[], z: number, closed = false) => k.onTop(points, z * ZK, P, closed)
export const seg = (a: V3, b: V3) => k.segment(w(a), w(b), P)
export const line3 = (list: readonly V3[], closed = false) => k.pathOf(list.map((p) => k.iso(w(p), P)), closed)
export const dots = (list: readonly V3[]): Flat[] => list.map((p) => k.iso(w(p), P))
export const radialTicks = (cx: number, cy: number, r: number, count: number, every: number, z: number, lengths: [number, number]) =>
  k.radialTicks(cx, cy, r, count, every, z * ZK, lengths, P)
export const topTicks = (from: number, to: number, step: number, every: number, edge: number, z: number, lengths: [number, number], axis: 'x' | 'y' = 'x') =>
  k.topTicks(from, to, step, every, edge, z * ZK, lengths, P, axis)

/**
 * 세로 면 위의 둥근 사각형 윤곽 (창 · 문 · 이름판).
 * face 'L' = +y 면(y = at), 'R' = +x 면(x = at). u 는 면을 따라 가는 좌표(L 이면 x, R 이면 y).
 */
export function faceRect(face: 'L' | 'R', at: number, u0: number, u1: number, z0: number, z1: number, r = 0, steps = 3): string {
  const p = (u: number, z: number): V3 => (face === 'L' ? [u, at, z] : [at, u, z])
  if (r <= 0) return line3([p(u0, z0), p(u1, z0), p(u1, z1), p(u0, z1)], true)
  const out: V3[] = []
  const c: Array<[number, number, number]> = [
    [u1 - r, z1 - r, 0],
    [u1 - r, z0 + r, -90],
    [u0 + r, z0 + r, -180],
    [u0 + r, z1 - r, 90],
  ]
  for (const [cu, cz, a0] of c) {
    for (let i = 0; i <= steps; i++) {
      const a = ((a0 - (90 * i) / steps) * Math.PI) / 180
      out.push(p(cu + r * Math.cos(a), cz + r * Math.sin(a)))
    }
  }
  return line3(out, true)
}

/** 세로 면 위의 점 (L: +y 면, R: +x 면) */
export const onFace = (face: 'L' | 'R', at: number, u: number, z: number): V3 => (face === 'L' ? [u, at, z] : [at, u, z])

/* ── 바닥에 세우지 않는 입체 (지붕 · 톱니 · 아치 · 원뿔 · 공) ─────────────── */

const dot3 = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const sub3 = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const unit3 = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1
  return [a[0] / l, a[1] / l, a[2] / l]
}
const cross3 = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]

const { sinA, cosA, sinE, cosE } = k.cameraOf(P)
/** 보는 사람 쪽 (anatomy viewOf) */
const VIEW: V3 = [cosA * cosE, sinA * cosE, sinE]
/** 빛 (anatomy lathe 의 lightOf: 왼쪽 위에서, 위로 1.2) */
const LIGHT: V3 = unit3([-sinA, cosA, 1.2])
/** anatomy 의 네 단 경계 */
const BANDS = [0, 0.2, 0.42, 0.62]

/**
 * 면 방향 → 칠할 단. 'top' 이거나 0(어두움)~3(밝음).
 * 세로 면은 iso-kit extrude 와 같은 식을, 기운 면은 lathe 의 빛 식을 쓴다 (두 식이 세로 면에서 만나게).
 */
export function toneOfNormal(nw: V3): 'top' | 0 | 1 | 2 | 3 {
  if (nw[2] > 0.93) return 'top'
  if (Math.abs(nw[2]) < 0.04) {
    const len = Math.hypot(nw[0], nw[1]) || 1
    const lit = ((nw[0] / len) * -sinA + (nw[1] / len) * cosA + 1) / 2
    return Math.min(3, Math.max(0, Math.floor(lit * 4))) as 0 | 1 | 2 | 3
  }
  const score = dot3(nw, LIGHT)
  let band = 0
  while (band < BANDS.length && score >= BANDS[band]) band++
  return Math.min(3, Math.max(0, band - 1)) as 0 | 1 | 2 | 3
}

function hull(points: Flat[]): Flat[] {
  const s = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  if (s.length < 3) return s
  const cross = (o: Flat, a: Flat, b: Flat) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower: Flat[] = []
  for (const p of s) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop()
    lower.push(p)
  }
  const upper: Flat[] = []
  for (let i = s.length - 1; i >= 0; i--) {
    const p = s[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop()
    upper.push(p)
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)]
}

export interface PolyFace {
  /** 격자 좌표 꼭짓점 (볼록 다각형) */
  pts: readonly V3[]
  /** 매끈한 곡면의 한 조각: 이웃 조각과 사이에 접힌 선(crease)을 긋지 않는다 */
  smooth?: boolean
  /** 칠 구분 (예: 'roof' 는 장소색, 없으면 벽 토큰). MixedSolid 가 면마다 칠을 고른다 */
  role?: string
}

/** 보이는 면 하나: 화면 path, 칠할 단, 칠 구분 */
export interface FaceOut {
  d: string
  tone: 'top' | 0 | 1 | 2 | 3
  role?: string
}

/**
 * 볼록 다면체 하나를 anatomy SolidPaths 로 (지붕판 · 톱니 · 아치 · 원뿔).
 * 채움 = 화면 위 껍질, 윤곽 = 같은 껍질, 보이는 면은 방향대로 네 단 + 윗면, 보이는 두 면 사이 날카로운 모서리는 crease.
 * 면의 바깥 방향은 입체 가운데에서 멀어지는 쪽으로 맞춘다 (꼭짓점 순서를 신경 쓰지 않아도 된다).
 */
export function polySolid(faces: readonly PolyFace[]): SolidPaths {
  return polyParts(faces).paths
}

/** polySolid 와 같고, 보이는 면 목록을 함께 돌려준다 (면마다 다른 칠) */
export function polyParts(faces: readonly PolyFace[]): { paths: SolidPaths; faces: FaceOut[] } {
  const all = faces.flatMap((f) => f.pts)
  const c = all.reduce<[number, number, number]>((m, p) => [m[0] + p[0] / all.length, m[1] + p[1] / all.length, m[2] + p[2] / all.length], [0, 0, 0])
  const cw = w(c)
  const shades: string[][] = [[], [], [], []]
  const tops: string[] = []
  const edges = new Map<string, { n: number; smooth: number; a: Flat; b: Flat }>()
  let seamless = false
  const out: FaceOut[] = []
  for (const f of faces) {
    const pw = f.pts.map(w)
    let n: V3 = [0, 0, 0]
    for (let i = 0; i < pw.length; i++) {
      const a = pw[i]
      const b = pw[(i + 1) % pw.length]
      n = [n[0] + (a[1] - b[1]) * (a[2] + b[2]), n[1] + (a[2] - b[2]) * (a[0] + b[0]), n[2] + (a[0] - b[0]) * (a[1] + b[1])]
    }
    n = unit3(n)
    const centre = pw.reduce<[number, number, number]>((m, p) => [m[0] + p[0] / pw.length, m[1] + p[1] / pw.length, m[2] + p[2] / pw.length], [0, 0, 0])
    if (dot3(n, sub3(centre, cw)) < 0) n = [-n[0], -n[1], -n[2]]
    if (dot3(n, VIEW) <= 1e-6) continue
    const flat = pw.map((p) => k.iso(p, P))
    const d = k.pathOf(flat, true)
    const tone = toneOfNormal(n)
    out.push({ d, tone, role: f.role })
    if (tone === 'top') tops.push(d)
    else shades[tone].push(d)
    if (f.smooth) seamless = true
    for (let i = 0; i < flat.length; i++) {
      const a = flat[i]
      const b = flat[(i + 1) % flat.length]
      const ka = `${a[0].toFixed(1)},${a[1].toFixed(1)}`
      const kb = `${b[0].toFixed(1)},${b[1].toFixed(1)}`
      const key = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`
      const e = edges.get(key) ?? { n: 0, smooth: 0, a, b }
      e.n++
      if (f.smooth) e.smooth++
      edges.set(key, e)
    }
  }
  const crease = [...edges.values()].filter((e) => e.n === 2 && e.smooth < 2).map((e) => k.pathOf([e.a, e.b]))
  const outline = k.pathOf(hull(all.map((p) => k.iso(w(p), P))), true)
  return { paths: { fill: outline, outline, crease: crease.join(''), top: tops.join(''), shades: shades.map((s) => s.join('')), seamless }, faces: out }
}

/**
 * x 축을 따라 뻗은 기둥 꼴: (y, z) 단면을 x0 → x1 로 민다 (톱니 · 박공 · 아치 지붕).
 * smooth 를 주면 단면의 옆 조각을 곡면으로 본다.
 */
export function prismX(section: ReadonlyArray<readonly [number, number]>, x0: number, x1: number, opts: PrismOptions = {}): PolyFace[] {
  const { smooth = false, sides, caps } = opts
  const faces: PolyFace[] = [
    { pts: section.map(([y, z]) => [x0, y, z] as V3), role: caps },
    { pts: section.map(([y, z]) => [x1, y, z] as V3), role: caps },
  ]
  for (let i = 0; i < section.length; i++) {
    const [ya, za] = section[i]
    const [yb, zb] = section[(i + 1) % section.length]
    faces.push({ pts: [[x0, ya, za], [x1, ya, za], [x1, yb, zb], [x0, yb, zb]], smooth: smooth && i < section.length - 1, role: typeof sides === 'function' ? sides(i) : sides })
  }
  return faces
}

export interface PrismOptions {
  /** 단면 옆 조각을 곡면으로 (마지막 조각 = 밑면은 제외) */
  smooth?: boolean
  /** 옆 조각의 칠 구분 (i = 단면 i → i+1 조각) */
  sides?: string | ((i: number) => string | undefined)
  /** 두 끝면의 칠 구분 */
  caps?: string
}

/** y 축을 따라 뻗은 기둥 꼴: (x, z) 단면을 y0 → y1 로 민다 */
export function prismY(section: ReadonlyArray<readonly [number, number]>, y0: number, y1: number, opts: PrismOptions = {}): PolyFace[] {
  const { smooth = false, sides, caps } = opts
  const faces: PolyFace[] = [
    { pts: section.map(([x, z]) => [x, y0, z] as V3), role: caps },
    { pts: section.map(([x, z]) => [x, y1, z] as V3), role: caps },
  ]
  for (let i = 0; i < section.length; i++) {
    const [xa, za] = section[i]
    const [xb, zb] = section[(i + 1) % section.length]
    faces.push({ pts: [[xa, y0, za], [xa, y1, za], [xb, y1, zb], [xb, y0, zb]], smooth: smooth && i < section.length - 1, role: typeof sides === 'function' ? sides(i) : sides })
  }
  return faces
}

/** 원뿔 (뾰족한 나무). 옆면은 매끈한 조각들 */
export function cone(cx: number, cy: number, r: number, z0: number, h: number, steps = 20): SolidPaths {
  const apex: V3 = [cx, cy, z0 + h]
  const rim: V3[] = Array.from({ length: steps }, (_, i) => {
    const a = (i / steps) * Math.PI * 2
    return [cx + r * Math.cos(a), cy + r * Math.sin(a), z0]
  })
  const faces: PolyFace[] = [{ pts: rim }]
  for (let i = 0; i < steps; i++) faces.push({ pts: [rim[i], rim[(i + 1) % steps], apex], smooth: true })
  return polySolid(faces)
}

/**
 * 공 (둥근 나무 수관 · 깃대 머리). anatomy lathe.sphereOf 를 옮긴 것:
 * 빛 쪽 구면 모자(cap)의 화면 껍질을 네 단으로 겹쳐 칠한다. 다각형 네 개로 매끈한 음영.
 */
export function sphere(centre: V3, r: number, steps = 40): SolidPaths {
  const c = w(centre)
  const frame = (axis: V3) => {
    const a = unit3(axis)
    const helper: V3 = Math.abs(a[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1]
    const u = unit3(cross3(helper, a))
    return { a, u, v: cross3(a, u) }
  }
  const around = (o: V3, F: { u: V3; v: V3 }, rad: number) =>
    Array.from({ length: steps }, (_, i) => {
      const t = (i / steps) * Math.PI * 2
      return [o[0] + rad * (Math.cos(t) * F.u[0] + Math.sin(t) * F.v[0]), o[1] + rad * (Math.cos(t) * F.u[1] + Math.sin(t) * F.v[1]), o[2] + rad * (Math.cos(t) * F.u[2] + Math.sin(t) * F.v[2])] as V3
    })
  const rim = around(c, frame(VIEW), r)
  const flat = (p: V3) => k.iso([p[0], p[1], p[2]], P)
  const outline = k.pathOf(rim.map(flat), true)
  const LF = frame(LIGHT)
  const capOf = (t: number) => {
    const points = rim.filter((p) => dot3(sub3(p, c), LIGHT) / r >= t).map(flat)
    const o: V3 = [c[0] + LIGHT[0] * r * t, c[1] + LIGHT[1] * r * t, c[2] + LIGHT[2] * r * t]
    for (const p of around(o, LF, r * Math.sqrt(Math.max(0, 1 - t * t)))) if (dot3(sub3(p, c), VIEW) >= -1e-9) points.push(flat(p))
    if (dot3(LIGHT, VIEW) > t) points.push(flat([c[0] + VIEW[0] * r, c[1] + VIEW[1] * r, c[2] + VIEW[2] * r]))
    return points.length > 2 ? k.pathOf(hull(points), true) : ''
  }
  return { fill: outline, outline, crease: '', top: '', shades: [outline, capOf(BANDS[1]), capOf(BANDS[2]), capOf(BANDS[3])], seamless: true }
}

/** 화면 좌표 사각형 하나 (anatomy 는 쓰지 않지만 장면 맞추기 테스트에서 쓴다) */
export const depth = (x: number, y: number, z = 0) => k.depthOf([x, y, z * ZK], P)
