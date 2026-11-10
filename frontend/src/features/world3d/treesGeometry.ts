import { BufferAttribute, BufferGeometry, Color } from 'three'
import { TREES } from '@/features/campus/layout'
import type { Season } from '@/features/campus/trees/season'
import { treeColors, treeSolids } from '@/features/campus/trees/treeModel'

/**
 * 나무 전부를 한 덩어리(그리기 한 번)로: campus/trees/treeModel 의 깎은 면을 그대로 삼각형으로 나눠 꼭짓점 색으로 칠한다.
 * SVG 지도와 같은 모양 · 같은 계절 색.
 */
export function treesGeometry(season: Season, night: boolean): BufferGeometry {
  const pos: number[] = []
  const nor: number[] = []
  const col: number[] = []
  const c = new Color()
  for (const [x, y, size, kind] of TREES) {
    const colors = treeColors(kind, season, night)
    for (const solid of treeSolids(kind, x, y, size, season)) {
      const all = solid.faces.flatMap((f) => f.pts)
      const cen = all.reduce((m, p) => [m[0] + p[0] / all.length, m[1] + p[1] / all.length, m[2] + p[2] / all.length], [0, 0, 0])
      for (const f of solid.faces) {
        // 격자 (x, y, z) → 세계 (x, z, y)
        const v = f.pts.map((p) => [p[0], p[2], p[1]] as const)
        const [a, b, d] = v
        let n = [(b[1] - a[1]) * (d[2] - a[2]) - (b[2] - a[2]) * (d[1] - a[1]), (b[2] - a[2]) * (d[0] - a[0]) - (b[0] - a[0]) * (d[2] - a[2]), (b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0])]
        const fc = v.reduce((m, p) => [m[0] + p[0] / v.length, m[1] + p[1] / v.length, m[2] + p[2] / v.length], [0, 0, 0])
        const out = [fc[0] - cen[0], fc[1] - cen[2], fc[2] - cen[1]]
        let flip = false
        if (n[0] * out[0] + n[1] * out[1] + n[2] * out[2] < 0) {
          n = [-n[0], -n[1], -n[2]]
          flip = true
        }
        const l = Math.hypot(n[0], n[1], n[2]) || 1
        c.setStyle(colors[f.role as keyof typeof colors] ?? colors.leaf)
        for (let i = 1; i < v.length - 1; i++) {
          const tri = flip ? [v[0], v[i + 1], v[i]] : [v[0], v[i], v[i + 1]]
          for (const p of tri) {
            pos.push(p[0], p[1], p[2])
            nor.push(n[0] / l, n[1] / l, n[2] / l)
            col.push(c.r, c.g, c.b)
          }
        }
      }
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
  g.setAttribute('normal', new BufferAttribute(new Float32Array(nor), 3))
  g.setAttribute('color', new BufferAttribute(new Float32Array(col), 3))
  return g
}

