import type { ScheduleEvent } from '@/domain/types'
import { dayValue, shortDate, weekday } from './date'

/**
 * 학기 레일 계산 ('지금 4기는' 섹션).
 * 날짜 ↔ 가로 위치, 주 눈금, 달 구간, 레일 기간, 겹치는 표식 · 이름 자리 잡기를 DOM 없이 계산한다.
 * 가로 위치는 0~1 비율이다. 화면 폭(px)을 곱해서 쓴다.
 */

const DAY = 86_400_000

/** 양 끝을 포함하는 날짜 구간 'YYYY-MM-DD' */
export interface Period {
  start: string
  end: string
}

const toYmd = (ms: number) => new Date(ms).toISOString().slice(0, 10)

/** 날짜 더하기 */
export const addDays = (ymd: string, n: number) => toYmd(dayValue(ymd) + n * DAY)

/** 그 달의 마지막 날 */
export const lastOfMonth = (ymd: string) => toYmd(Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7), 0))

/**
 * 한국 대학의 반년 단위: 3~8월(1학기 · 여름방학), 9~2월(2학기 · 겨울방학).
 * 기수는 학기 단위로 움직이므로 레일도 이 단위로 자른다.
 */
export function halfYearOf(ymd: string): Period {
  const y = +ymd.slice(0, 4)
  const m = +ymd.slice(5, 7)
  if (m >= 3 && m <= 8) return { start: `${y}-03-01`, end: `${y}-08-31` }
  const from = m >= 9 ? y : y - 1
  return { start: `${from}-09-01`, end: lastOfMonth(`${from + 1}-02-01`) }
}

/** 기간의 날 수 (양 끝 포함) */
export const periodDays = (p: Period) => Math.round((dayValue(p.end) - dayValue(p.start)) / DAY) + 1

/** 기간의 몇 번째 날인지 (첫날 0) */
export const dayIndex = (ymd: string, p: Period) => Math.round((dayValue(ymd) - dayValue(p.start)) / DAY)

/** 날짜 → 가로 위치 0~1. 표식이 그날 한가운데 오도록 반 칸 민다 */
export const xOf = (ymd: string, p: Period) => (dayIndex(ymd, p) + 0.5) / periodDays(p)

/** 그날이 시작하는(0시) 가로 위치 0~1. 달 경계선에 쓴다 */
export const edgeOf = (ymd: string, p: Period) => dayIndex(ymd, p) / periodDays(p)

/** 가로 위치 → 날짜. 범위를 벗어나면 양 끝 날짜 */
export function dateAt(x: number, p: Period): string {
  const n = periodDays(p)
  return addDays(p.start, Math.min(n - 1, Math.max(0, Math.floor(x * n))))
}

export const inPeriod = (ymd: string, p: Period) => ymd >= p.start && ymd <= p.end

/** 기간 안의 매주 같은 요일 (0 = 일 … 6 = 토). 기본은 화요일: 4기 정기 모임 */
export function weekTicks(p: Period, dow = 2): string[] {
  const first = addDays(p.start, (dow - new Date(dayValue(p.start)).getUTCDay() + 7) % 7)
  const out: string[] = []
  for (let d = first; d <= p.end; d = addDays(d, 7)) out.push(d)
  return out
}

export interface MonthSegment {
  /** 구간의 첫날 (기간이 달 중간에 시작하면 그날) */
  ymd: string
  year: number
  month: number
  /** 가로 위치 0~1 */
  from: number
  to: number
}

/** 달 구간. 레일 아래 '9월 10월 …' 이름과 경계선 */
export function monthSegments(p: Period): MonthSegment[] {
  const out: MonthSegment[] = []
  for (let first = `${p.start.slice(0, 7)}-01`; first <= p.end; first = addDays(lastOfMonth(first), 1)) {
    const from = first < p.start ? p.start : first
    const last = lastOfMonth(first)
    const to = last > p.end ? p.end : last
    out.push({ ymd: from, year: +first.slice(0, 4), month: +first.slice(5, 7), from: edgeOf(from, p), to: edgeOf(addDays(to, 1), p) })
  }
  return out
}

const endOf = (e: Pick<ScheduleEvent, 'date' | 'endDate'>) => e.endDate ?? e.date
const byDate = (a: ScheduleEvent, b: ScheduleEvent) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title)

/** 기간에 걸친 일정 (여러 날 행사가 경계를 넘어도 포함), 날짜순 */
export function eventsInPeriod(events: readonly ScheduleEvent[], p: Period): ScheduleEvent[] {
  return events.filter((e) => e.date <= p.end && endOf(e) >= p.start).sort(byDate)
}

/** 지금 기수: 오늘까지 열린 일정 중 가장 최근 일정의 기수. 아직 열린 일정이 없으면 첫 일정의 기수 */
export function currentGeneration(events: readonly ScheduleEvent[], today: string): number | undefined {
  const tagged = events.filter((e) => e.generation != null).sort(byDate)
  const past = tagged.filter((e) => e.date <= today)
  return (past.at(-1) ?? tagged[0])?.generation
}

/**
 * 레일 기간: 지금 기수 일정이 있는 반년.
 * 오늘이 든 반년에 그 기수 일정이 하나도 없으면(방학 · 기수 사이) 다가오는 첫 일정, 그것도 없으면 마지막 일정의 반년.
 */
