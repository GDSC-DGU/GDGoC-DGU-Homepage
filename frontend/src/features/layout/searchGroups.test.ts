import { describe, expect, it } from 'vitest'
import type { PlaceId, SearchHit } from '@/domain/types'
import { countByPlace, groupHits } from './searchGroups'

const hit = (id: string, place: PlaceId, score: number): SearchHit => ({ doc: { id, place, title: id, meta: '', keywords: '' }, score })

describe('검색 결과 묶기', () => {
  it('가장 잘 맞는 결과의 장소부터, 묶음 안은 점수 순서', () => {
    const groups = groupHits([hit('a', 'projects', 4), hit('b', 'community', 3), hit('c', 'projects', 2)])
    expect(groups.map((g) => g.place)).toEqual(['projects', 'community'])
    expect(groups[0].hits.map((h) => h.doc.id)).toEqual(['a', 'c'])
  })

  it('전체 · 장소별 개수를 자르고 남은 건수를 센다', () => {
    const many = Array.from({ length: 64 }, (_, i) => hit(`e${i}`, i % 2 ? 'community' : 'projects', 1))
    const groups = groupHits(many, { total: 8, perPlace: 3 })
    expect(groups.reduce((n, g) => n + g.hits.length, 0)).toBe(6)
    expect(groups.reduce((n, g) => n + g.hits.length + g.more, 0)).toBe(64)
  })

  it('결과가 없으면 빈 목록', () => {
    expect(groupHits([])).toEqual([])
  })

  it('장소별 건수', () => {
    expect(countByPlace([hit('a', 'projects', 1), hit('b', 'projects', 1), hit('c', 'about', 1)])).toEqual({ projects: 2, about: 1 })
  })
})
