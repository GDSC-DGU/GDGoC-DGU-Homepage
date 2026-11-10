/**
 * 캠퍼스 나무 모양 (DOM · three 없음 → 테스트 가능). SVG 지도(Greenery)와 3D 지도(world3d)가 같은 모양을 쓴다.
 *
 * 흔한 '막대사탕 · 원뿔' 대신 한국 대학 캠퍼스에 실제로 많은 네 나무를 깎은 면(로우폴리)으로:
 * - 은행나무: 곧은 줄기, 위로 좁고 길쭉한 수관 (가을 노랑)
 * - 느티나무: 짧은 줄기가 셋으로 갈라지고, 넓게 퍼진 우산 수관 (가을 주황 · 갈색)
 * - 소나무: 비스듬히 휜 붉은 줄기, 납작한 잎 층 셋 (늘 푸름, 겨울엔 위에 눈)
 * - 벚나무: 낮게 갈라진 줄기, 둥글게 뭉친 수관 (봄 분홍 꽃, 가을 빨강)
 * 겨울에는 잎 지는 나무가 가지만 남는다.
 *
 * 좌표는 격자 (x, y, 높이 z). 수관 덩어리 하나 · 줄기 하나 · 가지 하나가 각각 볼록 입체 하나(TreeSolid)다.
 */
import type { PolyFace, V3 } from '../anatomy/kit'
import type { Season } from './season'

export type Species = 'ginkgo' | 'zelkova' | 'pine' | 'cherry'

/** 칠 구분: 잎(두 톤) · 꽃 · 줄기 · 눈 */
export type TreeRole = 'leaf' | 'leaf2' | 'bloom' | 'bark' | 'snow'

export interface TreeSolid {
  faces: PolyFace[]
  /** 그리는 순서 키 (큰 값이 앞) */
  depth: number
}

/* ── 색 ─────────────────────────────────────────────── */

const LEAF: Record<Species, Record<Exclude<Season, 'winter'>, readonly [string, string]>> = {
  ginkgo: { spring: ['#b9d97c', '#c8e293'], summer: ['#77ac62', '#86b96f'], autumn: ['#f2c12e', '#f7d45a'] },
  zelkova: { spring: ['#a7cf8c', '#b6d99d'], summer: ['#5f9c6c', '#6eaa79'], autumn: ['#d27d34', '#b9632c'] },
  pine: { spring: ['#4b7d5f', '#55896a'], summer: ['#3f7457', '#4a8062'], autumn: ['#3f7155', '#4a7d60'] },
  cherry: { spring: ['#f5b8ca', '#fbd2de'], summer: ['#69a873', '#78b582'], autumn: ['#d9573b', '#e9893f'] },
}
const PINE_WINTER: readonly [string, string] = ['#3c6b52', '#46775c']
const BARK: Record<Species, string> = { ginkgo: '#8c7b6b', zelkova: '#7e6f62', pine: '#a1634a', cherry: '#6c5852' }
const SNOW = '#f3f5f8'
/** 밤: 잎 · 줄기 · 눈을 밤 바탕(anatomy.css 의 밤 땅색) 쪽으로 가라앉힌다 */
const NIGHT_BASE = '#1b2229'
const NIGHT_MIX = 0.66

