import { useLayoutEffect, useRef, useState } from 'react'

/** 요소의 실제 폭(px). 화면 폭이 바뀌면 다시 잰다. 처음 그리기 전에 재므로 깜빡이지 않는다 */
export function useElementWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(fallback)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setWidth(el.getBoundingClientRect().width || fallback)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [fallback])
  return [ref, width] as const
}
