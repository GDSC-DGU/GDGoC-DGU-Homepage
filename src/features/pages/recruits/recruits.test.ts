import { describe, expect, it } from 'vitest'
import { EVENTS, RECRUITING } from '@/content'
import type { ScheduleEvent } from '@/domain/types'
import { EVENTS as ALL_EVENTS, FAQS, GENERATIONS, PUBLIC_PROJECTS } from '@/content'
import type { RecruitStatus } from '@/content/recruitingStatus'
import { buildBatches, firstHalfYear, monthsOf, springOf } from './batches'
import { faqGroupOf, faqIdFromHash, groupFaqs } from './faqGroups'
import { PARTS, partExamples, projectsUsing } from './parts'
import { shareUrl } from './share'
import { statusView } from './status'

const ev = (id: string, date: string, extra: Partial<ScheduleEvent> = {}): ScheduleEvent => ({ id, date, title: id, kind: 'session', place: 'community', ...extra })

describe('기수별 모집 목록', () => {
  const data = {
    current: { generation: 5 },
    history: [
      {
        generation: 4,
        steps: [
          { id: 'general', label: '일반', start: '2026-09-03', end: '2026-09-10' },
          { id: 'core', label: '코어', start: '2026-08-18', end: '2026-08-31' },
          { id: 'ot', label: 'OT', start: '2026-09-15' },
        ],
      },
    ],
  }
  const events = [
    ev('3rd-ot', '2025-09-19', { kind: 'recruit', place: 'recruits', generation: 3 }),
    ev('3rd-general-ot', '2025-10-10', { kind: 'recruit', place: 'recruits', generation: 3 }),
    ev('2nd-ot', '2024-09-19', { kind: 'recruit', place: 'recruits', generation: 2 }),
    ev('4th-ot', '2026-09-15', { kind: 'recruit', place: 'recruits', generation: 4 }),
    ev('session', '2025-10-31', { generation: 3 }),
  ]

  it('5기(아직) → 4기(단계 기록) → 3기 · 2기(공개 기록만)', () => {
    const b = buildBatches(data, events)
    expect(b.map((x) => [x.generation, x.status])).toEqual([
      [5, 'upcoming'],
      [4, 'closed'],
      [3, 'record'],
      [2, 'record'],
    ])
  })

  it('단계는 시작한 날 순서, 기간은 첫 시작부터 마지막 끝까지', () => {
    const four = buildBatches(data, events)[1]
    expect(four.steps.map((s) => s.id)).toEqual(['core', 'general', 'ot'])
    expect([four.start, four.end]).toEqual(['2026-08-18', '2026-09-15'])
  })

  it('단계 기록이 있는 기수의 OT 는 공개 기록으로 다시 넣지 않고, 세션은 넣지 않는다', () => {
    const b = buildBatches(data, events)
    expect(b[2].records.map((e) => e.id)).toEqual(['3rd-ot', '3rd-general-ot'])
    expect(b.flatMap((x) => x.records).some((e) => e.id === '4th-ot' || e.id === 'session')).toBe(false)
  })

  it('모집 중이면 open (모집 상태는 recruitStatus 가 날짜로 정해 넘긴다)', () => {
    expect(buildBatches(data, [], true)[0].status).toBe('open')
    expect(buildBatches(data, [])[0].status).toBe('upcoming')
  })

  it('실제 콘텐츠: 5기 · 4기 · 3기 · 2기 (1기는 공개 기록이 없어 뺀다)', () => {
    expect(buildBatches(RECRUITING, EVENTS).map((x) => x.generation)).toEqual([5, 4, 3, 2])
  })
})

