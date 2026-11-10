import { useLayoutEffect, type RefObject } from 'react'

/** 한 칸씩 늦추는 최대 칸 수: 40ms × 7 = 280ms 늦춤 + 220ms 등장 = 0.5초 안에 다 보인다 (hallmark craft 5: 순차 등장은 짧게) */
export const STAGGER_MAX_STEPS = 7

/** i 번째 칸이 얼마나 늦게 나오는지 (칸 단위). STAGGER_MAX_STEPS 를 넘으면 마지막 칸과 같이 나온다 */
export const staggerStep = (i: number) => Math.min(Math.max(0, i), STAGGER_MAX_STEPS)

/**
 * 숨겼다가 나타나게 해도 되는지. 아니면 처음부터 보인 채로 둔다.
 * - 동작 줄이기 · IntersectionObserver 없음 · 이미 화면 안(처음 그릴 때 보이는 것을 숨겼다 꺼내지 않는다) → false
 */
export function canStagger({ reducedMotion, hasObserver, inView }: { reducedMotion: boolean; hasObserver: boolean; inView: boolean }): boolean {
  return hasObserver && !reducedMotion && !inView
}

/**
 * 순차 등장 (움직임 9가지, 페이지마다 한 곳만): 목록이 화면에 들어올 때 칸이 40ms 간격으로 8px 아래에서 떠오른다.
 * - 처음부터 보이는 것이 기본이다. 스크립트가 없거나, '동작 줄이기'이거나, 처음 그릴 때 이미 화면 안이면 아무것도 하지 않는다.
 * - 화면 아래에 있을 때만 data-reveal="wait" 로 칸을 숨겼다가, 들어오면 "go" 로 바꿔 나타나게 한다 (styles/global.css).
 * - 칸마다 --i(늦출 칸 수)를 붙인다. 목록(ul · ol)의 바로 아래 칸(li)에 붙는다. 다 나타나면 data-reveal 을 뗀다.
 */
export function useStaggerReveal(ref: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const ok = canStagger({
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      hasObserver: typeof IntersectionObserver !== 'undefined',
      inView: r.top < window.innerHeight && r.bottom > 0,
    })
    if (!ok) return
    let i = 0
    for (const c of el.children) (c as HTMLElement).style.setProperty('--i', String(staggerStep(i++)))
    el.dataset.reveal = 'wait'
    let done = 0
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return
        el.dataset.reveal = 'go'
        io.disconnect()
        // 다 나타난 뒤에는 표시를 떼어 칸 본래의 움직임(마우스를 올리면 떠오름 등)으로 돌려준다
        done = window.setTimeout(() => delete el.dataset.reveal, 1200)
      },
      { rootMargin: '0px 0px -10% 0px' },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      window.clearTimeout(done)
      delete el.dataset.reveal
    }
  }, [ref])
}
