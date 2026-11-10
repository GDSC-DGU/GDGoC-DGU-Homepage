import { describe, expect, it } from 'vitest'
import { stepStates } from './timeline'

describe('stepStates', () => {
  const dates = ['2026-09-22', '2026-10-06', '2026-10-13', '2026-10-27', null, '2026-12-29']

  it('지난 단계는 done, 바로 다음 하나만 next', () => {
    expect(stepStates(dates, '2026-10-17')).toEqual(['done', 'done', 'done', 'next', 'later', 'later'])
  })

  it('그날 당일은 아직 지금 단계(next), 다음 날 done', () => {
    expect(stepStates(dates, '2026-10-27')).toEqual(['done', 'done', 'done', 'next', 'later', 'later'])
    expect(stepStates(dates, '2026-10-28')).toEqual(['done', 'done', 'done', 'done', 'next', 'later'])
  })

  it('모두 지나면 next 가 없다', () => {
    expect(stepStates(['2026-01-01', '2026-02-01'], '2026-10-17')).toEqual(['done', 'done'])
  })
})