describe('들어오면 이런 한 해', () => {
  it('4기 첫 반년은 2026.09~2027.02', () => {
    expect(firstHalfYear(EVENTS, 4)).toEqual({ start: '2026-09-01', end: '2027-02-28' })
    expect(firstHalfYear(EVENTS, 99)).toBeNull()
  })

  it('달별로 묶고, 일정 없는 달은 뺀다', () => {
    const months = monthsOf(
      [ev('b', '2026-10-13'), ev('a', '2026-09-15'), ev('rest', '2026-10-20', { kind: 'rest' }), ev('out', '2027-03-02')],
      { start: '2026-09-01', end: '2027-02-28' },
    )
    expect(months.map((m) => [m.month, m.events.map((e) => e.id)])).toEqual([
      [9, ['a']],
      [10, ['b', 'rest']],
    ])
  })

  it('봄 학기: 지금 기수 봄 일정이 없으면 앞 기수의 3~7월 공개 행사를 시리즈별로 접는다', () => {
    const url = 'https://gdg.community.dev/x/'
    const list = [
      ev('c10', '2026-03-06', { generation: 3, series: 'Camping Seminar', url }),
      ev('c11', '2026-03-13', { generation: 3, series: 'Camping Seminar', url }),
      ev('c15', '2026-04-10', { generation: 3, series: 'Camping Seminar', url }),
      ev('alumni', '2026-05-15', { generation: 3, title: 'Alumni Seminar', url }),
      ev('open', '2026-05-22', { generation: 3, title: 'Open Seminar', url }),
      ev('plan', '2026-06-01', { generation: 3, title: '계획만' }),
      ev('winter', '2026-01-09', { generation: 3, series: 'Camping Seminar', url }),
    ]
    expect(springOf(list, [{ n: 3, end: '2026-07' }], 4)).toEqual({
      generation: 3,
      items: [
        { when: '3~4월', names: ['Camping Seminar 3회'] },
        { when: '5월', names: ['Alumni Seminar', 'Open Seminar'] },
        { when: '7월', names: ['기수 마무리'] },
      ],
    })
  })

  it('봄 학기: 지금 기수 봄 일정이 공개되면 지난 기수 줄은 없다', () => {
    const list = [ev('c10', '2026-03-06', { generation: 3, url: 'https://x/' }), ev('mine', '2027-03-02', { generation: 4 })]
    expect(springOf(list, [], 4)).toBeNull()
    expect(springOf([], [], 4)).toBeNull()
  })

  it('실제 콘텐츠: 4기 봄은 지난 3기 Camping Seminar · Open Seminar 로', () => {
    const spring = springOf(ALL_EVENTS, GENERATIONS, 4)
    expect(spring?.generation).toBe(3)
    expect(spring?.items.flatMap((it) => it.names).join(' ')).toMatch(/Camping Seminar \d+회/)
    expect(spring?.items.at(-1)).toEqual({ when: '7월', names: ['기수 마무리'] })
  })
})

describe('네 파트: 지난 프로젝트 예', () => {
  const p = (id: string, stack: string[], extra: Record<string, unknown> = {}) => ({ id, name: id, program: 'x', year: 2025, status: 'done' as const, stack, ...extra })

  it('기술이 하나라도 맞는 끝난 프로젝트만, 표지가 있는 것 먼저', () => {
    const list = [p('a', ['React']), p('b', ['react'], { cover: { src: 'x' } }), p('c', ['Go']), p('d', ['React'], { status: 'in-progress' })]
    expect(projectsUsing(list as never, ['React']).map((x) => x.id)).toEqual(['b', 'a'])
    expect(projectsUsing(list as never, [])).toEqual([])
  })

  it('표지 중에서는 정사각에 가까운 로고 → 가로로 긴 글자 로고 → 화면 캡처 순 (40px 아이콘 줄에서 알아볼 수 있게)', () => {
    const cover = (kind: string, width: number, height: number) => ({ cover: { src: 'x', kind, width, height } })
    const list = [p('screen', ['React'], cover('screen', 960, 600)), p('wide', ['React'], cover('logo', 640, 182)), p('square', ['React'], { ...cover('logo', 480, 480), year: 2024 })]
    expect(projectsUsing(list as never, ['React']).map((x) => x.id)).toEqual(['square', 'wide', 'screen'])
  })

  it('앞 파트에서 보인 이름은 되도록 피하고, 예가 없는 파트는 빠진다', () => {
    const list = [p('ab', ['React', 'Go']), p('a2', ['React']), p('b2', ['Go'])]
    const ex = partExamples(list as never, [
      { id: 'frontend', techs: ['React'] },
      { id: 'backend', techs: ['Go'] },
      { id: 'design', techs: [] },
    ], 1)
    expect(ex.frontend?.shown.map((x) => x.id)).toEqual(['a2'])
    expect(ex.backend?.shown.map((x) => x.id)).toEqual(['ab'])
    expect(ex.backend?.total).toBe(2)
    expect(ex.design).toBeUndefined()
  })

  it('실제 콘텐츠: 개발 세 파트는 예가 있고, Product Design 은 칸을 숨긴다', () => {
    const ex = partExamples(PUBLIC_PROJECTS, PARTS)
    expect(Object.keys(ex).sort()).toEqual(['ai', 'backend', 'frontend'])
    for (const part of PARTS) expect(part.role.endsWith('니다.'), part.id).toBe(true)
  })
})

