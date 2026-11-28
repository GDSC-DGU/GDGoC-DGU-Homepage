import { useRef, type CSSProperties, type PointerEvent, type ReactNode } from 'react'
import { Crumbs } from '@/features/dcamp/Crumbs'
import k from './recruitHero.module.css'

/**
 * 지원하기 첫 화면 (2026-11-12, BOAZ 리크루팅 참고): 검정 바탕 + 아래쪽 주황 빛, 가운데 큰 한 문장 → 짧은 소개 → 모집 상태 한 줄 → 버튼 하나.
 * 그라데이션 면 · 흐림은 쓰지 않는다 (DESIGN 2장). 빛은 소개 페이지 검정 머리(DarkHero)와 같은 토큰.
 * 화면 높이를 꽉 채우고, 문장은 화면 한가운데. 버튼('지원하기')을 누르면 바로 아래 지원서(#apply)로 내려간다.
 * 마우스를 따라오는 주황 빛 (2026-11-12): 마우스가 있는 화면에서만, 빛 한 덩이가 마우스 쪽으로 천천히(1.4초) 옮겨 간다.
 * transform 만 바꾸고(리렌더 없음, 다음 그림 때 한 번), 동작 줄이기면 움직이지 않는다.
 */
/**
 * 첫 화면 등장 (2026-11-28): 큰 문장이 줄마다 0.12초 간격으로 아래에서 떠오르고, 이어서 소개 → 상태 → 버튼이 차례로 나타난다.
 * title 을 줄 배열로 주면 줄마다 따로 떠오른다. 동작 줄이기면 처음부터 다 보인다 (recruitHero.module.css).
 */
export function RecruitHero({ trail, title, accent, intro, status, action }: { trail: readonly string[]; title: string | readonly string[]; accent?: string; intro: readonly ReactNode[]; status?: ReactNode; action?: ReactNode }) {
  const lines = typeof title === 'string' ? [title] : title
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
    <section className={`on-dark ${k.hero}`} data-band="dark" data-recruit-hero aria-labelledby="page-title" onPointerMove={follow} onPointerLeave={rest}>
      <div ref={glow} className={k.follow} aria-hidden="true" />
      <div className={`container ${k.inner}`}>
        <Crumbs trail={trail} tone="dark" />
        <div className={k.center}>
          <h1 id="page-title" className={k.title} aria-label={lines.join(' ')}>
            {lines.map((line, i) => (
              <span key={i} className={k.line} style={{ '--d': `${i * 120}ms` } as CSSProperties} aria-hidden="true">
                <Letters text={line} accent={accent} />
                {i < lines.length - 1 && ' '}
              </span>
            ))}
          </h1>
          <div className={`${k.intro} ${k.rise}`} style={{ '--d': `${lines.length * 120 + 120}ms` } as CSSProperties}>
            {intro.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
          {status && (
            <p className={`${k.status} ${k.rise}`} style={{ '--d': `${lines.length * 120 + 240}ms` } as CSSProperties}>
              {status}
            </p>
          )}
          {action && (
            <div className={`${k.action} ${k.rise}`} style={{ '--d': `${lines.length * 120 + 360}ms` } as CSSProperties}>
              {action}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/**
 * 큰 문장 글자 하나하나 (2026-11-28): 마우스가 지나가는 글자가 10px 튀어 오르며 주황이 되고, 양옆 글자도 조금 따라 올라 물결처럼 보인다.
 * 낱말은 한 덩어리(nowrap)라 줄바꿈이 낱말 가운데서 일어나지 않는다. accent 낱말(예: '5기')은 처음부터 주황.
 * 화면 읽기 프로그램은 h1 의 aria-label 로 문장을 한 번에 읽는다.
 */
function Letters({ text, accent }: { text: string; accent?: string }) {
  const at = accent ? text.indexOf(accent) : -1
  let pos = 0
  return (
    <>
      {text.split(' ').map((word, wi, words) => {
        const start = pos
        pos += word.length + 1
        return (
          <span key={wi}>
            <span className={k.word}>
              {Array.from(word).map((ch, ci) => {
                const idx = start + ci
                const on = at >= 0 && idx >= at && idx < at + accent!.length
                return (
                  <span key={ci} className={k.char} data-accent={on || undefined}>
                    {ch}
                  </span>
                )
              })}
            </span>
            {wi < words.length - 1 && ' '}
          </span>
        )
      })}
    </>
  )
}
