/**
 * anatomy kit/react/draw.tsx 의 Solid · Line · Dots 를 캠퍼스용으로 옮긴 것 (MIT, github.com/wheresryan22/anatomy).
 * 바뀐 점: paint 로 면 색을 직접 줄 수 있다 (장소색 지붕 · 잔디 · 나무). 칠하지 않으면 토큰(--anatomy-*)을 따른다.
 */
import type { CSSProperties, ReactNode } from 'react'
import '@/vendor/anatomy/iso.css'
import './anatomy.css'
import { polyParts, type Flat, type PolyFace, type SolidPaths } from './kit'
import type { Paint } from './paint'

export type Tone = 'hi' | 'mid' | 'lo' | 'faint'

export type { Paint } from './paint'

interface SolidProps {
  paths: SolidPaths
  tone?: Tone
  crease?: Tone | 'none'
  lit?: boolean
  paint?: Paint
  className?: string
  /** 윤곽선 밑에 깔리는 선 (줄눈 · 띠). 윤곽선이 그 끝을 덮는다 */
  inner?: ReactNode
  children?: ReactNode
}

const fillStyle = (fill: string | undefined): CSSProperties | undefined => (fill ? { fill, stroke: undefined } : undefined)

export function Solid({ paths, tone = 'mid', crease = 'faint', lit = false, paint, className, inner, children }: SolidProps) {
  const seamStyle = (fill: string | undefined): CSSProperties | undefined => (fill ? (paths.seamless ? { fill, stroke: fill } : { fill }) : undefined)
  return (
    <g className={className ? `iso-solid ${className}` : 'iso-solid'} data-lit={lit ? '' : undefined} data-seamless={paths.seamless ? '' : undefined}>
      <path className="iso-fill" d={paths.fill} style={fillStyle(paint?.shades[0])} />
      {paths.shades.map((d, i) => (d ? <path key={i} className="iso-shade" data-shade={i} d={d} style={seamStyle(paint?.shades[i])} /> : null))}
      {paths.top ? <path className="iso-top" d={paths.top} style={seamStyle(paint?.top)} /> : null}
      {crease !== 'none' && paths.crease ? <path className="iso-line iso-crease" data-tone={crease} d={paths.crease} style={paint?.crease ? { stroke: paint.crease } : undefined} /> : null}
      {crease !== 'none' && paths.bevel ? <path className="iso-line iso-bevel" data-tone={crease} d={paths.bevel} style={paint ? { stroke: paint.top } : undefined} /> : null}
      {inner}
      <path className="iso-line iso-edge" data-tone={tone} d={paths.outline} style={paint?.edge ? { stroke: paint.edge } : undefined} />
      {children}
    </g>
  )
}

interface LineProps {
  d: string
  tone?: Tone | 'lit'
  /** 선 끝이 일부러 빈 면에서 멈춘다 (인쇄된 글줄 같은 것). anatomy lines 검사용 표시 */
  free?: boolean
  color?: string
  width?: number
  className?: string
}

export function Line({ d, tone = 'lo', free, color, width, className }: LineProps) {
  if (!d) return null
  const style: CSSProperties | undefined = color || width ? { stroke: color, strokeWidth: width } : undefined
  return <path className={className ? `iso-line ${className}` : 'iso-line'} data-tone={tone} data-free={free ? '' : undefined} d={d} style={style} />
}

const tenth = (v: number) => Math.round(v * 10) / 10

/** 나사 · 리벳 · 볼트 점 (0.4~0.55) */
export function Dots({ points, size = 0.5, tone = 'mid' }: { points: Flat[]; size?: number; tone?: Tone }) {
  return (
    <g className="iso-dots" data-tone={tone}>
      {points.map(([x, y], i) => (
        <circle key={i} cx={tenth(x)} cy={tenth(y)} r={size} />
      ))}
    </g>
  )
}

/** 면 하나를 색으로 채운다 (유리 · 화면 · 문). 윤곽은 tone 선 */
export function Pane({ d, fill, className, tone, edge }: { d: string; fill?: string; className?: string; tone?: Tone; edge?: string }) {
  return (
    <g>
      <path d={d} className={className} style={fill ? { fill } : undefined} />
      {tone || edge ? <path className="iso-line" data-tone={tone ?? 'lo'} d={d} style={edge ? { stroke: edge } : undefined} /> : null}
    </g>
  )
}

interface MixedProps {
  faces: readonly PolyFace[]
  /** 칠 구분(role)마다 색 한 벌. 없는 구분은 벽 토큰(--anatomy-*) */
  paints?: Readonly<Record<string, Paint>>
  tone?: Tone
  /** 윤곽선 색 (장소색 지붕은 그 색의 어두운 단) */
  edge?: string
  crease?: string
  inner?: ReactNode
  children?: ReactNode
}

/**
 * 면마다 다른 칠을 하는 볼록 입체 (톱니 = 장소색 비탈 + 유리면 + 중립색 끝벽).
 * 그리는 순서는 Solid 와 같다: 채움 → 면 → 접힌 선 → inner → 윤곽.
 */
export function MixedSolid({ faces, paints = {}, tone = 'mid', edge, crease, inner, children }: MixedProps) {
  const { paths, faces: seen } = polyParts(faces)
  return (
    <g className="iso-solid" data-seamless={paths.seamless ? '' : undefined}>
      <path className="iso-fill" d={paths.fill} />
      {seen.map((f, i) => {
        const p = f.role ? paints[f.role] : undefined
        const fill = p ? (f.tone === 'top' ? p.top : p.shades[f.tone]) : undefined
        const style: CSSProperties | undefined = fill ? { fill, stroke: fill, strokeWidth: 0.4 } : undefined
        return f.tone === 'top' ? <path key={i} className="iso-top" d={f.d} style={style} /> : <path key={i} className="iso-shade" data-shade={f.tone} d={f.d} style={style} />
      })}
      {paths.crease ? <path className="iso-line iso-crease" data-tone="faint" d={paths.crease} style={crease ? { stroke: crease } : undefined} /> : null}
      {inner}
      <path className="iso-line iso-edge" data-tone={tone} d={paths.outline} style={edge ? { stroke: edge } : undefined} />
      {children}
    </g>
  )
}
