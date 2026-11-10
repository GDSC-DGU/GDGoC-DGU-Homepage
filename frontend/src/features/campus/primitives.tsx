import type { SVGProps } from 'react'
import { iso, points, shade, type Point3 } from '@/lib/iso'
import s from './campus.module.css'

type PolyProps = Omit<SVGProps<SVGPolygonElement>, 'points'> & { pts: readonly Point3[] }

/** 격자 좌표로 그리는 다각형 */
export function Poly({ pts, ...rest }: PolyProps) {
  return <polygon points={points(pts)} {...rest} />
}

type LineProps = Omit<SVGProps<SVGLineElement>, 'x1' | 'y1' | 'x2' | 'y2' | 'from' | 'to'> & { from: Point3; to: Point3 }

export function IsoLine({ from, to, ...rest }: LineProps) {
  const [x1, y1] = iso(from[0], from[1], from[2] ?? 0)
  const [x2, y2] = iso(to[0], to[1], to[2] ?? 0)
  return <line x1={x1.toFixed(1)} y1={y1.toFixed(1)} x2={x2.toFixed(1)} y2={y2.toFixed(1)} {...rest} />
}

/** 빛은 왼쪽 위 한 방향: 윗면이 가장 밝고, 왼쪽 면(+y) 중간, 오른쪽 면(+x)이 가장 어둡다 */
const LIGHT = { top: 0.14, left: 0, right: -0.16 } as const

export interface BoxProps {
  x: number
  y: number
  w: number
  d: number
  z0: number
  h: number
  /** 색(hex)을 주면 그 색을 면마다 밝기만 바꿔 칠한다 (지붕 · 차양 · 틀) */
  color?: string
  /** 색 대신 토큰: wall = 벽(--wall-*), pad = 건물 받침 · 깃대 받침 */
  tone?: 'wall' | 'pad'
  /** 테두리 1px (벽처럼 바닥과 색이 비슷한 면을 또렷하게) */
  edge?: boolean
}

/**
 * 상자 = 보이는 면 3개 (왼쪽 +y면, 오른쪽 +x면, 윗면).
 * 벽은 중립색 토큰으로, 지붕 · 틀은 장소색으로 칠한다.
 */
export function Box({ x, y, w, d, z0, h, color, tone = 'wall', edge = false }: BoxProps) {
  const z1 = z0 + h
  const left: Point3[] = [[x, y + d, z0], [x + w, y + d, z0], [x + w, y + d, z1], [x, y + d, z1]]
  const right: Point3[] = [[x + w, y, z0], [x + w, y + d, z0], [x + w, y + d, z1], [x + w, y, z1]]
  const top: Point3[] = [[x, y, z1], [x + w, y, z1], [x + w, y + d, z1], [x, y + d, z1]]
  const e = edge ? s.edge : ''
  if (color) {
    return (
      <>
        <Poly pts={left} fill={shade(color, LIGHT.left)} className={e} />
        <Poly pts={right} fill={shade(color, LIGHT.right)} className={e} />
        <Poly pts={top} fill={shade(color, LIGHT.top)} className={e} />
      </>
    )
  }
  const [cl, cr, ct] = tone === 'pad' ? [s.padL, s.padR, s.padT] : [s.wallL, s.wallR, s.wallT]
  return (
    <>
      <Poly pts={left} className={`${cl} ${e}`} />
      <Poly pts={right} className={`${cr} ${e}`} />
      <Poly pts={top} className={`${ct} ${e}`} />
    </>
  )
}
