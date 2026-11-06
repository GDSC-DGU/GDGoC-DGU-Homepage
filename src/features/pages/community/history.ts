import type { Generation, ScheduleEvent } from '@/domain/types'
import { dotMonth } from '../format'
import { mentionKey } from './terms'

/**
 * 커뮤니티 '기수별 기록' 계산 (카드 · 숫자 한 줄). community.test.ts 에 테스트.
 */

export interface Tally {
  id: 'members' | 'events' | 'projects'
  label: string
  value: number
  unit: string
}

/** '2023.09~2024.07' · 지금 기수는 '2026.09~' · 기간을 모르면 빈 글자 (화면에서 숨김) */
export function generationPeriod(g: Pick<Generation, 'start' | 'end'>): string {
  if (!g.start && !g.end) return ''
  return `${g.start ? dotMonth(g.start) : ''}~${g.end ? dotMonth(g.end) : ''}`
}

/** 숫자 한 줄: 0 이면 뺀다 */
export function tallies(members: number | undefined, pastEvents: number, publicProjects: number): Tally[] {
  const list: Tally[] = []
  if (members) list.push({ id: 'members', label: '그룹 멤버', value: members, unit: '명' })
  if (pastEvents > 0) list.push({ id: 'events', label: '지난 행사', value: pastEvents, unit: '건' })
  if (publicProjects > 0) list.push({ id: 'projects', label: '공개 프로젝트', value: publicProjects, unit: '개' })
  return list
}

/** 카드 안 대표 기록 이름 (화면 순서). terms.ts 의 firstMentions 에 넘겨 처음 나오는 용어만 풀어 쓴다 */
export const highlightMentions = (gens: readonly Generation[]) =>
  gens.flatMap((g) => g.highlights.map((text, i) => ({ key: mentionKey.highlight(g.n, i), text })))

/** 기수 → 지난 행사 수 */
export function countByGeneration(past: readonly Pick<ScheduleEvent, 'generation'>[]): Map<number, number> {
  const m = new Map<number, number>()
  for (const e of past) if (e.generation != null) m.set(e.generation, (m.get(e.generation) ?? 0) + 1)
  return m
}

/** 연혁은 오래된 기수부터 */
export const sortGenerations = (gens: readonly Generation[]) => [...gens].sort((a, b) => a.n - b.n)
