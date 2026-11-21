import { useRef, type PointerEvent, type ReactNode } from 'react'
import { Crumbs } from '@/features/dcamp/Crumbs'
import k from './recruitHero.module.css'

/**
 * 지원하기 첫 화면 (2026-11-12, BOAZ 리크루팅 참고): 검정 바탕 + 아래쪽 주황 빛, 가운데 큰 한 문장 → 짧은 소개 → 모집 상태 한 줄 → 버튼 하나.
 * 그라데이션 면 · 흐림은 쓰지 않는다 (DESIGN 2장). 빛은 소개 페이지 검정 머리(DarkHero)와 같은 토큰.
 * 화면 높이를 꽉 채우고, 문장은 화면 한가운데. 버튼('지원하기')을 누르면 바로 아래 지원서(#apply)로 내려간다.
 * 마우스를 따라오는 주황 빛 (2026-11-12): 마우스가 있는 화면에서만, 빛 한 덩이가 마우스 쪽으로 천천히(1.4초) 옮겨 간다.
 * transform 만 바꾸고(리렌더 없음, 다음 그림 때 한 번), 동작 줄이기면 움직이지 않는다.
 */
export function RecruitHero({ trail, title, intro, status, action }: { trail: readonly string[]; title: ReactNode; intro: readonly ReactNode[]; status?: ReactNode; action?: ReactNode }) {
  const glow = useRef<HTMLDivElement>(null)
  const frame = useRef(0)
  const follow = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse' || !glow.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const box = e.currentTarget.getBoundingClientRect()
    // 가운데 기준으로 마우스가 있는 쪽 (가로 · 세로 각각 -0.5 ~ 0.5)
    const x = (e.clientX - box.left) / box.width - 0.5
    const y = (e.clientY - box.top) / box.height - 0.5
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      glow.current?.style.setProperty('transform', `translate3d(${(x * 60).toFixed(1)}%, ${(y * 50).toFixed(1)}%, 0)`)
    })
  }
  const rest = () => {
    cancelAnimationFrame(frame.current)
    glow.current?.style.removeProperty('transform')
  }
  return (
    <section className={`on-dark ${k.hero}`} data-band="dark" aria-labelledby="page-title" onPointerMove={follow} onPointerLeave={rest}>
      <div ref={glow} className={k.follow} aria-hidden="true" />
      <div className={`container ${k.inner}`}>
        <Crumbs trail={trail} tone="dark" />
        <div className={k.center}>
          <h1 id="page-title" className={k.title}>
            {title}
          </h1>
          <div className={k.intro}>
            {intro.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
          {status && <p className={k.status}>{status}</p>}
          {action && <div className={k.action}>{action}</div>}
        </div>
      </div>
    </section>
  )
}
