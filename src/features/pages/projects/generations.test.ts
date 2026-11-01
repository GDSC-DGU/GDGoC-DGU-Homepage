import { describe, expect, it } from 'vitest'
import { PROJECTS } from '@/content'
import type { Project } from '@/domain/types'
import { generationOf, generationTabs, parseTab, tabOfProject, tabOfRoom, yearGenerations } from './generations'

const pj = (id: string, program: string, year: number, generation?: number): Project => ({ id, name: id, program, year, generation, status: 'done' })

describe('프로젝트 탭', () => {
  it('기수가 없는 프로젝트는 같은 해의 기수로, 같은 해가 없으면 가장 가까운 해의 기수로', () => {
    const years = yearGenerations([pj('a', 'X', 2024, 1), pj('b', 'X', 2025, 2), pj('c', 'X', 2025, 2)])
    expect(generationOf({ year: 2025 }, years)).toBe(2)
    expect(generationOf({ year: 2026 }, years)).toBe(2)
    expect(generationOf({ year: 2023 }, years)).toBe(1)
    expect(generationOf({ year: 2025, generation: 5 }, years)).toBe(5)
    expect(generationOf({ year: 2025 }, new Map())).toBeNull()
  })

  it('최근 기수부터, 하나뿐인 프로그램은 기수와 상관없이 맨 끝 기타 탭으로', () => {
    const tabs = generationTabs([
      pj('a1', 'Solution Challenge 2024', 2024, 1),
      pj('a2', 'Solution Challenge 2024', 2024, 1),
      pj('w1', '챕터 웹사이트', 2024, 1),
      pj('b1', 'Solution Challenge 2025', 2025, 2),
      pj('b2', 'Solution Challenge 2025', 2025, 2),
      pj('f', '봄 축제', 2025, 2),
      pj('w2', '챕터 웹사이트', 2025),
    ])
    expect(tabs.map((t) => [t.key, t.label, t.count])).toEqual([
      ['2', '2기', 2],
      ['1', '1기', 2],
      ['etc', '기타', 3],
    ])
    expect(tabs[0].rooms.map((r) => r.id)).toEqual(['solution-challenge-2025'])
    expect(tabs[2].rooms.map((r) => [r.id, r.projects.map((p) => p.id)])).toEqual([['other-projects', ['f', 'w2', 'w1']]])
    expect(tabOfRoom(tabs, 'other-projects')).toBe('etc')
    expect(tabOfProject(tabs, 'a2')).toBe('1')
    expect(parseTab('etc', tabs)).toBe('etc')
    expect(parseTab('7', tabs)).toBeUndefined()
    expect(parseTab(null, tabs)).toBeUndefined()
  })

  it('실제 지난 프로젝트: 3기 · 2기 · 1기 · 기타, 빠지는 프로젝트 없음', () => {
    const done = PROJECTS.filter((p) => p.status === 'done')
    const tabs = generationTabs(done)
    expect(tabs.map((t) => t.key)).toEqual(['3', '2', '1', 'etc'])
    expect(tabs.reduce((n, t) => n + t.count, 0)).toBe(done.length)
    for (const t of tabs) expect(t.rooms.reduce((n, r) => n + r.projects.length, 0)).toBe(t.count)
  })
})
