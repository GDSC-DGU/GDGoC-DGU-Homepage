import { describe, expect, it } from 'vitest'
import { CHAPTER, EVENTS, GENERATIONS, PUBLIC_PROJECTS } from '@/content'
import type { ScheduleEvent } from '@/domain/types'
import { mainVenue, mainWeekday, partitionGeneration, stationLabel } from './archiveModel'
import { countByGeneration, generationPeriod, highlightMentions, sortGenerations, tallies } from './history'
import { dotDate, pageSources } from './pageSources'
import { pastEvents } from '../records'
import { meetingCycle, regularTime, weekState } from './thisWeek'
import { isRoomCode, splitVenue } from './venue'

const ev = (id: string, date: string, extra: Partial<ScheduleEvent> = {}): ScheduleEvent => ({
  id,
  date,
  title: id,
  kind: 'session',
  place: 'community',
  generation: 4,
  ...extra,
})

describe('splitVenue (호실 안내판)', () => {
  it('건물과 호실을 나눈다', () => {
    expect(splitVenue('정보문화관 P301')).toEqual({ building: '정보문화관', room: 'P301' })
    expect(splitVenue('건국대 공학관 C487')).toEqual({ building: '건국대 공학관', room: 'C487' })
    expect(splitVenue('신공학관 4142')).toEqual({ building: '신공학관', room: '4142' })
    expect(splitVenue('원흥관 PBL실')).toEqual({ building: '원흥관', room: 'PBL실' })
    expect(splitVenue('혜화관 미래융합세미나실')).toEqual({ building: '혜화관', room: '미래융합세미나실' })
  })

  it('호실이 없으면 건물 이름만', () => {
    expect(splitVenue('홍익대')).toEqual({ building: '홍익대' })
    expect(splitVenue('동국대 신공학관')).toEqual({ building: '동국대 신공학관' })
    expect(splitVenue('  정보문화관 ')).toEqual({ building: '정보문화관' })
  })

  it('번호 호실만 숫자 글꼴로', () => {
    expect(isRoomCode('P301')).toBe(true)
    expect(isRoomCode('4142')).toBe(true)
    expect(isRoomCode('PBL실')).toBe(false)
  })

  it('실제 events.json 의 장소는 모두 건물 이름을 남긴다', () => {
    for (const e of EVENTS) if (e.venue) expect(splitVenue(e.venue).building.length).toBeGreaterThan(0)
  })
})

describe('이번 주 (모임 주기)', () => {
  it('오늘부터 다가오는 화요일까지. 화요일에는 오늘 하루', () => {
    expect(meetingCycle('2026-10-17')).toEqual({ from: '2026-10-17', meet: '2026-10-20' }) // 토 → 화
    expect(meetingCycle('2026-10-20')).toEqual({ from: '2026-10-20', meet: '2026-10-20' }) // 화
    expect(meetingCycle('2026-10-21')).toEqual({ from: '2026-10-21', meet: '2026-10-27' }) // 수
  })

  const list = [
    ev('kickoff', '2026-10-13', { kind: 'sprint', place: 'projects' }),
    ev('rest', '2026-10-20', { kind: 'rest' }),
    ev('mid', '2026-10-27', { kind: 'sprint', place: 'projects' }),
    ev('dhdr', '2026-11-02', { kind: 'event' }),
    ev('fin', '2026-12-01'),
  ]

  it('휴회 주: 모이지 않고, 다음 일정은 휴회 뒤 첫 일정', () => {
    const w = weekState(list, '2026-10-17')
    expect(w.status).toBe('rest')
    expect(w.rest?.id).toBe('rest')
    expect(w.meeting).toEqual([])
    expect(w.next?.id).toBe('mid')
  })

  it('모이는 주: 모임 요일 일정과 그다음 일정', () => {
    const w = weekState(list, '2026-10-21')
    expect(w.status).toBe('meet')
    expect(w.meeting.map((e) => e.id)).toEqual(['mid'])
    expect(w.next?.id).toBe('dhdr')
  })

  it('모임 요일에 공개 일정이 없으면 quiet, 그 주의 다른 일정은 others', () => {
    const w = weekState(list, '2026-10-28')
    expect(w.status).toBe('quiet')
    expect(w.meet).toBe('2026-11-03')
    expect(w.others.map((e) => e.id)).toEqual(['dhdr'])
    expect(w.next?.id).toBe('dhdr')
  })

  it('다가오는 일정이 없으면 off', () => {
    expect(weekState(list, '2027-03-01').status).toBe('off')
    expect(weekState([], '2026-10-17').status).toBe('off')
  })

  it('실제 콘텐츠: 2026.10.17 에는 10.20 중간고사 휴회, 다음은 10.27 G-Sprint 중간 발표', () => {
    const w = weekState(EVENTS, '2026-10-17')
    expect(w.status).toBe('rest')
    expect(w.rest?.id).toBe('4th-rest-mid')
    expect(w.next?.id).toBe('4th-sprint-mid')
  })
})

