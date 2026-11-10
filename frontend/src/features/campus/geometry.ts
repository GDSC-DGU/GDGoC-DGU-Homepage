import { PLACES } from '@/config/places'
import type { Footprint, Place } from '@/domain/types'
import type { Box } from '@/lib/fit'
import { boxBounds, iso, TILE_H, type Point3 } from '@/lib/iso'
import { FLAG_AT, GRID, RIGHT_SIDE_THRESHOLD, WALK_BAND } from './layout'
import { ROOF_RISE, SIGN_AT } from './roofs/heights'

/** 건물 받침 높이. 벽은 이 위에서 시작한다 */
export const FLOOR = 0.12

/** 건물 받침이 벽 바깥으로 나온 폭 (격자) */
export const PAD = 0.15

/** 마우스를 올리거나 고르면 건물이 올라오는 높이 (SVG 단위) */
export const LIFT = 4

/** 광장 깃대 높이 (SVG 단위, 받침 위부터) */
export const FLAG_POLE = 80

/** 깃대 받침 높이 (격자) */
export const FLAG_BASE = 0.12

/** 깃발 천: 깃대에서 -y 쪽(화면 오른쪽 위)으로 펼친다. 길이 · 높이 (격자) */
export const FLAG_CLOTH = { len: 1.45, h: 0.92 } as const

/** 깃대 꼭대기 (격자 높이) */
const FLAG_TOP = FLAG_BASE + FLAG_POLE / TILE_H

/**
 * 문 앞 길 [x0, y0, x1, y1]: 문에서 문이 보는 쪽으로 곧게 나가, 가장 가까운 보행로(또는 잔디 끝)까지.
 * 문이 그냥 벽에 붙은 그림이 아니라 '드나드는 곳'으로 보이게 한다.
 */
export function entryPath(fp: Footprint, half = 0.3): readonly [number, number, number, number] {
  const stops = [WALK_BAND[0], GRID - 0.4]
  if (fp.door === 'R') {
    const c = fp.y + fp.d / 2
    const x0 = fp.x + fp.w + PAD
    return [x0, c - half, stops.find((v) => v > x0) ?? x0 + 1, c + half]
  }
  const c = fp.x + fp.w / 2
  const y0 = fp.y + fp.d + PAD
  return [c - half, y0, c + half, stops.find((v) => v > y0) ?? y0 + 1]
}

/** 안내판 기둥 자리 (격자 좌표): 그 지붕에서 가장 높은 곳 */
export function pinAnchor(fp: Footprint): Point3 {
  return SIGN_AT[fp.roof](fp, FLOOR + fp.h)
}

/** 깃대 꼭대기 = 소개 안내판을 매다는 자리 */
export const FLAG_PIN: Point3 = [FLAG_AT[0], FLAG_AT[1], FLAG_TOP]

/** 이 장소의 안내판을 왼쪽으로 펼칠지 (화면 오른쪽 끝 장소만) */
export function isRightSide(at: Point3): boolean {
  return at[0] - at[1] > RIGHT_SIDE_THRESHOLD
}

/* ── 안내판 ─────────────────────────────────────────── */

/**
 * 안내판 치수 (SVG 단위, labelScale 1 기준).
 * 지붕에서 1px 지시선이 leader 만큼 올라가고, 그 위에 흰 판(radius 4)이 선다.
 * 판 안: 왼쪽 8px 장소색 네모 → 이름 (Pretendard 600 15px).
 */
export const SIGN = {
  font: 15,
  line: 18,
  leader: 28,
  padX: 12,
  padY: 10,
  mark: 8,
  gap: 8,
  radius: 4,
  /** 검색 건수 뱃지 지름과 이름과의 간격 */
  badge: 22,
  badgeGap: 8,
  /** 깃대에 매단 판과 깃대 사이 */
  hang: 8,
} as const

/** 폰처럼 좁을 때: 지시선을 줄이고 여백을 조금 줄인다 (글자 크기는 그대로) */
export const SIGN_COMPACT = { leader: 14, padX: 9, padY: 6 } as const

/**
 * 판을 지시선의 어느 쪽에 펼칠지.
 * start = 오른쪽으로 (기본), end = 왼쪽으로 (화면 오른쪽 끝 장소), hang = 깃대 왼쪽에 매단다 (광장 깃발)
 */
export type SignAlign = 'start' | 'end' | 'hang'

export interface PlateGeometry {
  /** 판 왼쪽 위 (기둥 자리 기준) */
  x0: number
  y0: number
  width: number
  height: number
  /** 지시선 (기둥 자리 기준) */
  line: { x1: number; y1: number; x2: number; y2: number }
  padX: number
  /** 이름 글자 시작 x (판 기준) */
  textX: number
}

/**
 * 판 하나의 모양. 그리는 쪽(Sign.tsx)과 자리 계산(sceneTargets)이 같은 식을 쓴다.
 * textW: 이름 글자 폭 (그리기 전에는 estimateLabelWidth), count: 검색 건수(0이면 뱃지 없음)
 */
export function plateGeometry(textW: number, align: SignAlign, compact: boolean, count = 0): PlateGeometry {
  const padX = compact ? SIGN_COMPACT.padX : SIGN.padX
  const padY = compact ? SIGN_COMPACT.padY : SIGN.padY
  const leader = compact ? SIGN_COMPACT.leader : SIGN.leader
  const textX = padX + SIGN.mark + SIGN.gap
  const width = textX + textW + (count > 0 ? SIGN.badgeGap + SIGN.badge : 0) + padX
  const height = padY * 2 + SIGN.line
  // 지시선은 장소색 네모 밑으로 들어간다 (start) / 반대쪽 같은 자리 (end)
  const inset = padX + SIGN.mark / 2
  if (align === 'hang') {
    return { x0: -SIGN.hang - width, y0: 0, width, height, line: { x1: 0, y1: height / 2, x2: -SIGN.hang, y2: height / 2 }, padX, textX }
  }
  const x0 = align === 'start' ? -inset : inset - width
  return { x0, y0: -leader - height, width, height, line: { x1: 0, y1: 0, x2: 0, y2: -leader }, padX, textX }
}

