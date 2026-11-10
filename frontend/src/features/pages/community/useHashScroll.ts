import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * 다른 페이지에서 '/about#upcoming' 으로 들어왔을 때, 내용(일정)을 다 그린 뒤 그 섹션으로 한 번 내려간다.
 * 페이지를 나눠 받고 일정을 비동기로 읽기 때문에, 처음 그릴 때는 아직 그 id 가 없을 수 있다.
 */
export function useHashScroll(ready: boolean) {
  const { hash } = useLocation()
  const done = useRef<string | null>(null)
  useEffect(() => {
    if (!ready || !hash || done.current === hash) return
    const el = document.getElementById(decodeURIComponent(hash.slice(1)))
    if (!el) return
    done.current = hash
    const id = requestAnimationFrame(() => el.scrollIntoView({ block: 'start' }))
    return () => cancelAnimationFrame(id)
  }, [ready, hash])
}
