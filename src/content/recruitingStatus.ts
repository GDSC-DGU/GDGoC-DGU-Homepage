import { daysUntil, dayValue, isYmd, kstToday } from '@/lib/date'
import recruitingJson from './recruiting.json'

/**
 * 모집 상태를 날짜로 계산한다 (손으로 status 를 바꾸지 않아도 되게). recruitingStatus.test.ts 에 테스트.
 * recruiting.json 의 current 에 opensAt · deadline · applyUrl 을 적으면 홈 · 머리말 · 지원 안내가 함께 바뀐다 (docs/CONTENT.md).
 *
 *  - unscheduled: 일정 미정 (opensAt · deadline 모두 없음)
 *  - soon: 공지됐고 아직 열리기 전 (오늘 < opensAt)
 *  - open: 모집 중 (opensAt ≤ 오늘 ≤ deadline. 마감일 당일까지 모집 중)
 *  - ended: 마감 (오늘 > deadline)
 *
 * 날짜가 틀린 모양이면(2026-13-01, deadline < opensAt) 그 칸은 없는 것으로 본다. content 테스트가 recruitingProblems 로 잡는다.
 * opensAt 없이 deadline 만 있으면 '이미 열려 있고 그날 마감' 으로 본다.
 */
export type RecruitState = 'unscheduled' | 'soon' | 'open' | 'ended'

export interface RecruitStatus {
  state: RecruitState
  /** 모집하는 기수 (5) */
  generation: number
  /** 'YYYY-MM-DD' (맞는 모양일 때만) */
  opensAt?: string
  deadline?: string
  /** 지원서 주소 (https). 모집 중일 때 주 버튼 */
  applyUrl?: string
  /** 소식 채널 (인스타그램) */
  channelUrl: string
  /** 남은 날: soon 이면 열리는 날까지, open 이면 마감일까지 (마감일 당일 0) */
  daysLeft?: number
  /** 지난 모집 시기 '2026.08~09' (가장 최근 기수 기록, OT 제외) */
  lastWindow?: string
  /** 지난 모집 기수 (4) */
  lastGeneration?: number
}

/**
 * recruiting.json 의 current. 비운 칸은 null (운영진이 칸 이름을 보고 채울 수 있게 JSON 에 null 로 둔다).
 * status · message 는 예전 필드 (아직 읽는 화면이 있어 남겨 둔다. 날짜 세 칸이 우선)
 */
export interface RecruitingCurrent {
  generation: number
  channel: string
  opensAt?: string | null
  deadline?: string | null
  applyUrl?: string | null
  status?: string
  message?: string
}

export interface RecruitingSource {
  current: RecruitingCurrent
  history: readonly { generation: number; steps: readonly { id: string; start: string; end?: string }[] }[]
}

/** 'YYYY-MM-DD' 이고 실제로 있는 날인지 (2026-02-30 은 아니다) */
const isRealDay = (s: unknown): s is string => typeof s === 'string' && isYmd(s) && new Date(dayValue(s)).toISOString().slice(0, 10) === s

const isHttps = (s: unknown): s is string => typeof s === 'string' && /^https:\/\/\S+$/.test(s)

/** current 에서 틀린 곳 (운영진용 문장). 비어 있어야 정상 */
export function recruitingProblems(cur: RecruitingCurrent): string[] {
  const out: string[] = []
  if (cur.opensAt != null && !isRealDay(cur.opensAt)) out.push(`opensAt '${cur.opensAt}' 는 YYYY-MM-DD 모양의 실제 날짜여야 합니다`)
  if (cur.deadline != null && !isRealDay(cur.deadline)) out.push(`deadline '${cur.deadline}' 는 YYYY-MM-DD 모양의 실제 날짜여야 합니다`)
  if (isRealDay(cur.opensAt) && isRealDay(cur.deadline) && cur.deadline < cur.opensAt) out.push('deadline 이 opensAt 보다 앞입니다')
  if (cur.applyUrl != null && !isHttps(cur.applyUrl)) out.push('applyUrl 은 https:// 로 시작하는 주소여야 합니다')
  if (!isHttps(cur.channel)) out.push('channel 은 https:// 로 시작하는 주소여야 합니다')
  return out
}

/** 가장 최근 기수의 모집 시기 (OT 제외): '2026.08~09' · 같은 달 '2026.08' · 해를 넘으면 '2026.12~2027.01' */
export function lastWindowOf(history: RecruitingSource['history']): { generation?: number; label?: string } {
  const last = [...history].sort((a, b) => b.generation - a.generation)[0]
  if (!last) return {}
  const steps = last.steps.filter((s) => s.id !== 'ot' && isRealDay(s.start))
  if (steps.length === 0) return { generation: last.generation }
  const start = steps.map((s) => s.start).sort()[0]
  const end = steps
    .map((s) => (isRealDay(s.end) ? s.end : s.start))
    .sort()
    .at(-1)!
  const [y1, m1] = start.split('-')
  const [y2, m2] = end.split('-')
  const label = y1 === y2 ? (m1 === m2 ? `${y1}.${m1}` : `${y1}.${m1}~${m2}`) : `${y1}.${m1}~${y2}.${m2}`
  return { generation: last.generation, label }
}

/**
 * 지금 모집 상태. today 는 'YYYY-MM-DD'(한국 날짜) 또는 Date (한국 날짜로 바꿔 본다).
 * data 는 테스트에서만 바꾼다.
 */
export function recruitStatus(today: Date | string = new Date(), data: RecruitingSource = recruitingJson as RecruitingSource): RecruitStatus {
  const cur = data.current
  const t = typeof today === 'string' ? today.slice(0, 10) : kstToday(today)
  const opensAt = isRealDay(cur.opensAt) ? cur.opensAt : undefined
  const rawDeadline = isRealDay(cur.deadline) ? cur.deadline : undefined
  const deadline = rawDeadline && (!opensAt || rawDeadline >= opensAt) ? rawDeadline : undefined
  const applyUrl = isHttps(cur.applyUrl) ? cur.applyUrl : undefined

  let state: RecruitState = 'unscheduled'
  let daysLeft: number | undefined
  if (opensAt && t < opensAt) {
    state = 'soon'
    daysLeft = daysUntil(opensAt, t)
  } else if (opensAt || deadline) {
    if (deadline && t > deadline) state = 'ended'
    else {
      state = 'open'
      if (deadline) daysLeft = daysUntil(deadline, t)
    }
  }

  const last = lastWindowOf(data.history)
  return {
    state,
    generation: cur.generation,
    opensAt,
    deadline,
    applyUrl,
    channelUrl: cur.channel,
    daysLeft,
    lastWindow: last.label,
    lastGeneration: last.generation,
  }
}