/**
 * 이름 글자 폭 어림값 (15px 글꼴, SVG 단위).
 * 실제 폭은 Sign 이 그린 뒤 재지만, 장면 자리를 정할 때는 그리기 전이라 어림값을 쓴다.
 * Pretendard 를 못 받았을 때(기본 글꼴)도 넘치지 않게 조금 넉넉히 잡는다.
 */
export function estimateLabelWidth(label: string): number {
  let w = 0
  for (const ch of label) w += /[ㄱ-힝]/.test(ch) ? 15 : /[A-Z]/.test(ch) ? 11 : ch === ' ' ? 4.5 : 9.5
  return w
}

/** 장소마다 안내판 기둥 자리 */
export const signAnchor = (place: Place): Point3 => (place.footprint ? pinAnchor(place.footprint) : FLAG_PIN)

/** 장소마다 판을 펼칠 쪽 */
export function signAlign(place: Place, flip: boolean): SignAlign {
  if (!place.footprint) return 'hang'
  return flip && isRightSide(signAnchor(place)) ? 'end' : 'start'
}

/**
 * 안내판 확대 배율. 장면이 작게 그려져도 글자가 화면에서 minPx 아래로 내려가지 않게,
 * 크게 그려져도 16px 를 넘지 않게 한다 (안내판은 지도 크기와 상관없이 UI 글자 크기에 가깝게).
 */
export function labelScaleFor(sceneScale: number, minPx = 14, maxPx = 16): number {
  const px = SIGN.font * Math.max(0.05, sceneScale)
  return Math.min(maxPx, Math.max(minPx, px)) / px
}

/** 폰(좁은 화면)에서 안내판 글자 하한 (px). 디자인 하한 13px */
export const NARROW_MIN_PX = 13

export interface TargetOptions {
  /** 안내판 확대 배율 (labelScaleFor) */
  pinScale: number
  /** 오른쪽 장소 안내판을 왼쪽으로 펼쳤는지 */
  flip: boolean
  /** @deprecated '진행 중' 표시가 없어져서 쓰지 않는다 (예전 호출과 맞추려고 남김) */
  showLive?: boolean
  /** 폰용 작은 판 (지시선 · 여백이 짧다) */
  compact?: boolean
}

/** 안내판 판이 차지하는 자리 (SVG 좌표). 검색 뱃지 자리까지 늘 잡아 둔다 */
export function signBox(place: Place, { pinScale: k, flip, compact = false }: TargetOptions): Box {
  const at = signAnchor(place)
  const [px, py] = iso(at[0], at[1], at[2] ?? 0)
  const g = plateGeometry(estimateLabelWidth(place.label), signAlign(place, flip), compact, 1)
  return { x0: px + g.x0 * k, x1: px + (g.x0 + g.width) * k, y0: py + g.y0 * k, y1: py + (g.y0 + g.height) * k }
}

/** 지시선이 차지하는 자리 (가는 선이지만 카드에 잘리면 판이 떠 보인다) */
function leaderBox(place: Place, { pinScale: k, flip, compact = false }: TargetOptions): Box {
  const at = signAnchor(place)
  const [px, py] = iso(at[0], at[1], at[2] ?? 0)
  const { line } = plateGeometry(0, signAlign(place, flip), compact)
  return {
    x0: px + Math.min(line.x1, line.x2) * k - 2,
    x1: px + Math.max(line.x1, line.x2) * k + 2,
    y0: py + Math.min(line.y1, line.y2) * k - 2,
    y1: py + Math.max(line.y1, line.y2) * k + 2,
  }
}

/** 건물 하나(받침 ~ 지붕 꼭대기, 올라온 높이 포함)가 화면에서 차지하는 자리 */
export function buildingBox(fp: Footprint): Box {
  const b = boxBounds(fp.x - PAD, fp.y - PAD, fp.w + PAD * 2, fp.d + PAD * 2, 0, FLOOR + fp.h + ROOF_RISE[fp.roof])
  return { ...b, y0: b.y0 - LIFT }
}

/** 깃대 · 깃발 천 · 받침이 차지하는 자리 */
export function flagBox(): Box {
  const [bx, by] = iso(FLAG_AT[0], FLAG_AT[1], 0)
  const [, ty] = iso(FLAG_AT[0], FLAG_AT[1], FLAG_TOP)
  const cloth = FLAG_CLOTH.len * 32
  return { x0: bx - 20, x1: bx + cloth + 4, y0: ty - cloth / 2 - 4 - LIFT, y1: by + 12 }
}

/**
 * 가리면 안 되는 것들: 건물, 깃발, 안내판 (SVG 좌표).
 * 장면을 화면에 놓을 때(fitAvoiding) 이 상자들이 카드 · 화면 끝과 겹치지 않게 한다. 땅 · 나무 · 사람은 잘려도 된다.
 */
export function sceneTargets(opts: TargetOptions): Box[] {
  return [
    flagBox(),
    ...PLACES.flatMap((p) => [...(p.footprint ? [buildingBox(p.footprint)] : []), signBox(p, opts), leaderBox(p, opts)]),
  ]
}
