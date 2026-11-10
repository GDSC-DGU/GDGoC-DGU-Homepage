import type { JSX } from 'react'
import type { Footprint } from '@/domain/types'
import type { Point3 } from '@/lib/iso'

export interface RoofProps {
  fp: Footprint
  /** 장소색 (hex). 지붕 · 화면 틀 · 차양 · 톱니창 틀에만 쓴다. 벽에는 쓰지 않는다 */
  color: string
  /** 벽 꼭대기 높이 */
  top: number
  /** 문 가운데 위치 (문 있는 면을 따라) */
  doorCenter: number
  /** 지금 진행 중인 장소 (예: G-Sprint 기간의 프로젝트 랩 → 톱니창에 불이 켜짐) */
  live: boolean
  /** 꺼진 창 유리 색 (생략하면 GLASS). 하위 페이지 장면에서 '문 닫음' 같은 상태를 그릴 때만 바꾼다 */
  glass?: { readonly L: string; readonly R: string }
}

/**
 * 지붕 하나 = 그리는 컴포넌트 + 솟는 높이 + 안내판 기둥 자리.
 * 새 지붕은 이 모양으로 만들어 roofs/index.ts 에 등록만 하면 된다 (Strategy + Registry).
 */
export interface RoofSpec {
  height: number
  signAt: (fp: Footprint, top: number) => Point3
  Component: (props: RoofProps) => JSX.Element
}

/**
 * 유리 색. 장소색을 섞지 않은 차분한 회청색 한 벌.
 * 빛이 왼쪽 위에서 오므로 왼쪽 면(L) 유리가 밝고 오른쪽 면(R) 유리가 어둡다.
 */
/** 꺼진 창 유리. 밤에는 anatomy.css 의 [data-tod='night'] 가 어두운 값으로 바꾼다 (CSS 변수) */
export const GLASS = { L: 'var(--c-glass-l)', R: 'var(--c-glass-r)' } as const

/** 불 켜진 창 (깜빡이지 않는다) */
export const LIT = { L: '#ffe4a6', R: '#f7d48a' } as const
