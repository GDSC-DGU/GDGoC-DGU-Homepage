import { EVENTS } from '@/content'
import { kstToday } from '@/lib/date'
import { respond, type MockContext } from '../common/mockContext'
import { dashboardSchedule, NEW_WINDOW_HOURS, summarizeBoards } from './dashboard'
import type { DashboardRepository } from './repository'

/**
 * 대시보드 예시 저장소: 게시글 · 댓글은 게시판 구역의 store 데이터를 그대로 읽고(관리자가 지우면 바로 반영),
 * 행사 일정은 저장소의 실제 일정(src/content/events.json) + 관리자 게시글 기간 + 게시한 지원폼의 마감.
 */
export function createMockDashboardRepository(ctx: MockContext): DashboardRepository {
  return {
    get: () =>
      respond(() => {
        const now = ctx.now()
        return {
          asOf: new Date(now).toISOString(),
          windowHours: NEW_WINDOW_HOURS,
          ...summarizeBoards(ctx.store.get('boards'), now),
        }
      }),
    schedule: () => respond(() => dashboardSchedule(EVENTS, ctx.store.get('boards'), ctx.store.get('recruit').form, kstToday(new Date(ctx.now())))),
  }
}
