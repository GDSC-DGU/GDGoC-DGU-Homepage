/**
 * 단계 줄 계산 (프로젝트 G-Sprint 단계: projects/sprint.ts).
 * timeline.test.ts 에 테스트.
 */

export type StepState = 'done' | 'next' | 'later'

/**
 * 단계마다 상태: 날짜가 지났으면 done, 그 다음 하나는 next, 나머지는 later.
 * 그날 당일은 아직 done 이 아니라 next ('지금 단계', D-day) 다.
 * 날짜를 모르는 단계(null)는 지나지 않은 것으로 본다 (projects/sprint.ts 가 뒤 단계를 보고 정리한다).
 */
export function stepStates(dates: readonly (string | null)[], today: string): StepState[] {
  let nextGiven = false
  return dates.map((d) => {
    if (d !== null && d < today) return 'done'
    if (!nextGiven) {
      nextGiven = true
      return 'next'
    }
    return 'later'
  })
}
