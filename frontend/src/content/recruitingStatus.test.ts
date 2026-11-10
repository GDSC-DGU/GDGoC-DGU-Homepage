import { describe, expect, it } from 'vitest'
import recruitingJson from './recruiting.json'
import { lastWindowOf, recruitStatus, recruitingProblems, type RecruitingCurrent, type RecruitingSource } from './recruitingStatus'

const CHANNEL = 'https://www.instagram.com/gdg.donggukuniv/'
const HISTORY: RecruitingSource['history'] = [
  {
    generation: 4,
    steps: [
      { id: 'core', start: '2026-08-18', end: '2026-08-31' },
      { id: 'general', start: '2026-09-03', end: '2026-09-10' },
      { id: 'ot', start: '2026-10-15' },
    ],
  },
  { generation: 3, steps: [{ id: 'general', start: '2025-08-01', end: '2025-08-10' }] },
]

const data = (cur: Partial<RecruitingCurrent> = {}): RecruitingSource => ({
  current: { generation: 5, channel: CHANNEL, ...cur },
  history: HISTORY,
})

const OPEN = { opensAt: '2027-08-20', deadline: '2027-09-05', applyUrl: 'https://forms.gle/example' }

describe('recruitStatus: 날짜로 정하는 모집 상태', () => {
  it('unscheduled: 날짜가 없으면 일정 미정 + 지난 모집 시기', () => {
    const s = recruitStatus('2026-10-18', data())
    expect(s).toMatchObject({ state: 'unscheduled', generation: 5, channelUrl: CHANNEL, lastGeneration: 4, lastWindow: '2026.08~09' })
    expect(s.opensAt).toBeUndefined()
    expect(s.daysLeft).toBeUndefined()
  })

  it('unscheduled: JSON 의 빈 칸(null)도 없는 것으로 본다', () => {
    const empty = { opensAt: null, deadline: null, applyUrl: null }
    expect(recruitStatus('2026-10-18', data(empty)).state).toBe('unscheduled')
    expect(recruitingProblems({ generation: 5, channel: CHANNEL, ...empty })).toEqual([])
  })

  it('soon: 열리기 전에는 열리는 날까지 남은 날', () => {
    const s = recruitStatus('2027-08-15', data(OPEN))
    expect(s).toMatchObject({ state: 'soon', opensAt: '2027-08-20', deadline: '2027-09-05', daysLeft: 5 })
  })

  it('open: 여는 날 당일부터 모집 중, 남은 날은 마감일까지', () => {
    expect(recruitStatus('2027-08-20', data(OPEN))).toMatchObject({ state: 'open', daysLeft: 16, applyUrl: OPEN.applyUrl })
  })

  it('open: 마감일 당일까지 모집 중 (D-day = 0)', () => {
    expect(recruitStatus('2027-09-05', data(OPEN))).toMatchObject({ state: 'open', daysLeft: 0 })
  })

  it('ended: 마감 다음 날부터', () => {
    const s = recruitStatus('2027-09-06', data(OPEN))
    expect(s.state).toBe('ended')
    expect(s.daysLeft).toBeUndefined()
  })

  it('마감일이 없으면 열린 뒤로 계속 모집 중', () => {
    expect(recruitStatus('2028-01-01', data({ opensAt: '2027-08-20' }))).toMatchObject({ state: 'open', daysLeft: undefined })
  })

  it('opensAt 없이 deadline 만 있으면 이미 열린 모집으로 본다', () => {
    expect(recruitStatus('2027-09-01', data({ deadline: '2027-09-05' })).state).toBe('open')
    expect(recruitStatus('2027-09-06', data({ deadline: '2027-09-05' })).state).toBe('ended')
  })

  it('Date 는 한국 날짜로 바꿔 본다 (UTC 로는 전날 밤)', () => {
    // 2027-08-19T15:30Z = 한국 2027-08-20 00:30 → 여는 날
    expect(recruitStatus(new Date('2027-08-19T15:30:00Z'), data(OPEN)).state).toBe('open')
    expect(recruitStatus(new Date('2027-08-19T14:30:00Z'), data(OPEN)).state).toBe('soon')
  })

  it('틀린 칸은 없는 것으로 본다: 없는 날 · 거꾸로 된 마감 · https 가 아닌 지원서 주소', () => {
    expect(recruitStatus('2027-08-25', data({ opensAt: '2027-02-30' })).state).toBe('unscheduled')
    const reversed = recruitStatus('2027-08-25', data({ opensAt: '2027-08-20', deadline: '2027-08-01' }))
    expect(reversed).toMatchObject({ state: 'open', deadline: undefined })
    expect(recruitStatus('2027-08-25', data({ ...OPEN, applyUrl: 'forms.gle/x' })).applyUrl).toBeUndefined()
  })
})

describe('recruitingProblems: 운영진이 적은 칸 검사', () => {
  it('맞는 칸이면 빈 목록', () => {
    expect(recruitingProblems({ generation: 5, channel: CHANNEL, ...OPEN })).toEqual([])
  })

  it('틀린 칸마다 한 줄', () => {
    const p = recruitingProblems({ generation: 5, channel: CHANNEL, opensAt: '2027-9-1', deadline: '2027-08-01', applyUrl: 'http://x' })
    expect(p).toHaveLength(2)
    expect(recruitingProblems({ generation: 5, channel: CHANNEL, opensAt: '2027-09-10', deadline: '2027-09-01' })).toEqual(['deadline 이 opensAt 보다 앞입니다'])
  })

  it('실제 recruiting.json 에 틀린 곳이 없다', () => {
    expect(recruitingProblems(recruitingJson.current as RecruitingCurrent)).toEqual([])
  })
})

describe('lastWindowOf: 지난 모집 시기', () => {
  it('가장 큰 기수의 OT 를 뺀 단계로 (배열 순서와 상관없이)', () => {
    expect(lastWindowOf([...HISTORY].reverse())).toEqual({ generation: 4, label: '2026.08~09' })
  })

  it('같은 달 · 해를 넘는 기간 · 기록 없음', () => {
    expect(lastWindowOf([{ generation: 1, steps: [{ id: 'a', start: '2026-03-02', end: '2026-03-09' }] }]).label).toBe('2026.03')
    expect(lastWindowOf([{ generation: 1, steps: [{ id: 'a', start: '2026-12-20', end: '2027-01-09' }] }]).label).toBe('2026.12~2027.01')
    expect(lastWindowOf([])).toEqual({})
    expect(lastWindowOf([{ generation: 2, steps: [{ id: 'ot', start: '2026-09-15' }] }])).toEqual({ generation: 2 })
  })

  it('실제 콘텐츠: 지난 모집은 4기 2026.08~09', () => {
    const s = recruitStatus('2026-10-18')
    expect(s.lastGeneration).toBe(4)
    expect(s.lastWindow).toBe('2026.08~09')
  })
})
