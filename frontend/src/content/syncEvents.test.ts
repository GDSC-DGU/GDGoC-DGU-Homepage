import { describe, expect, it } from 'vitest'
import type { ScheduleEvent } from '@/domain/types'
import {
  classify,
  formatEventsJson,
  guessGeneration,
  idFromUrl,
  koreanTitle,
  mapBevyEvent,
  mergeEvents,
  normUrl,
  toKstDate,
} from '../../scripts/sync-events.mjs'

/**
 * scripts/sync-events.mjs 의 변환 · 합치기 규칙 (네트워크 없이 작은 예시로 확인).
 * 예시는 gdg.community.dev event_slim 응답의 한 줄 모양을 줄인 것이다.
 */
const PAGE = 'https://gdg.community.dev/events/details/google-gdg-on-campus-dongguk-university-seoul-south-korea-presents-'

const bevy = {
  kickoff: {
    id: 1,
    title: 'GDGoC DGU G-Sprint Kickoff: Team Meetings',
    start_date: '2026-10-13T18:00:00+09:00',
    end_date: '2026-10-13T19:00:00+09:00',
    url: `${PAGE}gdgoc-dgu-g-sprint-kickoff-team-meetings/`,
    venue_name: '동국대학교 정보문화관 P301',
  },
  camping: {
    id: 2,
    title: 'GDG on Campus DGU 16th Camping Seminar',
    start_date: '2026-04-17T09:30:00Z',
    end_date: '2026-04-17T11:30:00Z',
    url: `${PAGE}gdg-on-campus-dgu-16th-camping-seminar/`,
  },
  hackathon: {
    id: 3,
    title: 'GDGoC DGU Winter Hackathon',
    start_date: '2027-01-30T10:00:00+09:00',
    end_date: '2027-01-31T18:00:00+09:00',
    url: `${PAGE}gdgoc-dgu-winter-hackathon/`,
  },
  lateNightUtc: {
    id: 4,
    title: 'GDGoC DGU Open Seminar',
    // UTC 로는 21일 밤이지만 한국 시간으로는 22일 아침
    start_date: '2026-05-21T23:30:00Z',
    url: `${PAGE}gdg-on-campus-dgu-open-seminar-2/`,
  },
}

describe('날짜 · 기수', () => {
  it('시간대를 한국 날짜로 바꾼다', () => {
    expect(toKstDate('2026-10-13T18:00:00+09:00')).toBe('2026-10-13')
    expect(toKstDate('2026-05-21T23:30:00Z')).toBe('2026-05-22')
    expect(toKstDate('2026-10-13T18:00:00')).toBe('2026-10-13')
    expect(toKstDate('2026-10-13')).toBe('2026-10-13')
    expect(toKstDate('soon')).toBeUndefined()
    expect(toKstDate(undefined)).toBeUndefined()
  })

  it('9월에 시작하는 학년으로 기수를 정한다 (2기 = 2024-09)', () => {
    expect(guessGeneration('2024-03-14')).toBe(1)
    expect(guessGeneration('2024-08-31')).toBe(1)
    expect(guessGeneration('2024-09-01')).toBe(2)
    expect(guessGeneration('2025-07-26')).toBe(2)
    expect(guessGeneration('2025-09-19')).toBe(3)
    expect(guessGeneration('2027-01-30')).toBe(4)
    expect(guessGeneration('2023-05-01')).toBeUndefined()
  })
})

describe('mapBevyEvent', () => {
  it('행사 한 줄을 ScheduleEvent 모양으로 바꾼다', () => {
    expect(mapBevyEvent(bevy.kickoff)).toEqual({
      id: 'gdgoc-dgu-g-sprint-kickoff-team-meetings',
      date: '2026-10-13',
      title: 'G-Sprint Kickoff: Team Meetings',
      originalTitle: 'GDGoC DGU G-Sprint Kickoff: Team Meetings',
      kind: 'sprint',
      place: 'projects',
      generation: 4,
      series: 'G-Sprint',
      venue: '동국대학교 정보문화관 P301',
      url: bevy.kickoff.url,
      source: bevy.kickoff.url,
    })
  })

  it('정기 세미나는 한글 제목 · 시리즈를 붙이고, 여러 날 해커톤은 endDate 와 팀원 모집 장소를 쓴다', () => {
    const camping = mapBevyEvent(bevy.camping)
    expect(camping).toMatchObject({ title: 'Camping Seminar 16회', kind: 'session', place: 'community', series: 'Camping Seminar', generation: 3 })
    const hack = mapBevyEvent(bevy.hackathon)
    expect(hack).toMatchObject({ date: '2027-01-30', endDate: '2027-01-31', kind: 'event', place: 'teams', generation: 4 })
    expect(mapBevyEvent(bevy.lateNightUtc)?.date).toBe('2026-05-22')
  })

  it('제목 · 날짜 · 주소가 없으면 버린다', () => {
    expect(mapBevyEvent({ title: 'x', url: PAGE })).toBeNull()
    expect(mapBevyEvent({ start_date: '2026-01-01', url: PAGE })).toBeNull()
    expect(mapBevyEvent(null)).toBeNull()
  })

  it('제목으로 종류를 어림한다', () => {
    expect(classify('GDGoC DGU 4th OT')).toEqual({ kind: 'recruit', place: 'recruits' })
    expect(classify('GDGoC DGU 2st DemoDay')).toEqual({ kind: 'project', place: 'projects' })
    expect(classify('Dongguk University Dev Conference 2025')).toEqual({ kind: 'event', place: 'community' })
    expect(classify('GDG on Campus DGU Robotics Talk')).toEqual({ kind: 'session', place: 'community' })
    expect(koreanTitle('GDGoC DGU 3rd OT')).toBe('3기 OT')
    expect(koreanTitle('GDG on Campus DGU 2st Part Study')).toBe('파트 스터디 2회')
    expect(idFromUrl(`${PAGE}gdgoc-dgu-3rd-ot/`)).toBe('gdgoc-dgu-3rd-ot')
    expect(normUrl(`${PAGE}x/`)).toBe(normUrl(`${PAGE.toUpperCase().replace('HTTPS', 'https')}x`))
  })
})

