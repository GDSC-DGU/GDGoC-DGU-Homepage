import { describe, expect, it } from 'vitest'
import { timelineSteps } from './timeline'

describe('홈 타임라인', () => {
  it('제목 · 날짜 모두 4기 실제 기록에서 (다음 기수 이름에 지난 날짜를 붙이지 않는다)', () => {
    const steps = timelineSteps()
    expect(steps.map((s) => s.title)).toEqual(['GDGoC DGU 4기 모집', 'OT & 뒤풀이', '세미나', 'G-Sprint', '4기 수료'])
    expect(steps.map((s) => s.when)).toEqual(['2026.09.03 ~ 09.10', '2026.09.15', '2026.09.22부터 매주 화요일', '2026.10.13 ~ 12.29', '미정'])
  })

  it('기록이 없는 기수는 지어내지 않고 미정', () => {
    expect(timelineSteps(9).every((s) => s.when === '미정')).toBe(true)
  })
})
