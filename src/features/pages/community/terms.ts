import { GLOSSARY, type TermId } from '@/content/glossary'
import type { ScheduleEvent } from '@/domain/types'
import type { WeekState } from './thisWeek'

/**
 * 커뮤니티 페이지의 우리끼리 말(G-Sprint · 데모데이 · 동홍동락 · Camping Seminar · Study Jam · Solution Challenge)을
 * 화면에 처음 나오는 자리에서만 한 번 풀어 쓴다 (<Term />). terms.test.ts 에 테스트.
 *
 * 일정 이름은 날짜에 따라 다른 자리에 먼저 나오므로, 화면 순서(이번 주 → 다가오는 일정 → 기수별 기록 카드 → 행사 기록)대로
 * 훑어서 용어마다 처음 나오는 자리(key)를 고른다.
 */

export const COMMUNITY_TERMS: readonly TermId[] = ['g-sprint', 'demo-day', 'dong-hong', 'camping-seminar', 'study-jam', 'solution-challenge']

/** 화면에 글자가 나오는 자리 하나. key 는 자리마다 달라야 한다 (같은 일정이 이번 주 · 시간표에 함께 나올 수 있다) */
export interface Mention {
  key: string
  text: string
}

export const mentionKey = {
  week: (e: Pick<ScheduleEvent, 'id'>) => `week:${e.id}`,
  line: (e: Pick<ScheduleEvent, 'id'>) => `line:${e.id}`,
  record: (e: Pick<ScheduleEvent, 'id'>) => `record:${e.id}`,
  /** 기수별 기록 카드의 대표 기록 한 줄 (기수 · 순번) */
  highlight: (gen: number, index: number) => `highlight:${gen}:${index}`,
  route: (gen: number | null, series: string) => `route:${gen ?? 'none'}:${series}`,
}

/** text 에 나오는 용어 (나오는 자리 순서) */
export function termsIn(text: string, ids: readonly TermId[] = COMMUNITY_TERMS): TermId[] {
  return ids
    .map((id) => ({ id, at: text.indexOf(GLOSSARY[id].term) }))
    .filter((x) => x.at >= 0)
    .sort((a, b) => a.at - b.at)
    .map((x) => x.id)
}

/** 처음 나오는 자리만 고른다: key → 그 자리에서 풀 용어. seen 은 앞 섹션에서 이미 푼 용어 */
export function firstMentions(items: readonly Mention[], seen: ReadonlySet<TermId> = new Set(), ids: readonly TermId[] = COMMUNITY_TERMS): Map<string, TermId[]> {
  const done = new Set(seen)
  const at = new Map<string, TermId[]>()
  for (const it of items) {
    const fresh = termsIn(it.text, ids).filter((id) => !done.has(id))
    if (fresh.length === 0) continue
    for (const id of fresh) done.add(id)
    at.set(it.key, [...(at.get(it.key) ?? []), ...fresh])
  }
  return at
}

/** 이미 푼 용어 모음 (firstMentions 결과 + 앞에서 푼 것) */
export const explainedTerms = (at: ReadonlyMap<string, readonly TermId[]>, seen: ReadonlySet<TermId> = new Set()): Set<TermId> =>
  new Set([...seen, ...[...at.values()].flat()])

export type TermPart = { text: string } | { id: TermId; text: string; whole: boolean; suffix?: string }

/**
 * 글자를 용어 자리에서 자른다: 'G-Sprint 중간 발표' → [{id:'g-sprint', whole:true}, {text:' 중간 발표'}].
 * 영문 낱말 중간에 걸린 용어('Gemini Study Jams' 의 Study Jam)는 whole=false: 낱말을 자르지 않고 풀이는 따로 붙인다.
 */
export function splitTerms(text: string, ids: readonly TermId[]): TermPart[] {
  const parts: TermPart[] = []
  let rest = text
  for (const id of termsIn(text, ids)) {
    const term = GLOSSARY[id].term
    const at = rest.indexOf(term)
    if (at < 0) continue
    if (at > 0) parts.push({ text: rest.slice(0, at) })
    let after = rest.slice(at + term.length)
    const whole = !/^[A-Za-z0-9]/.test(after)
    // 'Solution Challenge 2026' 처럼 이름 뒤에 붙은 해는 이름의 일부: 풀이는 해 뒤에 (이름이 갈라졌다: 문구 검토 2026-11-05)
    const year = whole ? /^ \d{4}(?!\d)/.exec(after)?.[0] : undefined
    if (year) after = after.slice(year.length)
    parts.push({ id, text: term, whole, ...(year ? { suffix: year } : {}) })
    rest = after
  }
  if (rest) parts.push({ text: rest })
  return parts
}

/** 낱말 중간에 걸려 이름 안에서 풀지 못한 용어 (이름 옆 다른 줄에 풀이를 둘 때) */
export function tailTerms(text: string, terms: readonly TermId[] | undefined): TermId[] {
  if (!terms || terms.length === 0) return []
  return splitTerms(text, terms).flatMap((p) => ('id' in p && !p.whole ? [p.id] : []))
}

/** '이번 주' 안내판이 화면에 보이는 순서대로의 일정 이름 (ThisWeek 와 같은 순서) */
export function weekMentions(week: WeekState): Mention[] {
  const { status, rest, meeting, others, next } = week
  const shown: ScheduleEvent[] = []
  if (status === 'rest' && rest) shown.push(rest)
  else if (meeting[0]) shown.push(meeting[0])
  shown.push(...meeting.slice(1), ...others)
  if (next && !others.includes(next)) shown.push(next)
  return shown.map((e) => ({ key: mentionKey.week(e), text: e.title }))
}
