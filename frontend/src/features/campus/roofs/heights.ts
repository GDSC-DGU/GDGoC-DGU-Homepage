import type { Footprint, RoofType } from '@/domain/types'
import type { Point3 } from '@/lib/iso'

/**
 * 지붕 치수 (격자 단위). 지붕 그리기와 안내판 자리 계산이 같이 쓴다.
 * 그리는 코드(.tsx)와 나눠 둔 까닭: geometry.ts 가 화면 없이(테스트에서) 이 값만 읽을 수 있게.
 */

/** 지붕이 벽 위로 솟는 높이 */
export const ROOF_RISE: Record<RoofType, number> = {
  screen: 1.3,
  saw: 0.7,
  arch: 0.95,
  gable: 0.9,
}

/** 강당 지붕 위 발표 화면: 지붕 뒤쪽에 서서 앞(+y)을 본다 */
export const SCREEN = { dx: 0.55, dy: 0.95, w: 2.3, d: 0.12, legs: 0.22 } as const

/** 작업실 톱니 수 */
export const SAW_TEETH = 3

/**
 * 안내판 지시선이 시작하는 자리 = 그 지붕에서 가장 높은 곳.
 * 지붕마다 '가장 높은 곳'이 달라서 지붕 쪽에 둔다 (Strategy).
 */
export const SIGN_AT: Record<RoofType, (fp: Footprint, top: number) => Point3> = {
  // 발표 화면 위 가운데
  screen: (fp, top) => [fp.x + SCREEN.dx + SCREEN.w / 2, fp.y + SCREEN.dy + SCREEN.d / 2, top + ROOF_RISE.screen],
  // 가운데 톱니의 꼭대기, 오른쪽으로 조금 (폰에서 판을 왼쪽으로 펼 때 광장 쪽을 덜 가리게)
  saw: (fp, top) => [fp.x + fp.w * 0.7, fp.y + (fp.d / SAW_TEETH) * 2, top + ROOF_RISE.saw],
  // 아치 꼭대기, 뒤쪽(왼쪽 위)으로 조금 (광장 깃발 이름표와 거리를 두려고)
  arch: (fp, top) => [fp.x + fp.w * 0.3, fp.y + fp.d / 2, top + ROOF_RISE.arch],
  // 앞쪽 박공 꼭짓점 (광장 쪽으로 이름표가 너무 올라가지 않게)
  gable: (fp, top) => [fp.x + fp.w / 2, fp.y + fp.d, top + ROOF_RISE.gable],
}
