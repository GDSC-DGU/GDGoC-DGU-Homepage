import { CylinderGeometry, ExtrudeGeometry, Shape, Vector2, type BufferGeometry } from 'three'

/**
 * 격자 단위로 만드는 3D 모양들. 모두 '눌린 그룹'(Y 배율 Z_SCALE) 안에서 쓰므로
 * 높이는 격자 높이(z) 그대로 넣는다. 세계 축: X = 격자 x, Y = 높이 z, Z = 격자 y.
 */

/** (격자 y, 높이 z) 단면을 x0 → x1 로 민 기둥 (톱니 · 아치 끝 벽) */
export function prismYZ(pts: ReadonlyArray<readonly [number, number]>, x0: number, x1: number): BufferGeometry {
  const shape = new Shape(pts.map(([y, z]) => new Vector2(-y, z)))
  const g = new ExtrudeGeometry(shape, { depth: x1 - x0, bevelEnabled: false, curveSegments: 1 })
  // (sx, sy, sz) → (sz, sy, -sx): 민 방향이 X, 단면 가로가 Z(= 격자 y)
  g.rotateY(Math.PI / 2)
  g.translate(x0, 0, 0)
  return g
}

/** (격자 x, 높이 z) 단면을 y0 → y1 로 민 기둥 (박공 · 지붕 판) */
export function prismXZ(pts: ReadonlyArray<readonly [number, number]>, y0: number, y1: number): BufferGeometry {
  const shape = new Shape(pts.map(([x, z]) => new Vector2(x, z)))
  const g = new ExtrudeGeometry(shape, { depth: y1 - y0, bevelEnabled: false, curveSegments: 1 })
  g.translate(0, 0, y0)
  return g
}

/**
 * 반원(위쪽 절반) 껍질: 축이 X 방향, 반지름 r, 높이 rise (타원), 길이 len.
 * 가운데가 (cx, base, cz) 에 온다.
 */
export function halfShell(r: number, rise: number, len: number, cx: number, base: number, cz: number, segments = 28): BufferGeometry {
  const g = new CylinderGeometry(r, r, len, segments, 1, true, 0, Math.PI)
  g.rotateZ(Math.PI / 2)
  g.scale(1, rise / r, 1)
  g.translate(cx, base, cz)
  return g
}

/** 반타원 단면 점들 (격자 y, 높이 z): 아치 끝 벽 · 아치 창 */
export function halfEllipse(cy: number, r: number, base: number, rise: number, n = 20): Array<[number, number]> {
  return Array.from({ length: n + 1 }, (_, i) => {
    const th = (Math.PI * i) / n
    return [cy - r * Math.cos(th), base + rise * Math.sin(th)] as [number, number]
  })
}
