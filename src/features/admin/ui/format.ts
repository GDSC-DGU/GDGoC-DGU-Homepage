/**
 * 관리자 화면의 날짜 · 시각 · 숫자 표기 (명세서 표기를 따른다: '2026.10.23 (금) 14:00').
 * 시각은 모두 한국 시간으로 보여 준다 (보는 사람 컴퓨터의 시간대와 상관없이).
 */
const WEEKDAYS = '일월화수목금토'
const KST = 9 * 3_600_000

interface KstParts {
  y: string
  m: string
  d: string
  hh: string
  mm: string
  wd: string
}

function kstParts(input: string | number | Date): KstParts {
  const ms = typeof input === 'number' ? input : input instanceof Date ? input.getTime() : Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(input) ? `${input}T00:00:00+09:00` : input)
  const t = new Date(ms + KST)
  const p = (n: number) => String(n).padStart(2, '0')
  return { y: String(t.getUTCFullYear()), m: p(t.getUTCMonth() + 1), d: p(t.getUTCDate()), hh: p(t.getUTCHours()), mm: p(t.getUTCMinutes()), wd: WEEKDAYS[t.getUTCDay()] }
}

/** '2026.10.23' (ISO 시각 또는 'YYYY-MM-DD') */
export function formatDate(input: string | number | Date): string {
  const { y, m, d } = kstParts(input)
  return `${y}.${m}.${d}`
}

/** '2026.10.23 (금)' */
export function formatDay(input: string | number | Date): string {
  const { y, m, d, wd } = kstParts(input)
  return `${y}.${m}.${d} (${wd})`
}

/** '2026.10.23 14:00' (표 안) */
export function formatDateTime(input: string | number | Date): string {
  const { y, m, d, hh, mm } = kstParts(input)
  return `${y}.${m}.${d} ${hh}:${mm}`
}

/** '2026.10.23 (금) 14:00' (메일 변수 {{면접일시}} · 상세) */
export function formatDateTimeLong(input: string | number | Date): string {
  const { y, m, d, hh, mm, wd } = kstParts(input)
  return `${y}.${m}.${d} (${wd}) ${hh}:${mm}`
}

/** 기간: '2026.10.23 – 10.25' · 하루면 '2026.10.23' · 해가 다르면 둘 다 연도 */
export function formatPeriod(start: string, end: string | null | undefined): string {
  if (!end || end === start) return formatDate(start)
  const a = kstParts(start)
  const b = kstParts(end)
  if (a.y !== b.y) return `${formatDate(start)} – ${formatDate(end)}`
  return `${formatDate(start)} – ${b.m}.${b.d}`
}

/**
 * 경과 시간 (대시보드 F-ACM-006 · 007): '방금 전' · '12분 전' · '3시간 전' · '2일 전', 7일이 넘으면 날짜.
 */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const diff = Math.max(0, now - Date.parse(iso))
  const min = Math.floor(diff / 60_000)
  if (min < 1) return '방금 전'
  if (min < 60) return `${min}분 전`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}시간 전`
  const d = Math.floor(h / 24)
  if (d <= 7) return `${d}일 전`
  return formatDate(iso)
}

/** '1,234' */
export const formatNumber = (n: number) => n.toLocaleString('ko-KR')

/** 숫자 + 단위: '12명' · '3개' · '20건' */
export const countLabel = (n: number, unit: string) => `${formatNumber(n)}${unit}`
