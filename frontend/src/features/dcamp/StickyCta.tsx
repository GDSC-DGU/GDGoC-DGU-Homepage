import { useEffect, useState, type ReactNode } from 'react'
import s from './stickyCta.module.css'

/**
 * 화면 아래에 붙은 띠 (dcamp batch: 왼쪽 'dcamp batch' · 오른쪽 신청 단추). 페이지 끝 꼬리말 위에서 멈춘다.
 * hideOver: 이 선택자의 요소(예: 지원하기 첫 화면)가 화면에 보이는 동안은 띠를 아래로 내려 숨기고,
 * 그 요소를 지나 스크롤하면 아래에서 올라온다 (2026-11-28). 숨긴 동안은 inert 라 Tab 으로도 가지 않는다.
 * IntersectionObserver 가 없으면 처음부터 보인다.
 */
export function StickyCta({ label, children, hideOver }: { label: ReactNode; children: ReactNode; hideOver?: string }) {
  const [shown, setShown] = useState(() => !hideOver || typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    if (!hideOver || typeof IntersectionObserver === 'undefined') return
    const target = document.querySelector(hideOver)
    if (!target) return
    const io = new IntersectionObserver(([e]) => setShown(!e.isIntersecting), { rootMargin: '-40% 0px 0px 0px' })
    io.observe(target)
    return () => io.disconnect()
  }, [hideOver])
  return (
    <div className={s.bar} data-hidden={!shown || undefined} inert={!shown || undefined}>
      <div className={`container ${s.inner}`}>
        <p className={s.label} lang="en">
          {label}
        </p>
        <div className={s.action}>{children}</div>
      </div>
    </div>
  )
}