const hex = (c: string) => {
  const n = parseInt(c.slice(1), 16)
  return [n >> 16, (n >> 8) & 255, n & 255] as const
}
export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hex(a)
  const [br, bg, bb] = hex(b)
  const m = (u: number, v: number) => Math.round(u + (v - u) * t)
  return `#${[m(ar, br), m(ag, bg), m(ab, bb)].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

/** 나무 한 그루의 칠 구분별 색 (계절 · 밤) */
export function treeColors(species: Species, season: Season, night = false): Record<TreeRole, string> {
  const leaves = season === 'winter' ? PINE_WINTER : LEAF[species][season]
  const base: Record<TreeRole, string> = { leaf: leaves[0], leaf2: leaves[1], bloom: LEAF.cherry.spring[0], bark: BARK[species], snow: SNOW }
  if (!night) return base
  return Object.fromEntries(Object.entries(base).map(([k, v]) => [k, mix(v, NIGHT_BASE, k === 'snow' ? 0.5 : NIGHT_MIX)])) as Record<TreeRole, string>
}

/** 잎이 있는지 (겨울엔 소나무만) */
export const hasLeaves = (species: Species, season: Season) => season !== 'winter' || species === 'pine'

/* ── 모양 조각 ─────────────────────────────────────────── */

/** 정이십면체 꼭짓점 · 면 (깎은 덩어리의 바탕) */
const T = (1 + Math.sqrt(5)) / 2
const ICO_V: V3[] = (
  [
    [-1, T, 0], [1, T, 0], [-1, -T, 0], [1, -T, 0],
    [0, -1, T], [0, 1, T], [0, -1, -T], [0, 1, -T],
    [T, 0, -1], [T, 0, 1], [-T, 0, -1], [-T, 0, 1],
  ] as V3[]
).map(([a, b, c]) => {
  const l = Math.hypot(a, b, c)
  // 정이십면체를 눕혀서(y 축 → 높이 z) 꼭대기에 꼭짓점이 오게
  return [a / l, c / l, b / l] as V3
})
const ICO_F: ReadonlyArray<readonly [number, number, number]> = [
  [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
  [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
  [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
  [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
]

/** 같은 자리면 늘 같은 모양이 나오게 하는 작은 난수 (자리 · 번호로 정함) */
function rand(seed: number) {
  let s = Math.floor(Math.abs(seed) * 9973) % 2147483647 || 1
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

const depthOf = (p: V3) => p[0] + p[1] + p[2] * 0.01

/** 깎은 수관 덩어리: 정이십면체를 타원체로 늘리고 꼭짓점을 조금씩 흔든다 */
function lobe(c: V3, r: V3, role: TreeRole, seed: number): TreeSolid {
  const rnd = rand(seed)
  const turn = rnd() * Math.PI * 2
  const [ct, st] = [Math.cos(turn), Math.sin(turn)]
  const v = ICO_V.map(([x, y, z]) => {
    const j = 0.9 + rnd() * 0.18
    const rx = x * ct - y * st
    const ry = x * st + y * ct
    return [c[0] + rx * r[0] * j, c[1] + ry * r[1] * j, c[2] + z * r[2] * j] as V3
  })
  return { faces: ICO_F.map(([a, b, d]) => ({ pts: [v[a], v[b], v[d]], role })), depth: depthOf(c) }
}

/** 두 점을 잇는 각진 기둥 (줄기 · 가지): 단면 n각형, 위로 갈수록 가늘게 */
function limb(a: V3, b: V3, r0: number, r1: number, n = 6, role: TreeRole = 'bark'): TreeSolid {
  const d: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
  const len = Math.hypot(d[0], d[1], d[2]) || 1
  const ax: V3 = [d[0] / len, d[1] / len, d[2] / len]
  const helper: V3 = Math.abs(ax[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1]
  const u0: V3 = [helper[1] * ax[2] - helper[2] * ax[1], helper[2] * ax[0] - helper[0] * ax[2], helper[0] * ax[1] - helper[1] * ax[0]]
  const ul = Math.hypot(u0[0], u0[1], u0[2]) || 1
  const u: V3 = [u0[0] / ul, u0[1] / ul, u0[2] / ul]
  const v: V3 = [ax[1] * u[2] - ax[2] * u[1], ax[2] * u[0] - ax[0] * u[2], ax[0] * u[1] - ax[1] * u[0]]
  const ringAt = (o: V3, r: number) =>
    Array.from({ length: n }, (_, i) => {
      const t = (i / n) * Math.PI * 2 + Math.PI / n
      return [o[0] + r * (Math.cos(t) * u[0] + Math.sin(t) * v[0]), o[1] + r * (Math.cos(t) * u[1] + Math.sin(t) * v[1]), o[2] + r * (Math.cos(t) * u[2] + Math.sin(t) * v[2])] as V3
    })
  const lo = ringAt(a, r0)
  const hi = ringAt(b, r1)
  const faces: PolyFace[] = [{ pts: lo, role }, { pts: hi, role }]
  for (let i = 0; i < n; i++) faces.push({ pts: [lo[i], lo[(i + 1) % n], hi[(i + 1) % n], hi[i]], role, smooth: false })
  return { faces, depth: depthOf([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]) }
}

/** 소나무 잎 층 위에 쌓인 눈: 위를 보는 면만 눈 색으로 */
function snowTop(s: TreeSolid): TreeSolid {
  return {
    ...s,
    faces: s.faces.map((f) => {
      const [a, b, c] = f.pts
      const n: V3 = [(b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])]
      const l = Math.hypot(n[0], n[1], n[2]) || 1
      return Math.abs(n[2] / l) > 0.62 && (a[2] + b[2] + c[2]) / 3 > 0 ? { ...f, role: 'snow' as TreeRole } : f
    }),
  }
}

/* ── 나무 네 가지 ─────────────────────────────────────── */

/** layout TREES 의 크기 1 에 대한 실제 배율 */
const TREE_SCALE = 1.4

/**
 * 나무 한 그루 = 볼록 입체 여러 개 (뒤 → 앞 순서).
 * k: 크기 배율 (layout TREES), seed: 같은 나무가 늘 같은 모양이게
 */
export function treeSolids(species: Species, x: number, y: number, size: number, season: Season, seed = x * 31 + y * 17): TreeSolid[] {
  // 예전 공 · 원뿔 나무보다 크게 (나무 종류가 건물 옆에서 읽히게)
  const k = size * TREE_SCALE
  const P = (dx: number, dy: number, z: number): V3 => [x + dx * k, y + dy * k, z * k]
  const leaves = hasLeaves(species, season)
  const foliage: TreeRole = species === 'cherry' && season === 'spring' ? 'bloom' : 'leaf'
  const alt: TreeRole = species === 'cherry' && season === 'spring' ? 'bloom' : 'leaf2'
  const out: TreeSolid[] = []
  switch (species) {
    case 'ginkgo': {
      out.push(limb(P(0, 0, 0), P(0, 0, leaves ? 0.6 : 1.08), 0.036 * k, leaves ? 0.03 * k : 0.014 * k))
      if (leaves) {
        out.push(lobe(P(0, 0, 0.58), [0.21 * k, 0.21 * k, 0.25 * k], foliage, seed))
        out.push(lobe(P(0.02, -0.01, 0.9), [0.165 * k, 0.165 * k, 0.22 * k], alt, seed + 1))
        out.push(lobe(P(0, 0.01, 1.15), [0.1 * k, 0.1 * k, 0.14 * k], foliage, seed + 2))
      } else {
        // 겨울: 위로 좁게 뻗는 가지
        for (const [dx, dy, z0, z1] of [[0.14, -0.04, 0.42, 0.86], [-0.12, 0.06, 0.52, 0.94], [0.05, 0.13, 0.62, 1.0], [-0.04, -0.12, 0.7, 1.04]] as const) {
          out.push(limb(P(0, 0, z0), P(dx, dy, z1), 0.016 * k, 0.007 * k, 4))
        }
      }
      break
    }
    case 'zelkova': {
      out.push(limb(P(0, 0, 0), P(0, 0, 0.3), 0.05 * k, 0.04 * k))
      const forks: ReadonlyArray<readonly [number, number, number]> = leaves
        ? [[-0.15, 0.06, 0.56], [0.14, -0.12, 0.58], [0.04, 0.16, 0.54]]
        : [[-0.24, 0.08, 0.78], [0.22, -0.16, 0.8], [0.06, 0.24, 0.74], [-0.08, -0.22, 0.84], [0.2, 0.14, 0.7]]
      for (const [dx, dy, z] of forks) out.push(limb(P(0, 0, 0.27), P(dx, dy, z), 0.026 * k, 0.01 * k, 5))
      if (leaves) {
        out.push(lobe(P(0, 0, 0.74), [0.37 * k, 0.37 * k, 0.17 * k], foliage, seed))
        out.push(lobe(P(-0.21, 0.08, 0.63), [0.2 * k, 0.2 * k, 0.14 * k], alt, seed + 1))
        out.push(lobe(P(0.17, -0.15, 0.65), [0.2 * k, 0.2 * k, 0.14 * k], alt, seed + 2))
        out.push(lobe(P(0.06, 0.19, 0.6), [0.18 * k, 0.18 * k, 0.13 * k], foliage, seed + 3))
      }
      break
    }
    case 'pine': {
      // 비스듬히 휜 붉은 줄기 (두 마디)
      out.push(limb(P(0, 0, 0), P(0.06, -0.02, 0.46), 0.042 * k, 0.034 * k))
      out.push(limb(P(0.06, -0.02, 0.44), P(0.02, 0.05, 0.92), 0.034 * k, 0.022 * k))
      out.push(limb(P(0.05, -0.01, 0.5), P(0.17, -0.05, 0.56), 0.016 * k, 0.01 * k, 4))
      out.push(limb(P(0.03, 0.03, 0.7), P(-0.1, 0.09, 0.75), 0.014 * k, 0.009 * k, 4))
      const pads = [
        lobe(P(0.15, -0.05, 0.57), [0.26 * k, 0.2 * k, 0.075 * k], 'leaf', seed),
        lobe(P(-0.11, 0.09, 0.76), [0.22 * k, 0.18 * k, 0.07 * k], 'leaf2', seed + 1),
        lobe(P(0.03, 0.04, 0.95), [0.17 * k, 0.15 * k, 0.07 * k], 'leaf', seed + 2),
      ]
      out.push(...(season === 'winter' ? pads.map(snowTop) : pads))
      break
    }
    case 'cherry': {
      out.push(limb(P(0, 0, 0), P(0, 0, 0.28), 0.045 * k, 0.036 * k))
      const forks: ReadonlyArray<readonly [number, number, number]> = leaves
        ? [[-0.12, 0.05, 0.48], [0.12, -0.08, 0.5]]
        : [[-0.22, 0.07, 0.62], [0.2, -0.13, 0.66], [0.02, 0.2, 0.58], [-0.04, -0.18, 0.7]]
      for (const [dx, dy, z] of forks) out.push(limb(P(0, 0, 0.25), P(dx, dy, z), 0.022 * k, 0.009 * k, 5))
      if (leaves) {
        out.push(lobe(P(0, 0, 0.63), [0.26 * k, 0.26 * k, 0.2 * k], foliage, seed))
        out.push(lobe(P(-0.18, 0.06, 0.55), [0.17 * k, 0.17 * k, 0.15 * k], alt, seed + 1))
        out.push(lobe(P(0.15, -0.11, 0.58), [0.17 * k, 0.17 * k, 0.15 * k], alt, seed + 2))
        out.push(lobe(P(0.03, 0.17, 0.52), [0.15 * k, 0.15 * k, 0.13 * k], foliage, seed + 3))
      }
      break
    }
  }
  return out.sort((a, b) => a.depth - b.depth)
}

/** 그루 높이 (그림자 · 안내판 계산 등에서 쓸 수 있게) */
export const treeHeight = (species: Species, k: number) => k * TREE_SCALE * ({ ginkgo: 1.3, zelkova: 0.92, pine: 1.05, cherry: 0.84 } as const)[species]
