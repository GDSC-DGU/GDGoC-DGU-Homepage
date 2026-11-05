import type { Generation, ScheduleEvent } from '@/domain/types'
import type { Period } from '@/lib/rail'
import { halfYearOf } from '@/lib/rail'

/**
 * 지원 안내 계산: 기수별 모집 목록 · '들어오면 이런 한 해' 의 달별 묶음 · 봄 학기(지난 기수) 한 줄. recruits.test.ts 에 테스트.
 */

export interface RecruitStep {
  id: string
  label: string
  start: string
  end?: string
  note?: string
  source?: string
}

export interface RecruitingData {
  /** 모집 중인지는 여기서 보지 않는다 (content/recruitingStatus.ts 가 날짜로 정한다) */
  current: { generation: number }
  history: readonly { generation: number; steps: readonly RecruitStep[] }[]
}

export type BatchStatus = 'open' | 'upcoming' | 'closed' | 'record'

export interface Batch {
  generation: number
  status: BatchStatus
  /** 첫 날 (모집 시작 또는 첫 공개 기록). 정해지지 않았으면 비움 */
  start?: string
  /** 마지막 날 */
  end?: string
  /** 모집 단계 (recruiting.json history) */
  steps: RecruitStep[]
  /** 모집 단계 기록이 없는 기수의 공개 행사 (OT 등, events.json 의 recruit 종류) */
  records: ScheduleEvent[]
}

/**
 * 기수별 모집 목록 (새 기수부터).
 * - 지금 모집할 기수: open 이면 open, 아니면 upcoming('아직 열리지 않음'). open 은 recruitStatus().state === 'open'
 * - 모집 단계 기록이 있는 기수: closed
 * - 그보다 앞선 기수는 공개 기록(OT)이 있을 때만 record. 기록이 없는 기수(1기)는 넣지 않는다
 */
export function buildBatches(data: RecruitingData, events: readonly ScheduleEvent[], open = false): Batch[] {
  const out: Batch[] = [{ generation: data.current.generation, status: open ? 'open' : 'upcoming', steps: [], records: [] }]
  const history = [...data.history].filter((h) => h.steps.length > 0 && h.generation !== data.current.generation).sort((a, b) => b.generation - a.generation)
  for (const h of history) {
    const steps = [...h.steps].sort((a, b) => a.start.localeCompare(b.start))
    const ends = steps.map((s) => s.end ?? s.start).sort()
    out.push({ generation: h.generation, status: 'closed', start: steps[0].start, end: ends[ends.length - 1], steps, records: [] })
  }
  const oldest = history.length > 0 ? history[history.length - 1].generation : data.current.generation
  const byGen = new Map<number, ScheduleEvent[]>()
  for (const e of events) {
    if (e.kind !== 'recruit' || e.generation == null || e.generation >= oldest) continue
    byGen.set(e.generation, [...(byGen.get(e.generation) ?? []), e])
  }
  for (const [generation, list] of [...byGen.entries()].sort((a, b) => b[0] - a[0])) {
    const records = [...list].sort((a, b) => a.date.localeCompare(b.date))
    out.push({ generation, status: 'record', start: records[0].date, end: records[records.length - 1].date, steps: [], records })
  }
  return out
}

/** 그 기수 일정이 있는 첫 반년 (4기: 2026.09–2027.02). 일정이 없으면 null */
export function firstHalfYear(events: readonly ScheduleEvent[], generation: number): Period | null {
  const first = events.filter((e) => e.generation === generation).sort((a, b) => a.date.localeCompare(b.date))[0]
  return first ? halfYearOf(first.date) : null
}

export interface MonthGroup {
  /** 'YYYY-MM' */
  ym: string
  month: number
  events: ScheduleEvent[]
}

/** 기간 안 일정을 달별로 (일정이 없는 달은 뺀다). 휴회도 넣는다: '언제 쉬는지' 도 한 학기의 모습이다 */
export function monthsOf(events: readonly ScheduleEvent[], period: Period): MonthGroup[] {
  const map = new Map<string, ScheduleEvent[]>()
  for (const e of [...events].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, 'ko'))) {
    if (e.date < period.start || e.date > period.end) continue
    const ym = e.date.slice(0, 7)
    map.set(ym, [...(map.get(ym) ?? []), e])
  }
  return [...map.entries()].map(([ym, list]) => ({ ym, month: +ym.slice(5, 7), events: list }))
}

/**
 * 달마다 붙이는 짧은 이름 (9월 시작 한 해의 흐름). 그 달에 일정이 있을 때만 보인다.
 * 4기 운영 계획 · G-Sprint 일정(킥오프 10월 · 데모데이 12월)과 기수 기간(9월–다음 해 7월)에서 온 흐름이다.
 */
export const MONTH_CAPTION: Readonly<Record<number, string>> = {
  9: '첫 만남',
  10: '팀 꾸리기',
  11: '팀별 개발',
  12: '데모데이',
  1: '겨울 활동',
  2: '겨울 활동',
}

export interface SpringItem {
  /** '3–4월' */
  when: string
  /** 'Camping Seminar 6회', 'Open Seminar' */
  names: string[]
}

const monthWord = (a: number, b: number) => (a === b ? `${a}월` : `${a}–${b}월`)

/**
 * 봄 학기 한 줄: 지금 기수의 봄 일정이 아직 없을 때, 바로 앞 기수가 3–7월에 연 공개 행사를 시리즈별로 접는다.
 * 'Camping Seminar 10–15회' 여섯 줄 → '3–4월 Camping Seminar 6회'. 같은 달 묶음은 한 칸으로 ('5월 Alumni Seminar · Open Seminar').
 * 앞 기수의 끝 달(generations.json end)이 있으면 '7월 기수 마무리' 를 붙인다. 지금 기수의 봄 일정이 있으면 null.
 */
export function springOf(events: readonly ScheduleEvent[], generations: readonly Pick<Generation, 'n' | 'end'>[], generation: number): { generation: number; items: SpringItem[] } | null {
  const isSpring = (e: ScheduleEvent) => {
    const m = +e.date.slice(5, 7)
    return m >= 3 && m <= 7
  }
  if (events.some((e) => e.generation === generation && isSpring(e) && e.kind !== 'rest')) return null
  const prev = generation - 1
  const list = events.filter((e) => e.generation === prev && isSpring(e) && e.kind !== 'rest' && Boolean(e.url)).sort((a, b) => a.date.localeCompare(b.date))
  if (list.length === 0) return null
  const bySeries = new Map<string, ScheduleEvent[]>()
  for (const e of list) {
    const key = e.series ?? e.title
    bySeries.set(key, [...(bySeries.get(key) ?? []), e])
  }
  const runs = [...bySeries.entries()].map(([name, run]) => ({
    when: monthWord(+run[0].date.slice(5, 7), +run[run.length - 1].date.slice(5, 7)),
    name: run.length > 1 ? `${name} ${run.length}회` : name,
  }))
  const items: SpringItem[] = []
  for (const r of runs) {
    const same = items.find((it) => it.when === r.when)
    if (same) same.names.push(r.name)
    else items.push({ when: r.when, names: [r.name] })
  }
  const end = generations.find((g) => g.n === prev)?.end
  if (end) items.push({ when: `${+end.slice(5, 7)}월`, names: ['기수 마무리'] })
  return { generation: prev, items }
}
