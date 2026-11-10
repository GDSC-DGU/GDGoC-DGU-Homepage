import { describe, expect, it } from 'vitest'
import { currentSeason, seasonOf } from './season'
import { hasLeaves, treeColors, treeSolids, type Species } from './treeModel'

describe('계절 (한국 날짜)', () => {
  it.each([
    ['2026-10-30', 'autumn'],
    ['2026-11-30', 'autumn'],
    ['2026-12-01', 'winter'],
    ['2027-02-14', 'winter'],
    ['2027-04-05', 'spring'],
    ['2027-07-01', 'summer'],
    ['2027-10-19', 'summer'],
  ])('%s → %s', (d, s) => expect(seasonOf(d)).toBe(s))
  it('?season= 으로 고정', () => {
    expect(currentSeason('?season=spring', '2026-10-30')).toBe('spring')
    expect(currentSeason('?season=nope', '2026-10-30')).toBe('autumn')
  })
})

describe('나무 모양', () => {
  const all: Species[] = ['ginkgo', 'zelkova', 'pine', 'cherry']
  it('겨울에는 소나무만 잎이 있다', () => {
    expect(all.filter((s) => hasLeaves(s, 'winter'))).toEqual(['pine'])
    for (const s of all.filter((x) => x !== 'pine')) {
      const roles = treeSolids(s, 0, 0, 1, 'winter').flatMap((t) => t.faces.map((f) => f.role))
      expect(new Set(roles)).toEqual(new Set(['bark']))
    }
  })
  it('겨울 소나무 잎 층 위에는 눈', () => {
    const roles = treeSolids('pine', 0, 0, 1, 'winter').flatMap((t) => t.faces.map((f) => f.role))
    expect(roles).toContain('snow')
  })
  it('봄 벚나무는 꽃, 가을 은행은 노랑', () => {
    expect(treeSolids('cherry', 0, 0, 1, 'spring').flatMap((t) => t.faces.map((f) => f.role))).toContain('bloom')
    expect(treeColors('ginkgo', 'autumn').leaf).toBe('#f2c12e')
  })
  it('밤 색은 낮보다 어둡다', () => {
    const lum = (c: string) => parseInt(c.slice(1, 3), 16) + parseInt(c.slice(3, 5), 16) + parseInt(c.slice(5, 7), 16)
    expect(lum(treeColors('ginkgo', 'autumn', true).leaf)).toBeLessThan(lum(treeColors('ginkgo', 'autumn').leaf))
  })
  it('같은 자리면 늘 같은 모양 (다시 그려도 흔들리지 않게)', () => {
    expect(treeSolids('zelkova', 3, 4, 1, 'summer')).toEqual(treeSolids('zelkova', 3, 4, 1, 'summer'))
  })
})
