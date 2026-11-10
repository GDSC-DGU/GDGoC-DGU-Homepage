import type { DashboardData, DashboardScheduleItem } from './dashboard'

/** 대시보드 (P-ACM-03). 주인: 기초(1단계) */
export interface DashboardRepository {
  /** API-ACM-005 GET /api/admin/dashboard — 지표 · 새 게시글 · 새 댓글 */
  get(): Promise<DashboardData>
  /** F-ACM-008 행사 일정: 오늘 이후 4개 (홈 캘린더와 같은 기준, 명세상 홈 캘린더 API 를 같이 쓴다) */
  schedule(): Promise<DashboardScheduleItem[]>
}
