import { useEffect, useState, type RefObject } from 'react'

/**
 * 상자가 가로로 넘치는지 (넓은 표). 넘칠 때만 상자에 키보드 초점을 줘서 ← → 로 넘겨 볼 수 있게 한다
 * (안 넘칠 때까지 초점을 주면 Tab 이 한 번 헛돈다).
 */
export function useOverflowX(ref: RefObject<HTMLElement | null>): boolean {
  const [overflow, setOverflow] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => setOverflow(el.scrollWidth > el.clientWidth + 1)
    check()
    if (typeof ResizeObserver !== 'function') return
    const ro = new ResizeObserver(check)
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild)
    return () => ro.disconnect()
  }, [ref])
  return overflow
}