export function railPeriod(events: readonly ScheduleEvent[], today: string): Period {
  const here = halfYearOf(today)
  const gen = currentGeneration(events, today)
  const own = (gen == null ? [...events] : events.filter((e) => e.generation === gen)).sort(byDate)
  if (own.length === 0 || own.some((e) => e.date <= here.end && endOf(e) >= here.start)) return here
  const next = own.find((e) => endOf(e) >= today)
  return halfYearOf((next ?? own[own.length - 1]).date)
}

export interface SprintStep {
  label: string
  date: string
}

/**
 * G-Sprint 기간: 킥오프부터 데모데이까지.
 * 킥오프 = 단계 날짜 가운데 'G-Sprint' 종류 일정이 처음 열린 날 (발제 · 팀빌딩은 준비 단계라 뺀다).
 * 일정이 아직 없으면 null.
 */
export function sprintWindow(
  steps: readonly SprintStep[],
  demoDay: string,
  events: readonly ScheduleEvent[],
): { start: string; end: string; steps: SprintStep[] } | null {
  const sprintDays = new Set(events.filter((e) => e.kind === 'sprint').map((e) => e.date))
  const kickoff = steps.find((s) => sprintDays.has(s.date))
  if (!kickoff) return null
  return { start: kickoff.date, end: demoDay, steps: steps.filter((s) => s.date >= kickoff.date && s.date <= demoDay) }
}

/**
 * 가까이 붙은 표식을 줄(lane)로 나눈다. spans 는 시작 위치 순이어야 한다.
 * 같은 줄의 앞 표식 끝에서 gap 이상 떨어져야 그 줄에 놓는다. 0 이 기준선 위 줄.
 */
export function assignLanes(spans: readonly { from: number; to: number }[], gap: number): number[] {
  const ends: number[] = []
  return spans.map(({ from, to }) => {
    let lane = ends.findIndex((end) => from - end >= gap)
    if (lane === -1) lane = ends.push(to) - 1
    else ends[lane] = to
    return lane
  })
}

/** 글자 폭 어림 (px). 한글 1em, 공백 0.3em, 나머지 0.62em. 넉넉하게 잡는다 */
export function textWidth(text: string, px: number): number {
  let em = 0
  for (const ch of text) em += /[ᄀ-ᇿ㄰-㆏가-힣]/.test(ch) ? 1 : ch === ' ' ? 0.3 : 0.62
  return Math.ceil(em * px)
}

export interface LabelBox {
  /** 단계 날짜의 가로 위치 (px) */
  x: number
  /** 이름 폭 (px) */
  width: number
}

export interface PlacedLabel {
  /** 이름 왼쪽 끝 (px) */
  left: number
  hidden: boolean
}

/**
 * 단계 이름 자리 (px).
 * 마지막 단계는 막대 끝에 맞춰 오른쪽 맞춤. 나머지는 단계 날짜에서 왼쪽 맞춤으로 놓고,
 * 앞 이름과 겹치면 다음 단계까지 구간의 가운데로, 그래도 겹치면 숨긴다 (숨겨도 목록에는 남는다).
 * inset: 표식 반 폭. 이름 왼쪽 끝을 표식 왼쪽 끝에 맞춘다.
 */
export function placeStepLabels(items: readonly LabelBox[], { gap = 8, inset = 4 } = {}): PlacedLabel[] {
  const n = items.length
  if (n === 0) return []
  const last = items[n - 1]
  const lastLeft = n > 1 ? last.x + inset - last.width : last.x - inset
  const out: PlacedLabel[] = []
  let prevRight = -Infinity
  for (let i = 0; i < n - 1; i++) {
    const { x, width } = items[i]
    const nextX = items[i + 1].x
    const candidates = [x - inset]
    if (width <= nextX - x - 2 * gap) candidates.push((x + nextX) / 2 - width / 2)
    const left = candidates.find((l) => l >= Math.max(0, prevRight + gap) && l + width <= lastLeft - gap)
    if (left == null) {
      out.push({ left: x - inset, hidden: true })
      continue
    }
    out.push({ left, hidden: false })
    prevRight = left + width
  }
  out.push({ left: lastLeft, hidden: lastLeft < prevRight + gap })
  return out
}

/** 날짜 한 칸: '10.27 화', 해가 다르면 '2027.01.30 토' */
export const dayLabel = (ymd: string, today: string) => `${shortDate(ymd, today)} ${weekday(ymd)}`

/**
 * 일정 날짜 표기. 하루면 dayLabel, 여러 날이면 '2027.01.30~31 토~일' / '10.31~11.02 토~월'
 */
export function spanLabel(e: Pick<ScheduleEvent, 'date' | 'endDate'>, today: string): string {
  const end = e.endDate
  if (!end || end === e.date) return dayLabel(e.date, today)
  const tail = end.slice(0, 7) === e.date.slice(0, 7) ? end.slice(8, 10) : shortDate(end, e.date)
  return `${shortDate(e.date, today)}~${tail} ${weekday(e.date)}~${weekday(end)}`
}

/** 화면 읽기용 날짜: '10월 27일 화요일', 해가 다르면 '2027년 1월 30일 토요일' */
export function spokenDate(ymd: string, today: string): string {
  const year = ymd.slice(0, 4) === today.slice(0, 4) ? '' : `${+ymd.slice(0, 4)}년 `
  return `${year}${+ymd.slice(5, 7)}월 ${+ymd.slice(8, 10)}일 ${weekday(ymd)}요일`
}

/** 기간 안 일정(휴회 제외) 가운데 끝난 것과 전체 */
export function progressCount(events: readonly ScheduleEvent[], today: string): { done: number; total: number } {
  const real = events.filter((e) => e.kind !== 'rest')
  return { done: real.filter((e) => endOf(e) < today).length, total: real.length }
}
