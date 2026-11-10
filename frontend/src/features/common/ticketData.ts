import { daysUntil, ddayLabel, shortDate, weekday } from '@/lib/date'

/**
 * 일정 표(Ticket) 계산 (DOM 없음, common.test.ts 에 테스트).
 * 날짜는 한국 날짜 'YYYY-MM-DD' (lib/date.ts).
 */

/** 표의 D-day: 'D-9' · 'D-day' · 여러 날 행사가 진행 중이면 '진행 중' · 끝났으면 '종료' */
export function ticketDday(date: string, endDate: string | null | undefined, today: string): string {
  if (daysUntil(date, today) < 0 && endDate && endDate >= today) return '진행 중'
  return ddayLabel(endDate && endDate < today ? endDate : date, today)
}

/** 표의 날짜: { day: '10.27', week: '화' } · 올해가 아니면 day 가 '2027.01.30' */
export function ticketDate(date: string, today: string): { day: string; week: string } {
  return { day: shortDate(date, today), week: weekday(date) }
}
