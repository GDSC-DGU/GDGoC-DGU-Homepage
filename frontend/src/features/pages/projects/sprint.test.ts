import { describe, expect, it } from 'vitest'
import { SPRINT } from '@/config/site'
import { CHAPTER } from '@/content'
import { sprintClaim, sprintSteps } from './sprint'

const STEPS = [
  { label: '발제', when: '09.22', date: '2026-09-22' },
  { label: '팀빌딩', when: '10.06', date: '2026-10-06' },
  { label: '킥오프', when: '10.13', date: '2026-10-13' },
  { label: '중간 발표', when: '10.27', date: '2026-10-27' },
  { label: '개발', when: '11월', date: '2026-11-03' },
  { label: '데모데이', when: '12.29', date: '2026-12-29' },
]
const states = (today: string) => sprintSteps(STEPS, today).map((s) => s.state)

describe('G-Sprint 단계 줄', () => {
  it('지난 단계 done, 다음 하나만 next (지금 강조), 날짜가 있으면 D-day', () => {
    const steps = sprintSteps(STEPS, '2026-10-18')
    expect(steps.map((s) => s.state)).toEqual(['done', 'done', 'done', 'next', 'later', 'later'])
    expect(steps[3]).toMatchObject({ label: '중간 발표', dateTime: '2026-10-27', dday: 'D-9' })
    expect(steps.filter((s) => s.dday)).toHaveLength(1)
  })

  it('달로만 적은 단계(개발)는 날짜 없이 그 달, D-day 도 없다', () => {
    const steps = sprintSteps(STEPS, '2026-11-10')
    expect(steps[4]).toMatchObject({ state: 'next', when: '11월', dateTime: undefined, dday: undefined })
  })

  it('데모데이가 지나면 날짜 없는 단계까지 모두 지남 (개발이 다음 단계로 남지 않는다)', () => {
    expect(states('2026-12-30')).toEqual(['done', 'done', 'done', 'done', 'done', 'done'])
  })

  it('단계 날짜 당일은 그 단계가 지금 단계(D-day)', () => {
    const mid = sprintSteps(STEPS, '2026-10-27')
    expect(mid.map((s) => s.state)).toEqual(['done', 'done', 'done', 'next', 'later', 'later'])
    expect(mid[3].dday).toBe('D-day')
    const demo = sprintSteps(STEPS, '2026-12-29')
    expect(demo.map((s) => s.state)).toEqual(['done', 'done', 'done', 'done', 'done', 'next'])
    expect(demo[5].dday).toBe('D-day')
  })

  it('시작 전에는 첫 단계가 다음 단계', () => {
    expect(states('2026-09-01')).toEqual(['next', 'later', 'later', 'later', 'later', 'later'])
  })
})

describe('G-Sprint 주장', () => {
  const facts = { generation: 4, teams: 5, members: 27, verified: true }

  it('팀 · 인원 · 데모데이 날짜', () => {
    expect(sprintClaim(facts, '2026-12-29', '2026-10-18')).toEqual({ past: false, demo: '12.29', counted: true, teams: 5, members: 27, generation: 4 })
  })

  it('데모데이가 지나면 과거형, 해가 바뀌면 연도를 붙인다', () => {
    const c = sprintClaim(facts, '2026-12-29', '2027-01-05')
    expect(c.past).toBe(true)
    expect(c.demo).toBe('2026.12.29')
    expect(sprintClaim(facts, '2026-12-29', '2026-12-29').past).toBe(false)
  })

  it('확인하지 않은 숫자는 쓰지 않는다', () => {
    expect(sprintClaim({ ...facts, verified: false }, '2026-12-29', '2026-10-18').counted).toBe(false)
  })

  it('실제 데이터: chapter.json 과 SPRINT 의 데모데이가 같다', () => {
    expect(CHAPTER.sprint.demoDay).toBe(SPRINT.demoDay)
    expect(sprintSteps(SPRINT.steps, '2026-10-18').find((s) => s.state === 'next')?.label).toBe('중간 발표')
  })
})