describe('mergeEvents', () => {
  const existing: ScheduleEvent[] = [
    // 사람이 다듬은 지난 행사 (같은 url 로 다시 들어옴)
    { id: '4th-sprint-kickoff', date: '2026-10-12', title: 'G-Sprint 킥오프 · 팀 회의', originalTitle: 'old', kind: 'sprint', place: 'projects', generation: 4, url: bevy.kickoff.url, source: bevy.kickoff.url },
    // 운영 계획에만 있던 해커톤 (같은 날 · 같은 장소로 공개됨)
    { id: '4th-dongjithon', date: '2027-01-30', endDate: '2027-01-31', title: '동지톤', venue: '동국대', kind: 'event', place: 'teams', generation: 4, source: '4기 운영 계획' },
    // 운영 계획에만 있는 휴회
    { id: '4th-rest-mid', date: '2026-10-20', title: '중간고사 휴회', kind: 'rest', place: 'community', generation: 4, source: '4기 운영 계획' },
    // 다른 챕터가 연 행사 (이번 응답에 없음)
    { id: 'joint', date: '2024-11-07', title: '홍익대 합동 세미나', kind: 'event', place: 'community', generation: 2, url: `${PAGE}gone/`, source: `${PAGE}gone/` },
  ]
  const fetched = [bevy.kickoff, bevy.camping, bevy.hackathon].map((b) => mapBevyEvent(b)!)

  it('사람이 고친 값은 지키고 날짜 · 원래 제목만 새로 받는다', () => {
    const { events, updated } = mergeEvents(existing, fetched)
    const kickoff = events.find((e) => e.url === bevy.kickoff.url)!
    expect(kickoff).toMatchObject({ id: '4th-sprint-kickoff', title: 'G-Sprint 킥오프 · 팀 회의', date: '2026-10-13', originalTitle: bevy.kickoff.title })
    expect(updated).toEqual(['4th-sprint-kickoff'])
  })

  it('운영 계획 일정이 공개되면 한 줄로 합친다 (id · 한글 제목 유지, 주소 · 출처는 공개 페이지)', () => {
    const { events, promoted } = mergeEvents(existing, fetched)
    expect(promoted).toEqual(['4th-dongjithon'])
    const jithon = events.filter((e) => e.date === '2027-01-30')
    expect(jithon).toHaveLength(1)
    expect(jithon[0]).toMatchObject({ id: '4th-dongjithon', title: '동지톤', url: bevy.hackathon.url, source: bevy.hackathon.url, endDate: '2027-01-31' })
  })

  it('새 행사는 더하고, 운영 계획 줄은 그대로 두고, 날짜순으로 정렬한다', () => {
    const { events, added } = mergeEvents(existing, fetched)
    expect(added).toEqual(['gdg-on-campus-dgu-16th-camping-seminar'])
    expect(events.map((e) => e.id)).toEqual(['joint', 'gdg-on-campus-dgu-16th-camping-seminar', '4th-sprint-kickoff', '4th-rest-mid', '4th-dongjithon'])
  })

  it('응답에 없는 공개 행사는 기본으로 남기고, --prune 이면 지운다', () => {
    expect(mergeEvents(existing, fetched).events.some((e) => e.id === 'joint')).toBe(true)
    const pruned = mergeEvents(existing, fetched, { prune: true })
    expect(pruned.removed).toEqual(['joint'])
    expect(pruned.events.some((e) => e.id === 'joint')).toBe(false)
    expect(pruned.events.some((e) => e.id === '4th-rest-mid')).toBe(true)
  })

  it('id 가 겹치면 날짜를 붙여 구분한다', () => {
    const a = { ...fetched[1] }
    const b = { ...fetched[1], date: '2026-04-24', url: `${PAGE}other/`, source: `${PAGE}other/` }
    const ids = mergeEvents([], [a, b]).events.map((e) => e.id)
    expect(new Set(ids).size).toBe(2)
  })
})

describe('formatEventsJson', () => {
  it('한 줄에 행사 하나씩 쓰고, 다시 읽으면 같은 값이다', () => {
    const doc = { note: '메모', updatedAt: '2026-10-17', events: [{ id: 'a', date: '2026-10-13', title: '가', kind: 'session', place: 'community', source: 's' }] }
    const text = formatEventsJson(doc)
    expect(JSON.parse(text)).toEqual(doc)
    expect(text).toContain('    { "id": "a", "date": "2026-10-13", "title": "가", "kind": "session", "place": "community", "source": "s" }')
  })
})
