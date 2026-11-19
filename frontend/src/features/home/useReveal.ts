import AOS from 'aos'
import 'aos/dist/aos.css'
import { useEffect, useLayoutEffect, useState, type RefObject } from 'react'

/**
 * 떠오르기 (슈어소프트테크와 같이 AOS fade-up, 4기 Organizer 2026-11-16) 를 붙이는 속성.
 * <h2 {...aos(250)}> 처럼 쓴다. 그 사이트 값: 0.7초, 한 번만, 늦춤은 제목 250 · 내용 300 · 그다음 350 · 400 · 500ms.
 */
export function aos(delay: number) {
  return { 'data-aos': 'fade-up', 'data-aos-duration': '700', 'data-aos-delay': String(delay), 'data-aos-once': 'true' } as const
}

/**
 * 홈에서 AOS 를 켠다 (HomePage 에서 한 번). 그 사이트처럼 기본값(화면 아래 120px, ease)으로 init → refresh.
 * '동작 줄이기'면 AOS 가 data-aos 를 지워 처음부터 보이게 한다 (disable).
 */
export function useReveal() {
  useEffect(() => {
    AOS.init({ disable: () => window.matchMedia('(prefers-reduced-motion: reduce)').matches })
    AOS.refresh()
  }, [])
}

/** 숫자 올라가기 곡선 (슈어소프트테크: easeOutQuart) */
export const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4)

/** t(0~1) 일 때 보일 숫자. 끝에서는 정확히 target */
export function countAt(target: number, t: number): number {
  if (t >= 1) return target
  return Math.floor(easeOutQuart(Math.max(0, t)) * target)
}

/**
 * 숫자 올라가기 (슈어소프트테크 About: 2초, 칸마다 120ms 늦게, 화면에 25% 들어오면 한 번).
 * 처음에는 끝 숫자를 그려 두고(스크립트 · 동작 줄이기 대비), 올릴 수 있으면 그리기 전에 0 으로 바꿔 두었다가 들어오면 올린다.
 */
export function useCountUp(ref: RefObject<HTMLElement | null>, target: number, delay: number, duration = 2000): number {
  const [value, setValue] = useState(target)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // 그리기 전에 0 으로 (깜빡임 없이 0 에서 시작한다)
    setValue(0)
  }, [ref])
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    let timer = 0
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return
        io.disconnect()
        timer = window.setTimeout(() => {
          let start = 0
          const step = (now: number) => {
            if (!start) start = now
            const t = (now - start) / duration
            setValue(countAt(target, t))
            if (t < 1) raf = requestAnimationFrame(step)
          }
          raf = requestAnimationFrame(step)
        }, delay)
      },
      { threshold: 0.25, rootMargin: '0px 0px -80px 0px' },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      window.clearTimeout(timer)
      cancelAnimationFrame(raf)
    }
  }, [ref, target, delay, duration])
  return value
}

/**
 * 저절로 넘기기 (첫 화면 5초 · 다가오는 일정 4초 · 프로젝트 줄 5초). 멈춤 조건이 하나라도 있으면 쉬고, 풀리면 처음부터 다시 센다.
 * - paused: 멈춤 버튼 · 마우스를 올림 · 초점이 안에 있음
 * - 탭이 숨겨짐 · '동작 줄이기'
 */
export function useAutoplay(tick: () => void, ms: number, paused: boolean) {
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden)
  useEffect(() => {
    const on = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', on)
    return () => document.removeEventListener('visibilitychange', on)
  }, [])
  useEffect(() => {
    if (paused || hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setInterval(tick, ms)
    return () => window.clearInterval(id)
  }, [tick, ms, paused, hidden])
}
