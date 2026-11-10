import type { Project } from '@/domain/types'

/**
 * 프로젝트 페이지 계산: 프로그램 · 연도별 묶기, 연도 거르기, 한 줄 정보, 걸 링크.
 * projectGroups.test.ts 에 테스트.
 */

/**
 * 묶음 제목용 프로그램 이름: 이름 안의 연도는 뗀다 (제목 옆에 연도를 따로 쓰므로).
 * 'Solution Challenge 2025' → 'Solution Challenge', 'Solution Challenge 2025 (APAC)' → 'Solution Challenge (APAC)'
 */
export function programName(p: Pick<Project, 'program' | 'year'>): string {
  const name = p.program
    .replace(new RegExp(`(^|\\s)${p.year}(?=\\s|$)`), ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return name || p.program
}

/** 프로젝트가 하나뿐인 프로그램은 모두 이 이름으로 모은다 */
export const OTHER_PROGRAMS = '그 밖의 프로젝트'

export interface ProjectGroup {
  key: string
  program: string
  /** '그 밖의 프로젝트' 는 여러 해가 섞이므로 null. 이때 연도는 카드마다 적는다 */
  year: number | null
  projects: Project[]
}

const byName = (a: Project, b: Project) => a.name.localeCompare(b.name, 'ko')

/**
 * 프로그램 · 연도별 묶음. 최근 연도부터, 같은 해는 큰 묶음부터, 묶음 안은 이름순.
 * 프로젝트가 하나뿐인 묶음은 맨 뒤 '그 밖의 프로젝트' 하나로 모아 (최근 연도 → 이름순)
 * 제목 하나에 카드 한 장인 줄이 생기지 않게 한다.
 */
export function groupProjects(projects: readonly Project[]): ProjectGroup[] {
  const map = new Map<string, ProjectGroup>()
  for (const p of projects) {
    const program = programName(p)
    const key = `${p.year}-${program}`
    const group = map.get(key) ?? { key, program, year: p.year, projects: [] }
    group.projects.push(p)
    map.set(key, group)
  }
  const all = [...map.values()]
  const many = all.filter((g) => g.projects.length > 1)
  const singles = all.filter((g) => g.projects.length === 1).flatMap((g) => g.projects)
  many.sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || b.projects.length - a.projects.length || a.program.localeCompare(b.program, 'ko'))
  for (const g of many) g.projects.sort(byName)
  if (singles.length === 0) return many
  singles.sort((a, b) => b.year - a.year || byName(a, b))
  return [...many, { key: 'other', program: OTHER_PROGRAMS, year: null, projects: singles }]
}

export const projectYears = (projects: readonly Project[]): number[] => [...new Set(projects.map((p) => p.year))].sort((a, b) => b - a)

/**
 * 카드 한 줄 정보: '3기 · Solution Challenge 2025 · Flutter · Firebase'.
 * 묶음 제목이 이미 프로그램과 연도를 말하면(withProgram=false) 기수 · 기술만 쓴다. 연도는 한 번만 보이게.
 */
export function projectMetaParts(p: Pick<Project, 'program' | 'year' | 'generation' | 'stack'>, withProgram = true): string[] {
  const program = p.program.includes(String(p.year)) ? p.program : `${p.program} ${p.year}`
  const stack = p.stack?.filter(Boolean) ?? []
  return [p.generation ? `${p.generation}기` : null, withProgram ? program : null, ...stack].filter((x): x is string => Boolean(x))
}

export const projectMeta = (p: Pick<Project, 'program' | 'year' | 'generation' | 'stack'>, withProgram = true): string => projectMetaParts(p, withProgram).join(', ')

export interface ProjectLinks {
  /** 걸어도 되는 저장소 (공개 기준을 통과한 것만. 개인 저장소는 걸지 않는다) */
  repo?: string
  url?: string
  /** 이름을 눌렀을 때 갈 곳: 서비스가 있으면 서비스, 없으면 저장소 */
  primary?: string
}

/** isPublicRepo: 저장소가 공개 기준(챕터 GitHub 조직)에 드는지. src/content 의 isPublicProject */
export function projectLinks(p: Pick<Project, 'url' | 'repo'>, isPublicRepo: (p: Pick<Project, 'repo'>) => boolean): ProjectLinks {
  const repo = p.repo && isPublicRepo(p) ? p.repo : undefined
  return { repo, url: p.url, primary: p.url ?? repo }
}
