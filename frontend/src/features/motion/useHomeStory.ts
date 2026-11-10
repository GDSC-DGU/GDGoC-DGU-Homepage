import { useEffect } from 'react'
import { useReducedMotion } from '@/hooks/useMediaQuery'
// 움직임이 켜졌을 때(html[data-story])만 쓰는 전역 모양
import './motion.css'

/**
 * 홈 스크롤 이야기를 켠다. GSAP 는 첫 그림 · 글꼴 다음에 따로 불러온다 (첫 화면 속도에 영향 없게, 홈에서만).
 * '동작 줄이기'면 불러오지도 않는다 → 지금 사이트와 같은 정적 화면.
 */
export function useHomeStory() {
  const reduce = useReducedMotion()
  useEffect(() => {
    if (reduce) return
    let stop: (() => void) | undefined
    let dead = false
    document.fonts.ready
      .then(() => import('./homeStory'))
      .then(({ startHomeStory }) => {
        if (dead) return
        requestAnimationFrame(() => {
          if (!dead) stop = startHomeStory()
        })
      })
      .catch(() => {
        /* 못 불러오면 정적 화면 그대로 */
      })
    return () => {
      dead = true
      stop?.()
    }
  }, [reduce])
}
