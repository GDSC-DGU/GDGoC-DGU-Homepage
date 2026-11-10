import { shade } from '@/lib/iso'

/** 면 색 한 벌: 윗면 + 옆면 네 단(0 어두움 → 3 밝음) + 윤곽선 */
export interface Paint {
  top: string
  shades: readonly [string, string, string, string]
  edge?: string
  crease?: string
}

/**
 * 장소색 한 벌. anatomy 는 단 사이를 3% 안팎으로 가깝게 두지만, 장소색은 지붕에서 면이 읽혀야 해서 조금 더 벌린다.
 * 윤곽은 같은 색을 어둡게 (먹색 선이 색면을 얼룩처럼 가르지 않게).
 */
export function placePaint(color: string): Paint {
  return {
    top: shade(color, 0.3),
    shades: [shade(color, -0.14), shade(color, -0.05), shade(color, 0.06), shade(color, 0.16)],
    edge: shade(color, -0.42),
    crease: shade(color, -0.2),
  }
}
