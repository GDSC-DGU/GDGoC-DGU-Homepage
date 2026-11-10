import { describe, expect, it } from 'vitest'
import type { ScheduleEvent } from '@/domain/types'
import {
  addDays,
  assignLanes,
  currentGeneration,
  dateAt,
  dayLabel,
  edgeOf,
  eventsInPeriod,
  halfYearOf,
  lastOfMonth,
  monthSegments,
  periodDays,
  placeStepLabels,
  progressCount,
  railPeriod,
  spanLabel,
  spokenDate,
  sprintWindow,
  textWidth,
  weekTicks,
  xOf,
} from './rail'

const ev = (id: string, date: string, extra: Partial<ScheduleEvent> = {}): ScheduleEvent => ({
  id,
  date,
  title: id,
  kind: 'session',
  place: 'community',
  ...extra,
})

const FALL = { start: '2026-09-01', end: '2027-02-28' }

describe('날짜 계산', () => {
  it('날짜 더하기와 달의 마지막 날 (윤년 포함)', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02')
    expect(lastOfMonth('2027-02-10')).toBe('2027-02-28')
    expect(lastOfMonth('2028-02-01')).toBe('2028-02-29')
  })

  it('반년 단위: 9~2월, 3~8월', () => {
    expect(halfYearOf('2026-10-17')).toEqual(FALL)
    expect(halfYearOf('2027-01-30')).toEqual(FALL)
    expect(halfYearOf('2027-02-28')).toEqual(FALL)
    expect(halfYearOf('2027-03-01')).toEqual({ start: '2027-03-01', end: '2027-08-31' })
    expect(halfYearOf('2027-09-01')).toEqual({ start: '2027-09-01', end: '2028-02-29' })
  })
})

describe('가로 위치', () => {
  it('9.1~2.28 은 181일', () => {
    expect(periodDays(FALL)).toBe(181)
  })

  it('표식은 그날 한가운데, 경계선은 그날 시작', () => {
    expect(xOf('2026-09-01', FALL)).toBeCloseTo(0.5 / 181)
    expect(xOf('2027-02-28', FALL)).toBeCloseTo(180.5 / 181)
    expect(edgeOf('2026-10-01', FALL)).toBeCloseTo(30 / 181)
  })

  it('위치 → 날짜는 위치 계산의 반대이고, 범위 밖은 양 끝', () => {
    for (const d of ['2026-09-01', '2026-10-17', '2026-12-29', '2027-02-28']) expect(dateAt(xOf(d, FALL), FALL)).toBe(d)
    expect(dateAt(-0.2, FALL)).toBe('2026-09-01')
    expect(dateAt(1.5, FALL)).toBe('2027-02-28')
  })
})

describe('눈금과 달 구간', () => {
  it('화요일 눈금: 9.1 이 화요일이라 거기서 시작해 7일 간격', () => {
    const ticks = weekTicks(FALL)
    expect(ticks[0]).toBe('2026-09-01')
    expect(ticks[1]).toBe('2026-09-08')
    expect(ticks).toContain('2026-10-27')
    expect(ticks.at(-1)).toBe('2027-02-23')
    expect(ticks).toHaveLength(26)
  })

  it('다른 요일로도 센다 (월요일)', () => {
    expect(weekTicks(FALL, 1)[0]).toBe('2026-09-07')
  })

  it('달 구간은 9월부터 2월까지 빈틈없이 이어진다', () => {
    const segs = monthSegments(FALL)
    expect(segs.map((s) => s.month)).toEqual([9, 10, 11, 12, 1, 2])
    expect(segs[4].year).toBe(2027)
    expect(segs[0].from).toBe(0)
    expect(segs.at(-1)!.to).toBeCloseTo(1)
    for (let i = 1; i < segs.length; i++) expect(segs[i].from).toBeCloseTo(segs[i - 1].to)
  })

  it('기간이 달 중간에 시작하면 첫 구간도 그날부터', () => {
    const segs = monthSegments({ start: '2026-09-15', end: '2026-10-31' })
    expect(segs[0]).toMatchObject({ ymd: '2026-09-15', month: 9, from: 0 })
    expect(segs[1].ymd).toBe('2026-10-01')
  })
})

describe('레일 기간', () => {
  const events = [
    ev('3rd-demo', '2026-06-20', { generation: 3 }),
    ev('ot', '2026-09-15', { generation: 4 }),
    ev('kickoff', '2026-10-13', { generation: 4, kind: 'sprint' }),
    ev('thon', '2027-01-30', { generation: 4, endDate: '2027-01-31' }),
  ]

  it('지금 기수는 오늘까지 열린 가장 최근 일정의 기수', () => {
    expect(currentGeneration(events, '2026-10-17')).toBe(4)
    expect(currentGeneration(events, '2026-07-01')).toBe(3)
    expect(currentGeneration(events, '2025-01-01')).toBe(3)
  })

  it('4기 일정이 있는 2학기: 2026.09.01~2027.02.28', () => {
    expect(railPeriod(events, '2026-10-17')).toEqual(FALL)
  })

  it('지난 기수 행사가 많이 더해져도 지금 반년을 고른다', () => {
    const many = [...events, ...Array.from({ length: 40 }, (_, i) => ev(`old-${i}`, addDays('2023-09-05', i * 14), { generation: 1 + (i % 3) }))]
    expect(railPeriod(many, '2026-10-17')).toEqual(FALL)
  })

  it('오늘이 든 반년에 그 기수 일정이 없으면 가장 가까운 일정의 반년', () => {
    // 2027.03: 4기 일정은 1월이 마지막 → 마지막 일정의 반년
    expect(railPeriod(events, '2027-03-10')).toEqual(FALL)
  })

  it('일정이 없으면 오늘이 든 반년', () => {
    expect(railPeriod([], '2026-10-17')).toEqual(FALL)
  })

  it('기간에 걸친 일정만 날짜순으로', () => {
    const list = eventsInPeriod([events[3], events[0], events[2], ev('edge', '2026-08-31', { endDate: '2026-09-01' })], FALL)
    expect(list.map((e) => e.id)).toEqual(['edge', 'kickoff', 'thon'])
  })
})

