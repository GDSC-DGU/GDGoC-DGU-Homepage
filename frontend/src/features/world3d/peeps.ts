import { GRID } from '@/features/campus/layout'

/**
 * 지도 위 '말뚝 사람' (4기 피드백 2026-11: 지도가 휑하다 → 얼굴 없는 단순한 사람).
 * 건물 · 나무처럼 단색 도형만으로 만든다: 둥근 몸통(셔츠색) + 공 머리(살구색) + 머리 위 반구(머리카락). 모델 파일 · 텍스처 · 뼈 없음.
 * 크기는 건물 한 층(약 0.5)보다 조금 크게: 지도 배율에서 사람으로 읽히는 크기.
 * 이 파일은 그리기와 상관없는 값 · 계산만 둔다 (Peeps3D 가 그린다, peeps.test.ts 가 확인한다).
 */

/** 몸 치수 (월드 단위). 발바닥 0 → 머리 꼭대기 약 0.59 (지도에서 잘 보이게 실제 비율보다 조금 크게) */
export const PEEP = {
  bodyR: 0.1,
  bodyLen: 0.2,
  headR: 0.088,
  hairR: 0.095,
} as const
/** 몸통 가운데 높이 · 머리 가운데 높이 */
export const BODY_Y = PEEP.bodyR + PEEP.bodyLen / 2
export const HEAD_Y = PEEP.bodyR * 2 + PEEP.bodyLen + 0.012 + PEEP.headR

export const SKIN = '#f2cdb0'
export const HAIRS = ['#2b2b30', '#2b2b30', '#4a3427'] as const
/** 셔츠: 구글 4색 + 먹색 · 흰색 */
export const SHIRTS = ['#4285f4', '#ea4335', '#fbbc04', '#34a853', '#3c4043', '#eef0f3'] as const

/** 사람끼리 이만큼 안으로는 다가가지 않는다 (몸 지름의 두 배쯤) */
export const PERSONAL = 0.4

export interface Lane {
  from: readonly [number, number]
  to: readonly [number, number]
}

/**
 * 걷는 길: 십자 보행로(6.2~7.8)를 두 줄로 나눠 오가는 방향이 다르다 (깃대 6.65~7.35 · 벤치를 비키는 줄 6.5 · 7.45).
 * 화면 밖(지도 끝)에서 나타나 반대쪽 화면 밖으로 사라지고, 다시 처음 자리에서 나타난다.
 */
const FAR0 = -10
const FAR1 = GRID + 10
export const LANES = {
  east: { from: [FAR0, 6.5], to: [FAR1, 6.5] },
  west: { from: [FAR1, 7.45], to: [FAR0, 7.45] },
  south: { from: [6.5, FAR0], to: [6.5, FAR1] },
  north: { from: [7.45, FAR1], to: [7.45, FAR0] },
} as const satisfies Record<string, Lane>

/** 걷는 사람: [길, 빠르기(칸/초), 처음 자리(길 길이에 대한 비율), 셔츠, 머리카락] */
export const WALKERS: ReadonlyArray<readonly [keyof typeof LANES, number, number, number, number]> = [
  ['east', 0.9, 0.4, 0, 0],
  ['east', 1.05, 0.12, 3, 1],
  ['west', 0.95, 0.3, 1, 2],
  ['west', 0.85, 0.66, 4, 0],
  ['south', 1.0, 0.47, 2, 1],
  ['south', 0.9, 0.18, 5, 0],
  ['north', 1.0, 0.36, 3, 2],
  ['north', 0.95, 0.7, 0, 1],
]

/**
 * 건물 문 앞에 모여 이야기하는 사람 [x, y, 셔츠, 머리카락]. 서로 마주 보고, 가끔 고개를 돌린다.
 * 안내판 지시선 · 손글씨 메모 · 보행로 자리는 비운다 (예전 SVG 지도의 사람 자리).
 */
export const GROUPS: ReadonlyArray<ReadonlyArray<readonly [number, number, number, number]>> = [
  // 프로젝트 건물 문 앞
  [
    [10.2, 4.8, 2, 0],
    [10.7, 5.15, 0, 1],
    [9.95, 5.55, 5, 2],
  ],
  // 커뮤니티 건물 문 앞
  [
    [5.5, 2.1, 1, 0],
    [5.85, 2.75, 4, 1],
  ],
]

/** 십자 보행로가 엇갈리는 광장 가운데 (+여유): 한 번에 한 사람만 지나간다 (먼저 들어온 사람 먼저) */
const CROSS = [6.2 - 0.3, 7.8 + 0.3] as const
export const inCrossing = (x: number, y: number) => x > CROSS[0] && x < CROSS[1] && y > CROSS[0] && y < CROSS[1]

export interface Walker {
  from: readonly [number, number]
  dir: readonly [number, number]
  length: number
  speed: number
  /** 길 위 자리 (0 ~ length) */
  s: number
  waiting: boolean
}

export function makeWalkers(): Walker[] {
  return WALKERS.map(([lane, speed, phase]) => {
    const { from, to } = LANES[lane]
    const vx = to[0] - from[0]
    const vy = to[1] - from[1]
    const length = Math.hypot(vx, vy)
    return { from, dir: [vx / length, vy / length], length, speed, s: phase * length, waiting: false }
  })
}

export const walkerAt = (w: Walker, s = w.s): [number, number] => [w.from[0] + w.dir[0] * s, w.from[1] + w.dir[1] * s]

/**
 * 한 장만큼 걷는다.
 * - 앞(진행 방향 쪽) 가까이에 사람이 있으면 기다린다. 같은 줄은 한 방향이라 서로 막히지 않는다.
 * - 광장 가운데(엇갈리는 곳)는 한 번에 한 사람: 다른 사람이 지나가는 중이면 들어가기 전에 기다린다.
 */
export function stepWalkers(walkers: Walker[], dt: number, crossing: { owner: number | null }): void {
  const pos = walkers.map((w) => walkerAt(w))
  walkers.forEach((w, i) => {
    const [x, y] = pos[i]
    const ahead = pos.some(([px, py], j) => {
      if (j === i) return false
      const ox = px - x
      const oy = py - y
      const d = Math.hypot(ox, oy)
      return d < PERSONAL + 0.1 && d > 1e-6 && (ox * w.dir[0] + oy * w.dir[1]) / d > 0.3
    })
    let s = w.s + w.speed * dt
    if (s > w.length) s -= w.length
    const [nx, ny] = walkerAt(w, s)
    const entering = !inCrossing(x, y) && inCrossing(nx, ny)
    w.waiting = ahead || (entering && crossing.owner !== null && crossing.owner !== i)
    if (w.waiting) return
    w.s = s
    pos[i] = [nx, ny]
    if (inCrossing(nx, ny)) crossing.owner = i
    else if (crossing.owner === i) crossing.owner = null
  })
}
