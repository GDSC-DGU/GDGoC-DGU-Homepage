/**
 * 장면을 화면에 놓는 계산 (DOM 없음 → 테스트 가능). useSceneFit 이 화면 크기가 바뀔 때마다 부른다.
 * 실제 '가장 크게 놓기'는 lib/fit.ts 의 fitAvoiding 이 하고, 여기서는 지도에 맞는 재료만 챙긴다.
 */
import { fitAvoiding, type Box, type FitResult } from '@/lib/fit'
import { labelScaleFor, NARROW_MIN_PX, sceneTargets } from './geometry'
import { SCENE_BOUNDS, SCENE_BOUNDS_NARROW } from './layout'

/** 넓은 화면의 안내판 글자 하한 (px) */
export const WIDE_MIN_PX = 14

/** 장면 바깥(카드 배치)을 아는 쪽이 알려주는 자리 정보. 모두 SVG 요소 기준 px */
export interface SceneLayout {
  /** 장면 경계(건물 · 안내판 · 광장)가 들어가야 하는 자리. 땅은 이 밖으로도 이어진다 */
  bounds: Box
  /** 장면 가운데를 되도록 맞출 자리 */
  prefer: Box
  /** 장면 위에 떠 있는 것들. 건물 · 안내판은 여기에 가리지 않게 놓는다 */
  obstacles: Box[]
}

export interface FitSceneInput {
  /** SVG 요소의 화면 크기 (px) */
  frame: { w: number; h: number }
  layout: SceneLayout
  narrow: boolean
  /** 오른쪽 장소 안내판을 왼쪽으로 펼치는지 */
  flip: boolean
  /** 작은 안내판(폰)인지 */
  compact: boolean
}

const FAR = 1e5

/** bounds 바깥 네 쪽. 안내판이 커져서 경계 상자를 넘더라도 화면 끝에 잘리지 않게 장애물로 넣는다 */
export const outside = (b: Box): Box[] => [
  { x0: -FAR, y0: -FAR, x1: b.x0, y1: FAR },
  { x0: b.x1, y0: -FAR, x1: FAR, y1: FAR },
  { x0: -FAR, y0: -FAR, x1: FAR, y1: b.y0 },
  { x0: -FAR, y0: b.y1, x1: FAR, y1: FAR },
]

/** 안내판 글자 하한: 폰 13px, 그 밖 14px */
export const minLabelPx = (narrow: boolean) => (narrow ? NARROW_MIN_PX : WIDE_MIN_PX)

/**
 * 건물 · 안내판이 카드와 화면 끝에 가리지 않는 한 가장 크게 놓는다.
 * labelScale: 그 배율에서 안내판 글자가 화면에서 13(14)~16px 가 되도록 키우거나 줄이는 값
 */
export function fitScene({ frame, layout, narrow, flip, compact }: FitSceneInput): FitResult & { labelScale: number } {
  const minPx = minLabelPx(narrow)
  const fit = fitAvoiding({
    bbox: narrow ? SCENE_BOUNDS_NARROW : SCENE_BOUNDS,
    frame,
    ...layout,
    obstacles: [...layout.obstacles, ...outside(layout.bounds)],
    targets: (s) => sceneTargets({ pinScale: labelScaleFor(s, minPx), flip, compact }),
  })
  return { ...fit, labelScale: labelScaleFor(fit.scale, minPx) }
}
