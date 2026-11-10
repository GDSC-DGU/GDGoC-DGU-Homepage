import { useEffect, useRef, type PointerEvent } from 'react'
import { StorySection } from '@/features/common'
import { useToday } from '@/hooks/useToday'
import { BASE_GEN, currentStep, timelineSteps, type TimelineStep } from './timeline'
import s from './timeline.module.css'

/**
 * 홈 '{n}기의 1년' (4기 Organizer 2026-11-06: 가로 한 줄 → 처음 시안의 세로줄 + 구름 마스코트로 되돌렸다).
 * 가운데 주황 세로줄(기수색) + 단계가 좌우로 번갈아. 줄마다 [왼쪽 | 점 | 오른쪽] 세 칸이고,
 * 단계 글 반대편에는 마스코트 구름 그림이 놓인다 (그림은 꾸밈이라 읽지 않는다).
 * 오늘 걸린 단계에만 '지금' 을 붙인다 (timeline.ts currentStep). 지나간 단계 점은 채우고, 남은 단계 점은 비운다.
 * 폰: 줄을 왼쪽으로 옮기고 단계를 모두 오른쪽에, 그림은 단계 아래에 작게.
 * 움직임: '지금' 이름표(그 줄에 구름이 있으면 구름도)가 화면에 들어올 때 한 번, 마우스를 올릴 때 한 번 통통 튄다
 * (바운스, --ease-bounce. hallmark 12 의 튕김 금지는 4기 Organizer 가 고른 이 자리에서만 풀었다 2026-11-06). '동작 줄이기'면 없음.
 */
type Mascot = 'hello' | 'coding' | 'graduation'
const ART = `${import.meta.env.BASE_URL}mascot/`
const MASCOT: Record<Mascot, { src: string; w: number; h: number }> = {
  hello: { src: `${ART}hello.webp`, w: 347, h: 361 },
  coding: { src: `${ART}coding.webp`, w: 395, h: 319 },
  graduation: { src: `${ART}graduation.webp`, w: 439, h: 360 },
}

/**
 * 줄 배치: 단계가 놓이는 쪽 + 반대편 그림.
 * 졸업 구름은 시안에서는 G-Sprint 줄에 있었지만, 폰에서 그림이 단계 아래로 붙으면 G-Sprint 가 곧 수료처럼 읽혀서 수료 줄로 옮겼다.
 */
const LAYOUT: Record<TimelineStep['id'], { side: 'left' | 'right'; mascot?: Mascot }> = {
  recruit: { side: 'right' },
  ot: { side: 'left', mascot: 'hello' },
  seminar: { side: 'right', mascot: 'coding' },
  sprint: { side: 'left' },
  graduation: { side: 'right', mascot: 'graduation' },
}

export function TimelineSection() {
  const today = useToday()
  const steps = timelineSteps()
  const now = currentStep(steps, today)
  const lineRef = useRef<HTMLOListElement>(null)
  useEffect(() => {
    const row = lineRef.current?.querySelector<HTMLElement>('[data-now]')
    if (!row || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return
        row.dataset.hop = '1'
        io.disconnect()
      },
      { rootMargin: '0px 0px -20% 0px' },
    )
    io.observe(row)
    return () => io.disconnect()
  }, [now])
  // 마우스를 올리면 한 번 더: 이름을 번갈아 바꿔 애니메이션을 새로 건다 (떠날 때는 다시 튀지 않는다)
  const hopAgain = (e: PointerEvent<HTMLLIElement>) => {
    const row = e.currentTarget
    if (e.pointerType !== 'mouse' || !row.dataset.hop) return
    row.dataset.hop = row.dataset.hop === '1' ? '2' : '1'
  }
  return (
    <StorySection id="timeline" className={s.section} titleSize="h2" title={`${BASE_GEN}기의 1년`}>
      <ol ref={lineRef} className={s.line}>
        {steps.map((step) => {
          const { side, mascot } = LAYOUT[step.id]
          const done = Boolean(step.start && step.start <= today)
          const isNow = step.id === now
          const text = (
            <div className={s.step}>
              {isNow && <span className={s.now}>지금</span>}
              <h3 className={s.title}>{step.title}</h3>
              <p className={`${s.when} ${step.when === '미정' ? '' : 'num'}`}>{step.when}</p>
            </div>
          )
          const art = mascot ? <img className={s.art} data-art={mascot} src={MASCOT[mascot].src} width={MASCOT[mascot].w} height={MASCOT[mascot].h} alt="" loading="lazy" decoding="async" /> : null
          return (
            <li key={step.id} className={s.row} data-side={side} data-done={done || undefined} data-now={isNow || undefined} aria-current={isNow ? 'step' : undefined} onPointerEnter={isNow ? hopAgain : undefined}>
              <div className={s.left}>{side === 'left' ? text : art}</div>
              <span className={s.dot} aria-hidden="true" />
              <div className={s.right}>{side === 'right' ? text : art}</div>
            </li>
          )
        })}
      </ol>
    </StorySection>
  )
}