describe('G-Sprint 기간', () => {
  const steps = [
    { label: '발제', date: '2026-09-22' },
    { label: '팀빌딩', date: '2026-10-06' },
    { label: '주제 발표', date: '2026-10-13' },
    { label: '중간 발표', date: '2026-10-27' },
    { label: '개발', date: '2026-11-03' },
    { label: '데모데이', date: '2026-12-29' },
  ]

  it('킥오프(첫 G-Sprint 일정)부터 데모데이까지', () => {
    const w = sprintWindow(steps, '2026-12-29', [ev('intro', '2026-09-22'), ev('kickoff', '2026-10-13', { kind: 'sprint' })])
    expect(w?.start).toBe('2026-10-13')
    expect(w?.end).toBe('2026-12-29')
    expect(w?.steps.map((s) => s.label)).toEqual(['주제 발표', '중간 발표', '개발', '데모데이'])
  })

  it('일정이 아직 없으면 그리지 않는다', () => {
    expect(sprintWindow(steps, '2026-12-29', [])).toBeNull()
  })
})

describe('겹치는 표식', () => {
  it('가까우면 다음 줄로, 떨어지면 같은 줄', () => {
    const spans = [0, 5, 30, 33, 34].map((x) => ({ from: x, to: x }))
    expect(assignLanes(spans, 12)).toEqual([0, 1, 0, 1, 2])
  })

  it('여러 날 막대는 끝에서부터 간격을 잰다', () => {
    expect(assignLanes([{ from: 0, to: 20 }, { from: 25, to: 25 }, { from: 40, to: 40 }], 12)).toEqual([0, 1, 0])
  })
})

describe('단계 이름 자리', () => {
  it('글자 폭은 한글을 1em 으로 어림한다', () => {
    expect(textWidth('개발', 13)).toBe(26)
    expect(textWidth('주제 발표', 13)).toBe(Math.ceil(4.3 * 13))
  })

  it('880px 레일: 겹치는 "개발"은 구간 가운데로, 데모데이는 끝에 오른쪽 맞춤', () => {
    const W = 880
    const x = (d: string) => xOf(d, FALL) * W
    const names = ['주제 발표', '중간 발표', '개발', '데모데이']
    const dates = ['2026-10-13', '2026-10-27', '2026-11-03', '2026-12-29']
    const placed = placeStepLabels(dates.map((d, i) => ({ x: x(d), width: textWidth(names[i], 13) })))
    expect(placed.map((p) => p.hidden)).toEqual([false, false, false, false])
    expect(placed[0].left).toBeCloseTo(x(dates[0]) - 4)
    expect(placed[1].left).toBeCloseTo(x(dates[1]) - 4)
    expect(placed[2].left).toBeCloseTo((x(dates[2]) + x(dates[3])) / 2 - 13)
    expect(placed[3].left + textWidth('데모데이', 13)).toBeCloseTo(x(dates[3]) + 4)
  })

  it('자리가 없으면 숨기고, 다음 구간이 넓으면 가운데로 옮긴다', () => {
    const placed = placeStepLabels([
      { x: 10, width: 60 },
      { x: 30, width: 60 },
      { x: 40, width: 60 },
      { x: 400, width: 40 },
    ])
    expect(placed.map((p) => p.hidden)).toEqual([false, true, false, false])
    expect(placed[2].left).toBe(190)
  })
})

describe('표기', () => {
  it('날짜: 10.27 화, 해가 다르면 연도', () => {
    expect(dayLabel('2026-10-27', '2026-10-17')).toBe('10.27 화')
    expect(dayLabel('2027-01-30', '2026-10-17')).toBe('2027.01.30 토')
  })

  it('여러 날 일정', () => {
    expect(spanLabel({ date: '2027-01-30', endDate: '2027-01-31' }, '2026-10-17')).toBe('2027.01.30~31 토~일')
    expect(spanLabel({ date: '2026-10-31', endDate: '2026-11-02' }, '2026-10-17')).toBe('10.31~11.02 토~월')
    expect(spanLabel({ date: '2026-10-27' }, '2026-10-17')).toBe('10.27 화')
  })

  it('화면 읽기용 날짜', () => {
    expect(spokenDate('2026-10-27', '2026-10-17')).toBe('10월 27일 화요일')
    expect(spokenDate('2027-01-30', '2026-10-17')).toBe('2027년 1월 30일 토요일')
  })

  it('끝난 일정 수 (휴회 제외, 여러 날은 끝나는 날 기준)', () => {
    const list = [ev('a', '2026-09-15'), ev('rest', '2026-10-20', { kind: 'rest' }), ev('b', '2026-10-17'), ev('c', '2026-10-10', { endDate: '2026-10-18' })]
    expect(progressCount(list, '2026-10-17')).toEqual({ done: 1, total: 3 })
  })
})
