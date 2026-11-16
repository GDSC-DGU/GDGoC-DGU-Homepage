import { useEffect, useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react'

/**
 * 떠오르기 (슈어소프트테크 AOS fade-up, 4기 Organizer 2026-11-16) 를 붙이는 속성.
 * <h2 {...aos(250)}> 처럼 쓴다. 늦출 시간(ms)은 그 사이트 값: 제목 250 · 내용 300 · 그다음 350 · 400 · 500.
 */
export function aos(delay: number): { 'data-aos': ''; style: CSSProperties } {
  return { 'data-aos': '', style: { ['--reveal-delay' as string]: `${delay}ms` } }
}

/** AOS 기본값: 요소 윗변이 화면 아래에서 120px 올라왔을 때 나타난다 */
export const REVEAL_OFFSET = 120

/**
 * 홈 전체에 떠오르기를 켠다 (HomePage 에서 한 번). main 에 data-reveal-on 을 달아 [data-aos] 를 숨기고,
 * 화면에 들어오는 대로 .aos-animate 를 붙인다. 한 번 나타나면 떼지 않는다 (AOS once).
 * '동작 줄이기' · IntersectionObserver 없음이면 아무것도 하지 않는다 (처음부터 보인다).
 * 그리기 전에(useLayoutEffect) 숨겨서, 처음 화면 안에 있는 것도 깜빡이지 않고 떠오른다.
 */
export function useReveal() {
  useLayoutEffect(() => {
    const main = document.getElementById('main')
    if (!main) return
    if (typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    main.dataset.revealOn = ''
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          e.target.classList.add('aos-animate')
          io.unobserve(e.target)
        }
      },
      { rootMargin: `0px 0px -${REVEAL_OFFSET}px 0px` },
    )
    const watch = () => {
      for (const el of main.querySelectorAll('[data-aos]:not(.aos-animate)')) io.observe(el)
    }
    watch()
    // 데이터가 늦게 와서 섹션이 나중에 생겨도 잡는다
    const mo = new MutationObserver(watch)
    mo.observe(main, { childList: true, subtree: true })
    return () => {
      io.disconnect()
      mo.disconnect()
      delete main.dataset.revealOn
    }
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
