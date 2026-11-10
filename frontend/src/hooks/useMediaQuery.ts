import { useSyncExternalStore } from 'react'

/** CSS 미디어 쿼리 결과를 React 상태처럼 쓴다 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

export const NARROW_QUERY = '(max-width: 900px)'
export const useIsNarrow = () => useMediaQuery(NARROW_QUERY)
export const useReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)')
