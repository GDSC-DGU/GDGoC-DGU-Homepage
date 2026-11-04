import type { Seminar } from '@/domain/types'

/**
 * 아카이브 '세미나' 계산 (화면과 상관없는 것만). seminars.test.ts 에 테스트.
 * - 기수별 묶음: 최근 기수 먼저, 묶음 안은 최근 발표 먼저 (같은 날이면 제목 순)
 * - 찾기: 제목 · 발표자에 검색어가 들어 있으면 (띄어쓰기 · 대소문자 무시)
 * - 접기: '전체'를 보고 검색어가 없을 때만 기수마다 처음 PREVIEW_COUNT 개 (4기 회의: 대표 몇 개만 보이고 나머지는 더 보기)
 */
export const PREVIEW_COUNT = 6

export interface SeminarGroup {
  generation: number
  /** 이 묶음의 발표 (보기 조건에 맞는 것만, 최근 먼저) */
  items: Seminar[]
  /** 이 기수의 첫 발표 · 마지막 발표 날 (거르기 전 전체 기준) */
  from: string
  to: string
  /** 이 기수 전체 발표 수 (거르기 전) */
  total: number
}

/** 'React Native' → 'reactnative' (띄어쓰기 · 대소문자 무시) */
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '')

export function matchesSeminar(s: Pick<Seminar, 'title' | 'speaker'>, q: string): boolean {
  const key = norm(q)
  if (!key) return true
  return norm(s.title).includes(key) || norm(s.speaker).includes(key)
}

const byRecent = (a: Seminar, b: Seminar) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title, 'ko')

/** 기수 목록 (최근 먼저) */
export function seminarGenerations(list: readonly Seminar[]): number[] {
  return [...new Set(list.map((s) => s.generation))].sort((a, b) => b - a)
}

/**
 * 기수별 묶음. gen 을 주면 그 기수만, q 를 주면 맞는 발표만 (맞는 게 없는 기수는 뺀다).
 */
export function seminarGroups(list: readonly Seminar[], { gen, q = '' }: { gen?: number; q?: string } = {}): SeminarGroup[] {
  return seminarGenerations(list)
    .filter((g) => gen === undefined || g === gen)
    .map((g) => {
      const all = list.filter((s) => s.generation === g)
      const dates = all.map((s) => s.date).sort()
      return { generation: g, items: all.filter((s) => matchesSeminar(s, q)).sort(byRecent), from: dates[0], to: dates[dates.length - 1], total: all.length }
    })
    .filter((group) => group.items.length > 0)
}

/** 접어서 보일 개수: 접을 때만 PREVIEW_COUNT, 아니면 전부 */
export const visibleCount = (group: SeminarGroup, collapse: boolean) => (collapse ? Math.min(PREVIEW_COUNT, group.items.length) : group.items.length)

/** 발표한 사람 수 (같은 사람이 여러 번 해도 한 명) */
export const speakerCount = (list: readonly Seminar[]) => new Set(list.map((s) => s.speaker).filter(Boolean)).size

/** '2025.10 – 2026.05' (같은 달이면 하나만) */
export function periodLabel(from: string, to: string): string {
  const a = from.slice(0, 7).replace('-', '.')
  const b = to.slice(0, 7).replace('-', '.')
  return a === b ? a : `${a} – ${b}`
}

/** 주소의 ?gen=2 → 2. 목록에 없는 기수 · 이상한 값은 '전체'(undefined) */
export function parseSeminarGen(v: string | null, gens: readonly number[]): number | undefined {
  const n = Number(v)
  return Number.isInteger(n) && gens.includes(n) ? n : undefined
}