describe('모집 상태 문구', () => {
  const base: RecruitStatus = { state: 'unscheduled', generation: 5, channelUrl: 'https://www.instagram.com/x/', lastWindow: '2026.08~09', lastGeneration: 4 }
  const H = '@gdg.donggukuniv'

  it('unscheduled: 지난 모집 시기 + 인스타그램', () => {
    const v = statusView(base, '2026-10-18', H)
    expect(v.title).toBe('5기 모집은 아직 열리지 않았습니다')
    expect(v.lines).toEqual(['지난 4기는 2026.08~09에 모집했습니다.', `열리면 인스타그램 ${H}에 알립니다.`])
    expect(v.primary).toBe('channel')
    expect(v.dday).toBeUndefined()
  })

  it('soon: MM.DD에 열립니다 + D-n', () => {
    const v = statusView({ ...base, state: 'soon', opensAt: '2027-08-20', deadline: '2027-09-05', daysLeft: 5 }, '2027-08-15', H)
    expect(v.title).toBe('5기 모집은 08.20에 열립니다')
    expect(v.dday?.label).toBe('D-5')
    expect(v.lines[0]).toBe('08.20(금)부터 09.05(일)까지 지원서를 받습니다.')
    expect(v.primary).toBe('channel')
  })

  it('open: 모집 중 · MM.DD 마감 + 지원서 쓰기 (주소가 없으면 소식 받기)', () => {
    const open: RecruitStatus = { ...base, state: 'open', opensAt: '2027-08-20', deadline: '2027-09-05', applyUrl: 'https://forms.gle/x', daysLeft: 2 }
    const v = statusView(open, '2027-09-03', H)
    expect([v.title, v.titleSub]).toEqual(['5기 모집 중', '09.05 마감'])
    expect(v.dday?.label).toBe('D-2')
    expect(v.primary).toBe('apply')
    expect(v.lines).toEqual(['09.05(일)까지 지원서를 받습니다.'])
    const noUrl = statusView({ ...open, applyUrl: undefined }, '2027-09-03', H)
    expect(noUrl.primary).toBe('channel')
    expect(noUrl.lines[1]).toContain('모집 공지')
    expect(statusView({ ...open, deadline: '2027-09-03' }, '2027-09-03', H).dday?.label).toBe('D-day')
  })

  it('ended: 마감됐습니다', () => {
    const v = statusView({ ...base, state: 'ended', deadline: '2027-09-05' }, '2027-09-10', H)
    expect(v.title).toBe('5기 모집이 마감됐습니다')
    expect(v.primary).toBe('channel')
    expect(v.dday).toBeUndefined()
  })

  it('해가 다르면 날짜에 연도를 붙이고, 문장은 모두 ~니다.', () => {
    const v = statusView({ ...base, state: 'soon', opensAt: '2027-03-02' }, '2026-12-30', H)
    expect(v.title).toBe('5기 모집은 2027.03.02에 열립니다')
    for (const st of ['unscheduled', 'soon', 'open', 'ended'] as const) {
      const lines = statusView({ ...base, state: st, opensAt: '2027-03-02', deadline: '2027-03-09' }, '2027-03-05', H).lines
      for (const l of lines) expect(l, `${st}: ${l}`).toMatch(/니다\.$/)
    }
  })
})

describe('자주 묻는 질문 묶음', () => {
  it('지원 · 활동으로 빠짐없이 나뉘고, 지원 묶음은 모집 시기부터', () => {
    const g = groupFaqs(FAQS)
    expect(g.apply.length + g.activity.length).toBe(FAQS.length)
    expect(g.apply.length).toBeGreaterThan(0)
    expect(g.activity.length).toBeGreaterThan(0)
    expect(g.apply[0].id).toBe('when-recruit')
  })

  it('모르는 질문은 활동으로, 주소에서 질문 id 를 읽는다', () => {
    expect(faqGroupOf('who')).toBe('apply')
    expect(faqGroupOf('new-question')).toBe('activity')
    expect(faqIdFromHash('#faq-who')).toBe('who')
    expect(faqIdFromHash('#faq')).toBeNull()
  })
})

describe('공유 주소', () => {
  const loc = { origin: 'https://gdg.example', pathname: '/recruits', search: '' }
  it('섹션 표시(#faq)는 빼고, hash 주소 미리보기는 경로를 남긴다', () => {
    expect(shareUrl({ ...loc, hash: '#faq' })).toBe('https://gdg.example/recruits')
    expect(shareUrl({ ...loc, hash: '' })).toBe('https://gdg.example/recruits')
    expect(shareUrl({ ...loc, pathname: '/', hash: '#/recruits' })).toBe('https://gdg.example/#/recruits')
    expect(shareUrl({ ...loc, pathname: '/', hash: '#/recruits#faq-who' })).toBe('https://gdg.example/#/recruits')
  })
})
