import { describe, expect, it } from 'vitest'
import { currentStep, timelineSteps } from './timeline'

describe('홈 타임라인', () => {
  it('제목 · 날짜 모두 4기 실제 기록에서 (다음 기수 이름에 지난 날짜를 붙이지 않는다)', () => {
    const steps = timelineSteps()
    expect(steps.map((s) => s.title)).toEqual(['일반 멤버 모집', '4기 OT', '정기 세션', 'G-Sprint', '4기 수료'])
    expect(steps.map((s) => s.when)).toEqual(['2026.09.03~09.10', '2026.09.15', '2026.09.22부터 매주 화요일', '2026.10.13~12.29', '2027.07'])
  })

  it('지금 단계: 오늘까지 시작한 마지막 단계 (끝났으면 없음)', () => {
    const steps = timelineSteps()
    expect(currentStep(steps, '2026-08-01')).toBeNull()
    expect(currentStep(steps, '2026-09-05')).toBe('recruit')
    expect(currentStep(steps, '2026-09-12')).toBeNull()
    expect(currentStep(steps, '2026-09-30')).toBe('seminar')
    expect(currentStep(steps, '2026-11-05')).toBe('sprint')
    expect(currentStep(steps, '2027-01-10')).toBeNull()
  })

  it('기록이 없는 기수는 지어내지 않고 미정', () => {
    expect(timelineSteps(9).every((s) => s.when === '미정')).toBe(true)
  })
})
