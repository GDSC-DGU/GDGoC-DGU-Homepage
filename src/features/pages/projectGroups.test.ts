import { describe, expect, it } from 'vitest'
import type { Project } from '@/domain/types'
import { OTHER_PROGRAMS, groupProjects, programName, projectLinks, projectMeta, projectYears } from './projectGroups'

const pj = (name: string, program: string, year: number, extra: Partial<Project> = {}): Project => ({
  id: name,
  name,
  program,
  year,
  status: 'done',
  ...extra,
})

const ORG = 'https://github.com/GDSC-DGU'

describe('programName', () => {
  it('이름 안의 연도 낱말만 뗀다', () => {
    expect(programName({ program: 'Solution Challenge 2025', year: 2025 })).toBe('Solution Challenge')
    expect(programName({ program: 'Solution Challenge 2025', year: 2024 })).toBe('Solution Challenge 2025')
    expect(programName({ program: 'G-Sprint', year: 2026 })).toBe('G-Sprint')
    expect(programName({ program: '2025', year: 2025 })).toBe('2025')
    expect(programName({ program: 'Solution Challenge 2025 (APAC)', year: 2025 })).toBe('Solution Challenge (APAC)')
    expect(programName({ program: 'GDG 20255', year: 2025 })).toBe('GDG 20255')
  })
})

describe('groupProjects', () => {
  it('최근 연도부터, 이름에 연도가 있든 없든 같은 프로그램으로 묶는다', () => {
    const groups = groupProjects([
      pj('나', 'Solution Challenge 2024', 2024),
      pj('다', 'Solution Challenge 2024', 2024),
      pj('B', 'Solution Challenge 2025', 2025),
      pj('A', 'Solution Challenge', 2025),
      pj('S1', 'SDGs 프로젝트', 2026),
      pj('S2', 'SDGs 프로젝트', 2026),
    ])
    expect(groups.map((g) => `${g.program} · ${g.year}`)).toEqual(['SDGs 프로젝트 · 2026', 'Solution Challenge · 2025', 'Solution Challenge · 2024'])
    expect(groups[1].projects.map((p) => p.name)).toEqual(['A', 'B'])
  })

  it('하나뿐인 묶음은 해와 상관없이 맨 뒤 한 묶음으로 모은다 (최근 연도 → 이름순)', () => {
    const groups = groupProjects([
      pj('축제', '동국대 봄 축제', 2025),
      pj('사이트', '챕터 웹사이트', 2025),
      pj('X', 'Solution Challenge 2025', 2025),
      pj('Y', 'Solution Challenge 2025', 2025),
      pj('옛 사이트', '챕터 웹사이트', 2024),
    ])
    expect(groups.map((g) => `${g.program} · ${g.year} · ${g.projects.length}`)).toEqual(['Solution Challenge · 2025 · 2', `${OTHER_PROGRAMS} · null · 3`])
    expect(groups[1].projects.map((p) => p.name)).toEqual(['사이트', '축제', '옛 사이트'])
  })

  it('하나뿐인 것이 없으면 그 밖의 묶음도 없다', () => {
    const groups = groupProjects([pj('a', 'A', 2025), pj('b', 'A', 2025)])
    expect(groups.map((g) => g.program)).toEqual(['A'])
  })

  it('같은 해에는 큰 묶음부터', () => {
    const groups = groupProjects([pj('a', 'B 프로그램', 2025), pj('b', 'B 프로그램', 2025), pj('c', 'A 프로그램', 2025), pj('d', 'A 프로그램', 2025), pj('e', 'A 프로그램', 2025)])
    expect(groups.map((g) => g.program)).toEqual(['A 프로그램', 'B 프로그램'])
  })

  it('빈 목록', () => {
    expect(groupProjects([])).toEqual([])
    expect(projectYears([])).toEqual([])
  })

  it('연도 목록은 겹치지 않게 최근부터', () => {
    expect(projectYears([pj('a', 'A', 2024), pj('b', 'A', 2026), pj('c', 'B', 2026)])).toEqual([2026, 2024])
  })
})

describe('한 줄 정보', () => {
  it('기수 · 프로그램 연도 · 기술', () => {
    expect(projectMeta({ program: 'Solution Challenge 2025', year: 2025, generation: 3, stack: ['Flutter', 'Firebase'] })).toBe('3기, Solution Challenge 2025, Flutter, Firebase')
    expect(projectMeta({ program: 'G-Sprint', year: 2026 })).toBe('G-Sprint 2026')
    expect(projectMeta({ program: 'Solution Challenge 2025 (APAC)', year: 2025, generation: 2 })).toBe('2기, Solution Challenge 2025 (APAC)')
  })

  it('묶음 제목이 프로그램을 말하면 기수 · 기술만 (연도는 한 번만)', () => {
    expect(projectMeta({ program: 'Solution Challenge 2025', year: 2025, generation: 2, stack: ['Kotlin', ''] }, false)).toBe('2기, Kotlin')
    expect(projectMeta({ program: 'SDGs Project', year: 2026 }, false)).toBe('')
  })
})

describe('링크', () => {
  const inOrg = (p: Pick<Project, 'repo'>) => Boolean(p.repo?.startsWith(`${ORG}/`))

  it('저장소는 공개 기준을 통과한 것만 건다', () => {
    expect(projectLinks({ repo: `${ORG}/2024-SolutionChallenge-Wave` }, inOrg)).toEqual({ repo: `${ORG}/2024-SolutionChallenge-Wave`, url: undefined, primary: `${ORG}/2024-SolutionChallenge-Wave` })
    expect(projectLinks({ repo: 'https://github.com/someone/gdghomepage' }, inOrg)).toEqual({ repo: undefined, url: undefined, primary: undefined })
    expect(projectLinks({}, inOrg)).toEqual({ repo: undefined, url: undefined, primary: undefined })
  })

  it('이름은 서비스가 있으면 서비스, 없으면 저장소로 간다', () => {
    expect(projectLinks({ url: 'https://a.app', repo: `${ORG}/a` }, inOrg).primary).toBe('https://a.app')
    expect(projectLinks({ url: 'https://a.app', repo: 'https://github.com/someone/a' }, inOrg)).toEqual({ repo: undefined, url: 'https://a.app', primary: 'https://a.app' })
  })
})
