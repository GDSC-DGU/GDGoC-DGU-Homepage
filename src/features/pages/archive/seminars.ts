import type { Seminar } from '@/domain/types'

/**
 * 아카이브 '세미나' 계산 (화면과 상관없는 것만). seminars.test.ts 에 테스트.
 * - 기수 탭: 프로젝트 보기와 같은 모양으로 3기 · 2기 · 1기 ('전체' 는 없다: 4기 Organizer 2026-11-05). 처음엔 가장 최근 기수.
 * - 고른 기수의 발표를 게시판처럼 전부 나열한다 (최근 발표 먼저, 같은 날이면 제목 순). 접지 않는다.
 * - 찾기: 제목 · 발표자에 검색어가 들어 있으면 (띄어쓰기 · 대소문자 무시). 고른 기수 안에서 찾고, 없으면 다른 기수의 개수를 알려 준다.
 * - 자료: fileUrl 이 있으면 줄을 눌러 연다. 파일은 있는데(format) 주소가 아직 없으면 '준비 중' (백엔드가 R2 에 올리는 중).
 */

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

/** 기수 탭 하나 (projects/GenTabs 가 그대로 그린다) */
export interface SeminarTab {
  key: string
  label: string
  gen: number
  count: number
}

/** 'React Native' → 'reactnative' (띄어쓰기 · 대소문자 무시, 한글은 NFC 로 맞춘다) */
const norm = (s: string) => s.normalize('NFC').toLowerCase().replace(/\s+/g, '')

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

/** 기수 탭 (최근 기수 먼저) */
export const seminarTabs = (list: readonly Seminar[]): SeminarTab[] =>
  seminarGenerations(list).map((gen) => ({ key: String(gen), label: `${gen}기`, gen, count: list.filter((s) => s.generation === gen).length }))

/** 한 기수 묶음. q 를 주면 맞는 발표만 (없으면 items 가 비어 있다) */
export function seminarGroup(list: readonly Seminar[], gen: number, q = ''): SeminarGroup | null {
  const all = list.filter((s) => s.generation === gen)
  if (all.length === 0) return null
  const dates = all.map((s) => s.date).sort()
  return { generation: gen, items: all.filter((s) => matchesSeminar(s, q)).sort(byRecent), from: dates[0], to: dates[dates.length - 1], total: all.length }
}

/** 검색어에 맞는 발표 수를 기수별로 (최근 기수 먼저, 0 인 기수는 뺀다). 고른 기수에 없을 때 '2기에서 2개 보기' */
export function matchesByGeneration(list: readonly Seminar[], q: string): { gen: number; count: number }[] {
  return seminarGenerations(list)
    .map((gen) => ({ gen, count: list.filter((s) => s.generation === gen && matchesSeminar(s, q)).length }))
    .filter((x) => x.count > 0)
}

/** 홈 '멤버 세미나': 기수마다 가장 최근 발표 n개 (최근 기수 먼저, 같은 날이면 제목 순) */
export function latestByGeneration(list: readonly Seminar[], n = 3): { gen: number; items: Seminar[] }[] {
  return seminarGenerations(list).map((gen) => ({ gen, items: list.filter((s) => s.generation === gen).sort(byRecent).slice(0, n) }))
}

/** 아카이브 세미나 보기에서 그 발표를 찾아 둔 주소: '/archive?view=seminars&gen=3&q=제목#archive-views' */
export function seminarHref(talk: Pick<Seminar, 'generation' | 'title'>): string {
  const p = new URLSearchParams({ view: 'seminars', gen: String(talk.generation), q: talk.title })
  return `/archive?${p.toString()}#archive-views`
}

/** 발표한 사람 수 (같은 사람이 여러 번 해도 한 명) */
export const speakerCount = (list: readonly Seminar[]) => new Set(list.map((s) => s.speaker).filter(Boolean)).size

/** '2025.10–2026.05' (같은 달이면 하나만) */
export function periodLabel(from: string, to: string): string {
  const a = from.slice(0, 7).replace('-', '.')
  const b = to.slice(0, 7).replace('-', '.')
  return a === b ? a : `${a}–${b}`
}

/** 주소의 ?gen=2 → 2. 목록에 없는 기수 · 이상한 값 · 없으면 가장 최근 기수 */
export function parseSeminarGen(v: string | null, gens: readonly number[]): number | undefined {
  const n = Number(v)
  return v !== null && Number.isInteger(n) && gens.includes(n) ? n : gens[0]
}

/** 자료 상태: 열 수 있음 · 올리는 중(파일은 있는데 주소가 아직 없음) · 자료 없음 */
export type SeminarFileState = 'ready' | 'pending' | 'none'
export const seminarFileState = (s: Pick<Seminar, 'format' | 'fileUrl'>): SeminarFileState => (s.fileUrl ? 'ready' : s.format ? 'pending' : 'none')
