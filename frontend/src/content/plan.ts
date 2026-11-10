import type { ScheduleEvent } from '@/domain/types'

/**
 * 운영 계획에만 있는 일정 다루기. plan.test.ts 에 테스트.
 *
 * events.json 에는 공개 행사 페이지가 아직 없는 '4기 운영 계획' 일정도 들어 있다 (source: '4기 운영 계획').
 * 날짜가 다가오면 공개 페이지가 생기고 sync-events 가 url · source 를 채운다.
 * 날짜가 지났는데도 계획으로만 남아 있으면, 실제로 열렸는지 확인되지 않은 일정이므로 화면에서 뺀다
 * ('계획' 이나 '지난 일정' 으로 보이지 않게).
 */

/** 공개 행사 페이지 없이 운영 계획에만 있는 일정인지 */
export const isPlanOnly = (e: Pick<ScheduleEvent, 'url' | 'source'>): boolean => !e.url && /운영 계획/.test(e.source ?? '')

/**
 * 날짜가 지났는데 아직 계획으로만 남은 일정. 여러 날 일정은 마지막 날이 지나야 한다.
 * today: 'YYYY-MM-DD' (한국 날짜). 오늘 열리는 일정은 아직 지나지 않았다.
 */
export function isStalePlan(e: Pick<ScheduleEvent, 'url' | 'source' | 'date' | 'endDate'>, today: string): boolean {
  return isPlanOnly(e) && (e.endDate ?? e.date) < today
}

/** 화면에 보일 일정: 지난 계획 일정을 뺀 목록 (빠진 것이 없으면 받은 배열 그대로) */
export function withoutStalePlans<T extends Pick<ScheduleEvent, 'url' | 'source' | 'date' | 'endDate'>>(events: readonly T[], today: string): readonly T[] {
  const kept = events.filter((e) => !isStalePlan(e, today))
  return kept.length === events.length ? events : kept
}