describe('regularTime (정기 세션 시간)', () => {
  it('4기 화요일 세션 · G-Sprint 단계에만 18:00', () => {
    expect(regularTime(ev('a', '2026-10-27', { kind: 'sprint' }))).toBe('18:00')
    expect(regularTime(ev('b', '2026-12-01'))).toBe('18:00')
  })

  it('운영 계획에만 있는 일정(특강 · 데모데이)에는 붙이지 않는다', () => {
    expect(regularTime(ev('plan', '2026-12-01', { source: '4기 운영 계획' }))).toBeNull()
    expect(regularTime(ev('demo', '2026-12-29', { kind: 'sprint', source: '4기 운영 계획' }))).toBeNull()
  })

  it('행사 · 다른 요일 · 다른 기수 · 여러 날 행사에는 붙이지 않는다', () => {
    expect(regularTime(ev('mt', '2026-12-15', { kind: 'event' }))).toBeNull()
    expect(regularTime(ev('mon', '2026-11-02'))).toBeNull()
    expect(regularTime(ev('old', '2025-11-04', { generation: 3 }))).toBeNull()
    expect(regularTime(ev('multi', '2026-10-27', { endDate: '2026-10-28' }))).toBeNull()
  })
})

describe('행사 기록 나누기', () => {
  const gen = [
    ev('cs3', '2026-03-13', { series: 'Camping Seminar', title: 'Camping Seminar 3회', venue: '정보문화관 P404' }),
    ev('conf', '2026-03-10', { kind: 'event' }),
    ev('cs2', '2026-03-06', { series: 'Camping Seminar', title: 'Camping Seminar 2회', venue: '정보문화관 P404' }),
    ev('alumni', '2026-03-05', { series: 'Alumni Seminar' }),
    ev('cs1', '2026-02-27', { series: 'Camping Seminar', title: 'Camping Seminar 1회', venue: '정보문화관 P205' }),
    ev('ot', '2025-09-19', { kind: 'recruit', place: 'recruits' }),
  ]

  it('대표 행사 · 3회 이상 연속 세션(노선) · 그 밖의 기록', () => {
    const p = partitionGeneration(gen)
    expect(p.signature.map((e) => e.id)).toEqual(['conf'])
    expect(p.routes).toHaveLength(1)
    expect(p.routes[0].series).toBe('Camping Seminar')
    expect(p.routes[0].events.map((e) => e.id)).toEqual(['cs1', 'cs2', 'cs3'])
    expect(p.rows.map((e) => e.id)).toEqual(['alumni', 'ot'])
  })

  it('2회뿐인 시리즈는 줄로 남긴다', () => {
    const p = partitionGeneration(gen.filter((e) => e.id !== 'cs3'))
    expect(p.routes).toEqual([])
    expect(p.rows.map((e) => e.id)).toEqual(['cs2', 'alumni', 'cs1', 'ot'])
  })

  it('실제 3기: Camping Seminar 14회가 노선 하나가 된다', () => {
    const third = EVENTS.filter((e) => e.generation === 3).sort((a, b) => b.date.localeCompare(a.date))
    const p = partitionGeneration(third)
    const cs = p.routes.find((r) => r.series === 'Camping Seminar')
    expect(cs?.events).toHaveLength(14)
    expect(p.signature.map((e) => e.id)).toContain('3rd-dev-conference')
    expect(mainWeekday(cs?.events ?? [])).toBe('금')
    expect(mainVenue(cs?.events ?? [])).toBe('정보문화관 P404')
  })

  it('요일 · 장소는 절반 이상일 때만', () => {
    expect(mainWeekday([{ date: '2026-10-13' }, { date: '2026-10-14' }, { date: '2026-10-15' }])).toBeNull()
    expect(mainWeekday([])).toBeNull()
    expect(mainVenue([{ venue: 'A' }, { venue: 'B' }, {}])).toBeNull()
  })

  it('역 이름은 회차', () => {
    expect(stationLabel({ title: 'Camping Seminar 12회' }, 0)).toBe('12회')
    expect(stationLabel({ title: 'Gemini Study Jams 2주차' }, 0)).toBe('2주차')
    expect(stationLabel({ title: 'Alumni Seminar' }, 1)).toBe('2')
  })
})

