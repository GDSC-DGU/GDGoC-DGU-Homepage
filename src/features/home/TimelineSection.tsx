import { StorySection } from '@/features/common'
import { useToday } from '@/hooks/useToday'
import { BASE_GEN, currentStep, timelineSteps } from './timeline'
import s from './timeline.module.css'

/**
 * 홈 '{n}기의 1년' (AI 티 점검 2026-11-05: 좌우로 번갈아 놓던 세로줄 + 마스코트 그림 → 가로 한 줄 다섯 단계).
 * 넓은 화면: 위에 가로줄 하나, 단계마다 점 → 이름 → 날짜. 지나간 구간은 먹색 줄, 남은 구간은 옅은 줄.
 * 오늘 걸린 단계에만 '지금' 을 붙인다 (timeline.ts currentStep). 폰: 왼쪽 세로줄 + 단계 목록.
 * 움직임 없음 (DESIGN 3-3).
 */
export function TimelineSection() {
  const today = useToday()
  const steps = timelineSteps()
  const now = currentStep(steps, today)
  return (
    <StorySection id="timeline" titleSize="h2" title={`${BASE_GEN}기의 1년`}>
      <ol className={s.line}>
        {steps.map((step) => {
          const done = Boolean(step.start && step.start <= today)
          return (
            <li key={step.id} className={s.step} data-done={done || undefined} data-now={step.id === now || undefined} aria-current={step.id === now ? 'step' : undefined}>
              <span className={s.dot} aria-hidden="true" />
              {step.id === now && <span className={s.now}>지금</span>}
              <h3 className={s.title}>{step.title}</h3>
              <p className={`${s.when} ${step.when === '미정' ? '' : 'num'}`}>{step.when}</p>
            </li>
          )
        })}
      </ol>
    </StorySection>
  )
}
