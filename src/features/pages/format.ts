import { daysUntil, monthDay, weekday } from '@/lib/date'

/**
 * 하위 페이지 날짜 · 출처 표기. 화면과 상관없는 계산만 둔다. format.test.ts 에 테스트.
 * 날짜는 이 파일의 dateLabel 하나로만 쓴다 (docs/DESIGN.md 3장).
 */

const year = (ymd: string) => ymd.slice(0, 4)
const md = (ymd: string) => `${monthDay(ymd)} ${weekday(ymd)}`
const dotted = (ymd: string) => `${year(ymd)}.${monthDay(ymd)}`

/**
 * 날짜 한 칸.
 * - 하루: '10.13 화' · 올해가 아니면 '2025.11.06 목'
 * - 기간: '08.18 화~08.31 월' · 올해가 아니면 앞에만 연도 '2027.01.30 토~01.31 일'
 * - 해를 넘는 기간: '2026.12.31~2027.01.01' (요일 없이)
 * today 는 'YYYY-MM-DD' (한국 날짜). 끝날이 없거나 시작과 같으면 하루로 본다.
 */
export function dateLabel(start: string, end: string | null | undefined, today: string): string {
  const prefix = year(start) === year(today) ? '' : `${year(start)}.`
  if (!end || end === start) return `${prefix}${md(start)}`
  if (year(end) !== year(start)) return `${dotted(start)}~${dotted(end)}`
  return `${prefix}${md(start)}~${md(end)}`
}

/** 'YYYY-MM' → 'YYYY.MM' (기수 기간처럼 달 단위 기간) */
export const dotMonth = (ym: string) => ym.slice(0, 7).replace('-', '.')

/** 시작일과 끝날을 모두 넣은 날 수: 08.18~08.31 → 14 */
export const spanDays = (start: string, end: string) => daysUntil(end, start) + 1

export const isUrl = (s: string | undefined): boolean => typeof s === 'string' && /^https?:\/\//.test(s)

/** 'https://www.instagram.com/x/' → 'instagram.com' */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/**
 * 출처 목록 → 기준 문구. 주소는 도메인만, 글로 된 출처('4기 운영 계획')는 그대로.
 * 같은 출처는 한 번만, 많으면 앞의 두 개 + '외'.
 */
export function basisLabel(sources: readonly (string | undefined)[]): string | null {
  const seen: string[] = []
  for (const src of sources) {
    if (!src) continue
    const label = isUrl(src) ? hostOf(src) : src.trim()
    if (label && !seen.includes(label)) seen.push(label)
  }
  if (seen.length === 0) return null
  return seen.length > 2 ? `${seen.slice(0, 2).join(', ')} 외` : seen.join(', ')
}
