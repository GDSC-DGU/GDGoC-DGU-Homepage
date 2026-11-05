import { describe, expect, it } from 'vitest'
import { targetOf } from './searchTarget'

const EV = [
  { id: 'past', date: '2025-04-03', generation: 2 },
  { id: 'soon', date: '2026-12-01', generation: 4 },
]

describe('검색 결과 → 그 항목이 보이는 주소', () => {
  it('프로젝트 · 세미나 · 질문', () => {
    expect(targetOf({ id: 'project-yakjosim', title: '약조심', meta: '' }, '2026-11-05')).toBe('/archive?p=yakjosim')
    const sem = targetOf({ id: 'seminar-x', title: 'TestCode', meta: '2025.03.27 · 2기 · 안성우' }, '2026-11-05')!
    expect(sem).toContain('view=seminars')
    expect(sem).toContain('gen=2')
    expect(sem.endsWith('#archive-views')).toBe(true)
    expect(targetOf({ id: 'faq-who', title: '?', meta: '' }, '2026-11-05')).toBe('/recruits#faq-who')
  })
  it('행사: 다가오면 다가오는 일정, 지났으면 그 기수 기록', () => {
    expect(targetOf({ id: 'event-soon', title: '', meta: '' }, '2026-11-05', EV)).toBe('/about#upcoming')
    expect(targetOf({ id: 'event-past', title: '', meta: '' }, '2026-11-05', EV)).toBe('/about?gen=2#records')
    expect(targetOf({ id: 'event-none', title: '', meta: '' }, '2026-11-05', EV)).toBe('/about')
  })
})
