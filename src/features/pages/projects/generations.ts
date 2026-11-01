import type { Project } from '@/domain/types'
import { groupProjects, OTHER_PROGRAMS } from '../projectGroups'
import { toRooms, type Room } from './exhibit'

/**
 * 프로젝트 페이지의 탭: 기수마다 하나(3기 · 2기 · 1기) + 맨 끝 '기타'.
 * - 기수 탭: 그 기수의 전시실(프로그램 · 연도 묶음, 지금은 해마다 Solution Challenge 하나).
 * - 기타: 프로젝트가 하나뿐인 프로그램(챕터 웹사이트 · 봄 축제 웹사이트)을 기수와 상관없이 모은다.
 * 기수가 적히지 않은 프로젝트가 여러 개인 프로그램에 들면 같은 해에 가장 많이 나온 기수로 넣는다.
 * generations.test.ts 에 테스트.
 */

export interface GenTab {
  /** 주소 ?gen= 값 · 탭 id 에 쓰는 이름: '3' · '2' · '1' · 'etc' */
  key: string
  /** 탭 글자: '3기' · '기타' */
  label: string
  /** 기수 탭이면 기수, 기타면 null */
  gen: number | null
  rooms: Room[]
  /** 이 탭의 프로젝트 수 */
  count: number
}

export const OTHER_TAB_KEY = 'etc'
export const OTHER_TAB_LABEL = '기타'

/** 해 → 기수: 기수가 적힌 프로젝트에서 그 해에 가장 많이 나온 기수 */
export function yearGenerations(projects: readonly Project[]): Map<number, number> {
  const counts = new Map<number, Map<number, number>>()
  for (const p of projects) {
    if (typeof p.generation !== 'number') continue
    const byGen = counts.get(p.year) ?? new Map<number, number>()
    byGen.set(p.generation, (byGen.get(p.generation) ?? 0) + 1)
    counts.set(p.year, byGen)
  }
  const out = new Map<number, number>()
  for (const [year, byGen] of counts) {
    const [gen] = [...byGen].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]
    out.set(year, gen)
  }
  return out
}

/** 프로젝트의 기수: 적힌 기수 → 같은 해의 기수 → 가장 가까운 해의 기수. 하나도 없으면 null */
export function generationOf(p: Pick<Project, 'generation' | 'year'>, years: ReadonlyMap<number, number>): number | null {
  if (typeof p.generation === 'number') return p.generation
  const same = years.get(p.year)
  if (same !== undefined) return same
  let best: { d: number; gen: number } | null = null
  for (const [year, gen] of years) {
    const d = Math.abs(year - p.year)
    if (!best || d < best.d || (d === best.d && gen > best.gen)) best = { d, gen }
  }
  return best?.gen ?? null
}

/** 탭: 최근 기수부터, 맨 끝에 기타 (기타에 들 프로젝트가 있을 때만) */
export function generationTabs(projects: readonly Project[]): GenTab[] {
  const groups = groupProjects(projects)
  const other = groups.find((g) => g.program === OTHER_PROGRAMS)
  const inOther = new Set(other?.projects ?? [])
  const rest = projects.filter((p) => !inOther.has(p))
  const years = yearGenerations(rest)
  const byGen = new Map<number, Project[]>()
  const unplaced: Project[] = []
  for (const p of rest) {
    const gen = generationOf(p, years)
    if (gen === null) unplaced.push(p)
    else byGen.set(gen, [...(byGen.get(gen) ?? []), p])
  }
  const tabs: GenTab[] = [...byGen]
    .sort((a, b) => b[0] - a[0])
    .map(([gen, list]) => ({ key: String(gen), label: `${gen}기`, gen, count: list.length, rooms: toRooms(groupProjects(list)) }))
  const etc = [...inOther, ...unplaced]
  if (etc.length > 0) {
    // 기타 탭은 프로그램이 섞인 방 하나 ('그 밖의 프로젝트', 카드마다 연도 · 프로그램)
    const rooms = toRooms([{ key: 'other', program: OTHER_PROGRAMS, year: null, projects: other ? [...other.projects, ...unplaced] : unplaced }])
    tabs.push({ key: OTHER_TAB_KEY, label: OTHER_TAB_LABEL, gen: null, count: etc.length, rooms })
  }
  return tabs
}

/** 방 id 가 든 탭 (홈에서 '/projects#solution-challenge-2024' 로 들어올 때) */
export function tabOfRoom(tabs: readonly GenTab[], roomId: string): string | undefined {
  return tabs.find((t) => t.rooms.some((r) => r.id === roomId))?.key
}

/** 프로젝트가 든 탭 (자세히 보기 창 주소 '?p=' 로 들어올 때) */
export function tabOfProject(tabs: readonly GenTab[], projectId: string): string | undefined {
  return tabs.find((t) => t.rooms.some((r) => r.projects.some((p) => p.id === projectId)))?.key
}

/** 주소의 '?gen=2' · '?gen=etc' → 있는 탭이면 그 이름 */
export function parseTab(value: string | null, tabs: readonly GenTab[]): string | undefined {
  if (!value) return undefined
  return tabs.some((t) => t.key === value) ? value : undefined
}

export const GEN_PARAM = 'gen'

/** 탭 버튼 id (탭 패널의 aria-labelledby) */
export const genTabId = (key: string) => `gen-tab-${key}`
