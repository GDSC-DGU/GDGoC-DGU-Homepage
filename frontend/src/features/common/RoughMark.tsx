import { useEffect, useRef, type ReactNode } from 'react'
import { annotate } from 'rough-notation'
import type { RoughAnnotationType, RoughPadding } from 'rough-notation/lib/model'

/*
 * rough-notation 은 처음 그릴 때 <style> 한 장을 문서에 끼워 넣어 선 긋는 keyframes 를 만든다.
 * 보안 헤더(CSP style-src 에 'unsafe-inline' 없음)가 그 <style> 을 막으므로, 같은 keyframes 를 styles/global.css 에 두고
 * 라이브러리가 '이미 넣었다'고 보게 표시만 해 둔다 (rough-notation 0.5 의 window.__rno_kf_s).
 */
if (typeof window !== 'undefined') (window as Window & { __rno_kf_s?: unknown }).__rno_kf_s = true

interface Props {
  children: ReactNode
  type?: RoughAnnotationType
  /** 선 색. 장소색(var(--place-…))을 쓰면 '어디' 뜻이 유지된다 */
  color: string
  padding?: RoughPadding
  strokeWidth?: number
}

/**
 * 글자 위에 손으로 그린 표시 (Rough Notation, MIT). 화면에 처음 들어올 때 한 번 그려진다.
 * '동작 줄이기'면 그리는 과정 없이 바로 보인다. 표시는 꾸밈이라 읽기 프로그램에는 글자만 읽힌다.
 * CSS 변수 색은 SVG stroke 속성에서 풀리지 않으므로, 그릴 때 계산된 색으로 바꿔 넘긴다.
 */
export function RoughMark({ children, type = 'circle', color, padding = 6, strokeWidth = 2.5 }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const resolved = color.startsWith('var(') ? getComputedStyle(el).getPropertyValue(color.slice(4, -1)).trim() || '#191b1f' : color
    const a = annotate(el, { type, color: resolved, padding, strokeWidth, animate: !reduce, animationDuration: 900, iterations: 2 })
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          // 제목을 읽기 시작할 틈을 조금 준다
          window.setTimeout(() => a.show(), 350)
          io.disconnect()
        }
      },
      { threshold: 1 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      a.remove()
    }
  }, [type, color, padding, strokeWidth])
  return (
    <span ref={ref} style={{ display: 'inline-block', marginInlineStart: '0.1em' }}>
      {children}
    </span>
  )
}
