import { useLayoutEffect, useState, type RefObject } from 'react'
import type { FitResult } from '@/lib/fit'
import { labelScaleFor } from './geometry'
import { SCENE_BOUNDS, SCENE_BOUNDS_NARROW } from './layout'
import { fitScene, minLabelPx, type SceneLayout } from './sceneFit'

export type { SceneLayout } from './sceneFit'

const NO_WATCH: ReadonlyArray<RefObject<Element | null>> = []

export interface SceneFitOptions {
  narrow: boolean
  /** 오른쪽 장소 안내판을 왼쪽으로 펼치는지 */
  flipPins: boolean
  /** @deprecated '진행 중' 표시가 없어져서 쓰지 않는다 (예전 호출과 맞추려고 남김) */
  showLive?: boolean
  /** 작은 안내판(CampusScene 의 compactPins)을 쓰는지. 안 주면 narrow 와 같다 */
  compact?: boolean
  /** 크기가 바뀌면 다시 맞출 카드들 (글꼴을 받거나 내용이 바뀌어 카드 높이가 달라질 때). 렌더마다 새 배열을 넘기지 않는다 */
  watch?: ReadonlyArray<RefObject<Element | null>>
}

/**
 * 화면 크기가 바뀔 때마다 장면을 다시 놓는다.
 * 카드 위치는 getLayout 으로 받고, 건물 · 안내판이 카드에 가리지 않는 한 가장 크게 그린다 (sceneFit.ts → lib/fit.ts).
 * → 장면은 카드가 무엇인지 몰라도 되고, 카드 배치를 바꿔도 장면 코드는 그대로다.
 *
 * 돌려주는 pinScale(= labelScale)을 CampusScene 에 넘기면 안내판 글자가 화면에서 13~16px 로 유지된다.
 */
export function useSceneFit(
  svgRef: RefObject<SVGSVGElement | null>,
  getLayout: (svgRect: DOMRect) => SceneLayout,
  { narrow, flipPins, compact = narrow, watch = NO_WATCH }: SceneFitOptions,
): FitResult & { pinScale: number; labelScale: number } {
  const [fit, setFit] = useState<FitResult>(() => {
    const b = narrow ? SCENE_BOUNDS_NARROW : SCENE_BOUNDS
    return { viewBox: `${b.x} ${b.y} ${b.w} ${b.h}`, scale: 1 }
  })

  useLayoutEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    let raf = 0
    const run = () => {
      const rect = svg.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      const { viewBox, scale } = fitScene({ frame: { w: rect.width, h: rect.height }, layout: getLayout(rect), narrow, flip: flipPins, compact })
      setFit((prev) => (prev.viewBox === viewBox && prev.scale === scale ? prev : { viewBox, scale }))
    }
    const queue = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(run)
    }
    run()
    const ro = new ResizeObserver(queue)
    ro.observe(svg)
    for (const r of watch) if (r.current) ro.observe(r.current)
    window.addEventListener('resize', queue)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('resize', queue)
    }
  }, [svgRef, getLayout, narrow, flipPins, compact, watch])

  const labelScale = labelScaleFor(fit.scale, minLabelPx(narrow))
  return { ...fit, pinScale: labelScale, labelScale }
}
