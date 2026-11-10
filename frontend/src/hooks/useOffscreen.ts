import { useEffect, useState, type RefObject } from 'react'

/** 요소가 화면 밖에 있으면 true. 보이지 않는 애니메이션을 멈출 때 쓴다 */
export function useOffscreen(ref: RefObject<Element | null>): boolean {
  const [off, setOff] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setOff(!entry.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [ref])
  return off
}
