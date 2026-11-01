/**
 * 지도 미리보기를 이름표 옆에 놓는 계산 (DOM 없음, popoverPosition.test.ts 에 테스트).
 * 좌표는 모두 지도 틀(frame) 왼쪽 위 기준 px.
 *
 * 1. 이름표 오른쪽에 둘 자리가 있으면 오른쪽
 * 2. 없으면 왼쪽
 * 3. 둘 다 없으면 이름표 아래, 아래도 모자라면 위
 * 세로는 보이는 구간(visible) 안에 들어오게 민다. 보이는 구간이 패널보다 작으면 틀 안에만 맞춘다.
 */

export interface Rect {
  left: number
  top: number
  right: number
  bottom: number
}

export interface PopoverInput {
  anchor: Rect
  panel: { w: number; h: number }
  frame: { w: number; h: number }
  /** 틀 안에서 화면에 보이는 세로 구간 (머리말 아래 ~ 화면 아래) */
  visible?: { top: number; bottom: number }
  gap?: number
  /** 위아래 여백 */
  margin?: number
  /** 좌우 여백: 옆자리가 몇 px 모자라 반대편으로 뒤집히지 않게 위아래보다 좁게 */
  edge?: number
  /** 주면 이름표 옆이 아니라 틀 오른쪽 끝에서 이만큼 띄운 자리에 붙인다 (세로는 보이는 구간 가운데) */
  dockRight?: number
}

export type PopoverSide = 'right' | 'left' | 'below' | 'above'

export interface PopoverPlacement {
  left: number
  top: number
  side: PopoverSide
}

/** 오른쪽에 붙일 때 지도 오른쪽 끝에서 띄울 거리: 본문 틀(1140)의 오른쪽 끝선, 좁으면 24 */
export const dockInset = (frameWidth: number) => Math.max(24, Math.round((frameWidth - 1140) / 2))

const clamp = (v: number, lo: number, hi: number) => (hi < lo ? lo : Math.min(hi, Math.max(lo, v)))

export function placePopover({ anchor, panel, frame, visible, gap = 12, margin = 16, edge = 8, dockRight }: PopoverInput): PopoverPlacement {
  // 세로로 쓸 수 있는 구간: 화면에 보이는 부분을 우선, 너무 좁으면 틀 전체
  let vTop = margin
  let vBottom = frame.h - margin
  if (visible) {
    const t = Math.max(vTop, visible.top + margin)
    const b = Math.min(vBottom, visible.bottom - margin)
    if (b - t >= panel.h) {
      vTop = t
      vBottom = b
    }
  }
  const sideTop = clamp(anchor.top - 8, vTop, vBottom - panel.h)

  // 오른쪽에 붙이기: 이름표가 그 자리와 겹치지 않을 때만 (겹치면 아래 규칙대로 이름표 옆에)
  if (dockRight !== undefined) {
    const left = frame.w - dockRight - panel.w
    if (left >= edge && anchor.right + gap <= left) {
      return { left, top: clamp((vTop + vBottom) / 2 - panel.h / 2, vTop, vBottom - panel.h), side: 'right' }
    }
  }

  if (anchor.right + gap + panel.w <= frame.w - edge) {
    return { left: anchor.right + gap, top: sideTop, side: 'right' }
  }
  if (anchor.left - gap - panel.w >= edge) {
    return { left: anchor.left - gap - panel.w, top: sideTop, side: 'left' }
  }
  const left = clamp((anchor.left + anchor.right) / 2 - panel.w / 2, edge, frame.w - edge - panel.w)
  const below = anchor.bottom + gap
  if (below + panel.h <= vBottom) return { left, top: below, side: 'below' }
  const above = anchor.top - gap - panel.h
  if (above >= vTop) return { left, top: above, side: 'above' }
  return { left, top: clamp(below, vTop, vBottom - panel.h), side: 'below' }
}