describe('페이지 끝 출처 한 줄', () => {
  it('갱신 날짜는 요일 없이 점으로', () => {
    expect(dotDate('2026-10-18')).toBe('2026.10.18')
  })

  it('도메인마다 하나, 글 출처는 이름만, 인스타그램 글은 주소와 하나로, 저장소 파일은 뺀다', () => {
    const items = pageSources(
      [
        'https://gdg.community.dev/events/a/',
        ['https://gdg.community.dev/events/b/', 'https://forms.gle/abc'],
        '4기 운영 계획',
        '인스타그램 4기 모집 게시물 (2026.09.03) · D-day 게시물 (2026.09.08~09.10)',
        'https://www.instagram.com/gdg.donggukuniv/',
        '4기 Organizer 이도윤 확인 (2026.10.17): 1기 …',
        'src/content/projects.json stack',
        undefined,
        '4기 운영 계획',
      ],
      { 'gdg.community.dev': 'https://gdg.community.dev/chapter/', 'instagram.com': 'https://www.instagram.com/gdg.donggukuniv/' },
    )
    expect(items.map((it) => [it.label, it.href ?? null])).toEqual([
      ['gdg.community.dev', 'https://gdg.community.dev/chapter/'],
      ['지원서(forms.gle)', 'https://forms.gle/abc'],
      ['4기 운영 계획', null],
      ['인스타그램', 'https://www.instagram.com/gdg.donggukuniv/'],
      ['4기 Organizer 이도윤 확인', null],
    ])
  })
})

describe('기수별 기록 (시안 C 홈 기록에서 옮김)', () => {
  it('기간: 시작~끝, 지금 기수는 끝을 비우고, 모르면 빈 글자', () => {
    expect(generationPeriod({ start: '2023-09', end: '2024-07' })).toBe('2023.09~2024.07')
    expect(generationPeriod({ start: '2026-09' })).toBe('2026.09~')
    expect(generationPeriod({})).toBe('')
  })

  it('숫자 한 줄은 0 을 뺀다', () => {
    expect(tallies(244, 45, 23).map((t) => `${t.label} ${t.value}${t.unit}`)).toEqual(['그룹 멤버 244명', '지난 행사 45건', '공개 프로젝트 23개'])
    expect(tallies(undefined, 0, 3).map((t) => t.id)).toEqual(['projects'])
  })

  it('기수별 지난 행사 수 · 카드의 대표 기록 자리', () => {
    expect([...countByGeneration([ev('a', '2026-09-15', { generation: 4 }), ev('b', '2025-09-19', { generation: 3 }), ev('c', '2025-10-10', { generation: 3 }), ev('d', '2025-01-01', { generation: undefined })])]).toEqual([
      [4, 1],
      [3, 2],
    ])
    const gens = sortGenerations([...GENERATIONS].reverse())
    expect(gens.map((g) => g.n)).toEqual([1, 2, 3, 4])
    expect(highlightMentions(gens).length).toBe(gens.reduce((n, g) => n + g.highlights.length, 0))
  })

  it('실제 콘텐츠: 그룹 멤버 244명 · 지난 행사 45건 (2026.10.18 기준) · 공개 프로젝트 26개 (2026.11.04 노션 모음집 반영)', () => {
    const past = pastEvents(EVENTS, '2026-10-18')
    expect(tallies(CHAPTER.members?.value, past.length, PUBLIC_PROJECTS.length).map((t) => t.value)).toEqual([244, 45, 26])
  })
})
