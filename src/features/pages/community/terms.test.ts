import { describe, expect, it } from 'vitest'
import { EVENTS, GENERATIONS } from '@/content'
import type { ScheduleEvent } from '@/domain/types'
import { COMMUNITY_TERMS, explainedTerms, firstMentions, splitTerms, tailTerms, termsIn, weekMentions } from './terms'
import { weekState } from './thisWeek'

const ev = (id: string, date: string, title: string, extra: Partial<ScheduleEvent> = {}): ScheduleEvent => ({ id, date, title, kind: 'session', place: 'community', ...extra })

describe('용어 찾기', () => {
  it('글자에 나오는 용어를 나오는 순서대로', () => {
    expect(termsIn('G-Sprint 데모데이 · 성과공유회')).toEqual(['g-sprint', 'demo-day'])
    expect(termsIn('동홍동락 1차')).toEqual(['dong-hong'])
    expect(termsIn('Winter Gemini Study Jams')).toEqual(['study-jam'])
    expect(termsIn('MT')).toEqual([])
  })

  it('처음 나오는 자리에서만 풀고, 앞에서 푼 용어는 건너뛴다', () => {
    const at = firstMentions([
      { key: 'a', text: 'G-Sprint 중간 발표' },
      { key: 'b', text: '동홍동락 1차' },
      { key: 'c', text: '동홍동락 2차' },
      { key: 'd', text: 'G-Sprint 데모데이 · 성과공유회' },
    ])
    expect([...at.entries()]).toEqual([
      ['a', ['g-sprint']],
      ['b', ['dong-hong']],
      ['d', ['demo-day']],
    ])
    const later = firstMentions([{ key: 'e', text: 'G-Sprint 킥오프' }, { key: 'f', text: 'Camping Seminar' }], explainedTerms(at))
    expect([...later.entries()]).toEqual([['f', ['camping-seminar']]])
  })

  it('낱말 중간에 걸린 용어는 자르지 않고 따로 푼다', () => {
    expect(splitTerms('G-Sprint 중간 발표', ['g-sprint'])).toEqual([{ id: 'g-sprint', text: 'G-Sprint', whole: true }, { text: ' 중간 발표' }])
    expect(splitTerms('Winter Gemini Study Jams', ['study-jam'])).toEqual([{ text: 'Winter Gemini ' }, { id: 'study-jam', text: 'Study Jam', whole: false }, { text: 's' }])
    // 이름 뒤 해는 이름과 한 덩어리: 'Solution Challenge 2026(풀이)'
    expect(splitTerms('Solution Challenge 2026 프로젝트 6개', ['solution-challenge'])).toEqual([{ id: 'solution-challenge', text: 'Solution Challenge', whole: true, suffix: ' 2026' }, { text: ' 프로젝트 6개' }])
    expect(tailTerms('Winter Gemini Study Jams', ['study-jam'])).toEqual(['study-jam'])
    expect(tailTerms('Camping Seminar', ['camping-seminar'])).toEqual([])
  })

  it('이번 주 안내판 순서: 휴회 → 다음 일정', () => {
    const events = [ev('rest', '2026-10-20', '중간고사 휴회', { kind: 'rest' }), ev('mid', '2026-10-27', 'G-Sprint 중간 발표', { kind: 'sprint', place: 'projects' })]
    expect(weekMentions(weekState(events, '2026-10-18')).map((m) => m.key)).toEqual(['week:rest', 'week:mid'])
  })

  it('실제 콘텐츠: 커뮤니티 페이지의 용어가 모두 일정 이름이나 기수별 기록에 있다 (풀 자리가 생긴다)', () => {
    const titles = [...EVENTS.map((e) => `${e.title} ${e.series ?? ''}`), ...GENERATIONS.flatMap((g) => g.highlights)]
    for (const id of COMMUNITY_TERMS) expect(titles.some((t) => termsIn(t).includes(id)), id).toBe(true)
  })
})
