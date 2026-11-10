import { describe, expect, it } from 'vitest'
import { CHAPTER, GENERATIONS } from '@/content'
import type { Generation } from '@/domain/types'
import { nameChange, whoCards, whoSpan } from './who'

const g = (n: number, name: string, extra: Partial<Generation> = {}): Generation => ({ n, name, summary: 's', highlights: ['a', 'b'], source: ['x'], ...extra })

describe('소개 · 우리는', () => {
  it('제목 숫자: 첫 기수의 시작 연도와 지금 기수', () => {
    expect(whoSpan([g(2, 'GDGoC DGU'), g(1, 'GDSC DGU', { start: '2023-09' }), g(3, 'GDGoC DGU', { current: true })])).toEqual({ since: 2023, current: 3 })
    expect(whoSpan([g(1, 'GDSC DGU')])).toEqual({ since: null, current: 1 })
  })

  it('이름이 바뀐 기수만 짚는다', () => {
    expect(nameChange([g(1, 'GDSC DGU'), g(2, 'GDGoC DGU'), g(3, 'GDGoC DGU')])).toEqual({ before: 'GDSC DGU', after: 'GDGoC DGU', from: 2 })
    expect(nameChange([g(1, 'A'), g(2, 'A')])).toBeNull()
  })

  it('판: 확인된 G-Sprint 숫자만, 멤버 수가 없으면 판을 뺀다', () => {
    const full = whoCards({ members: { value: 244, asOf: '2026-10-16' }, sprint: { teams: 5, members: 27, verified: true }, demoDay: '12.29' })
    expect(full.map((c) => c.id)).toEqual(['sessions', 'sprint', 'joint', 'members'])
    expect(full[1]).toMatchObject({ value: '5팀 27명', sub: '한 학기 팀 프로젝트, 12.29 데모데이' })
    expect(full[3]).toMatchObject({ label: '챕터 페이지 가입자', value: '244명', sub: 'gdg.community.dev, 2026.10 기준' })
    const bare = whoCards({ sprint: { teams: 5, members: 27, verified: false } })
    expect(bare.map((c) => c.id)).toEqual(['sessions', 'sprint', 'joint'])
    expect(bare[1].value).toBe('한 학기 팀 프로젝트')
  })

  it('실제 자료: 2023년 1기부터, 1기 GDSC DGU → 2기부터 GDGoC DGU', () => {
    expect(whoSpan(GENERATIONS).since).toBe(2023)
    expect(nameChange(GENERATIONS)).toEqual({ before: 'GDSC DGU', after: 'GDGoC DGU', from: 2 })
    expect(CHAPTER.members?.value).toBeGreaterThan(0)
  })
})
