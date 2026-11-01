import { useEffect, useRef, useState, type RefObject } from 'react'

/**
 * until(밀리초)까지 1초마다 다시 그린다 (링크 재발송 1분 간격의 남은 초). 지나면 멈춘다.
 * 돌려주는 값은 지금 시각.
 */
export function useCountdown(until: number | null): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!until) return
    const tick = () => {
      const t = Date.now()
      setNow(t)
      return t
    }
    if (tick() >= until) return
    const timer = window.setInterval(() => {
      if (tick() >= until) window.clearInterval(timer)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [until])
  return now
}

/**
 * 팝업을 닫은 뒤 초점 지키기.
 * 팝업은 닫히면 연 버튼으로 초점을 돌려주는데, 그 버튼이 목록을 새로 그리며 사라지면([잠금 해제] 등) 초점이 문서 맨 처음으로 간다.
 * 그때 같은 행의 [수정] 버튼(data-focus-key)으로, 행도 없으면 fallback 으로 옮긴다.
 *   const keep = useFocusKeeper(tableRef, headingRef, data)
 *   keep('edit-user-1')  // 바뀐 행
 */
export function useFocusKeeper(root: RefObject<HTMLElement | null>, fallback: RefObject<HTMLElement | null>, trigger: unknown) {
  const pending = useRef<string | null>(null)
  useEffect(() => {
    const key = pending.current
    if (!key) return
    // 목록이 새로 그려진 첫 번째 때 한 번만 본다
    pending.current = null
    const active = document.activeElement
    // 팝업이 돌려줄 버튼을 잃으면 본문(#admin-main)으로 가므로 그것도 '잃음'으로 본다
    const lost = !active || active === document.body || !active.isConnected || active.id === 'admin-main'
    if (!lost) return
    const target = root.current?.querySelector<HTMLElement>(`[data-focus-key="${CSS.escape(key)}"]`) ?? fallback.current
    target?.focus()
  }, [trigger, root, fallback])
  return (key: string) => {
    pending.current = key
  }
}
