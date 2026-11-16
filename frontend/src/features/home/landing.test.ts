import { describe, expect, it } from 'vitest'
import { PHOTOS, PUBLIC_PROJECTS } from '@/content'
import { HOME_ACTIVITIES, HOME_SLIDES } from '@/content/home'
import type { Project, ScheduleEvent } from '@/domain/types'
import { nextHighlight, railProjects, recruitSlideText } from './landing'

const ev = (id: string, date: string, kind: ScheduleEvent['kind'], extra: Partial<ScheduleEvent> = {}): ScheduleEvent => ({ id, date, title: id, kind, place: 'community', ...extra })

describe('홈 다음 행사 슬라이드', () => {
  it('오늘 이후 G-Sprint · 행사 중 가장 가까운 것 (세션 · 휴회는 뺀다)', () => {
    const list = [ev('세션', '2026-11-18', 'session'), ev('휴회', '2026-11-19', 'rest'), ev('MT', '2026-12-15', 'event'), ev('중간 발표', '2026-11-17', 'sprint'), ev('지난 행사', '2026-11-01', 'event')]
    expect(nextHighlight(list, '2026-11-16')?.title).toBe('중간 발표')
  })
  it('이미 시작한 여러 날 일정은 넣지 않는다 (오늘 시작은 넣는다)', () => {
    const list = [ev('개발 기간', '2026-11-03', 'sprint', { endDate: '2026-11-29' }), ev('오늘 행사', '2026-11-16', 'event')]
    expect(nextHighlight(list, '2026-11-16')?.title).toBe('오늘 행사')
  })
  it('없으면 undefined', () => {
    expect(nextHighlight([ev('세션', '2026-11-18', 'session')], '2026-11-16')).toBeUndefined()
  })
})

describe('홈 모집 슬라이드', () => {
  it('일정이 없으면 정해지면 알린다', () => {
    expect(recruitSlideText({ state: 'unscheduled', generation: 5 })).toEqual({ title: '5기 모집', body: HOME_SLIDES.recruit.body.unscheduled })
  })
  it('모집 중이면 마감일을 점 날짜로', () => {
    expect(recruitSlideText({ state: 'open', generation: 5, deadline: '2027-08-31' })).toEqual({ title: '5기 지원을 받고 있습니다', body: '2027.08.31까지 지원을 받습니다.' })
  })
  it('열릴 날짜가 비면 날짜를 지어내지 않는다', () => {
    expect(recruitSlideText({ state: 'soon', generation: 5 }).body).toBe(HOME_SLIDES.recruit.body.unscheduled)
  })
})

describe('홈 팀 프로젝트 줄', () => {
  const p = (id: string, year: number, extra: Partial<Project> = {}): Project => ({ id, name: id, program: 'G-Sprint', year, status: 'done', ...extra })
  it('완성 프로젝트만, 최근 것부터, limit 개', () => {
    const out = railProjects([p('a', 2023), p('b', 2025), p('c', 2024, { status: 'in-progress' }), p('d', 2024)], 2)
    expect(out.map((x) => x.id)).toEqual(['b', 'd'])
  })
  it('저장소 자료로 12개를 채운다', () => {
    expect(railProjects(PUBLIC_PROJECTS, 12)).toHaveLength(Math.min(12, PUBLIC_PROJECTS.filter((x) => x.status === 'done').length))
  })
})

describe('홈 사진', () => {
  it('슬라이드 · 카드가 고른 사진은 모두 photos.json 에 있다 (공개 동의가 기록된 사진만)', () => {
    const ids = new Set(PHOTOS.map((x) => x.id))
    const used = [HOME_SLIDES.community.photo, HOME_SLIDES.next.photo, HOME_SLIDES.recruit.photo, ...HOME_ACTIVITIES.cards.flatMap((c): string[] => ('photo' in c && c.photo ? [c.photo] : []))]
    for (const id of used) expect(ids.has(id), id).toBe(true)
  })
  it('한 사진을 두 번 쓰지 않는다', () => {
    const used = [HOME_SLIDES.community.photo, HOME_SLIDES.next.photo, HOME_SLIDES.recruit.photo, ...HOME_ACTIVITIES.cards.flatMap((c): string[] => ('photo' in c && c.photo ? [c.photo] : []))]
    expect(new Set(used).size).toBe(used.length)
  })
})
