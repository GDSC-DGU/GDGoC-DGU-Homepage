import type { ScheduleEvent } from '@/domain/types'
import { closingSoon, isNew, statusOf } from '@/features/teams/data/rules'
import { kstToday } from '@/lib/date'
import { upcomingEvents } from '@/lib/schedule'
import type { BoardId, BoardsState, PostCategory } from '../boards/types'
import type { IsoTime, Ymd } from '../common/types'
import type { RecruitFormState } from '../recruit/types'

/**
 * 대시보드 계산 (P-ACM-03, F-ACM-005~008). 화면 없이 계산만 한다 (테스트: dashboard.test.ts).
 * '새로운' 기준은 공개 /teams 의 'N 새 글'과 같은 규칙(teams/data/rules.ts isNew, 24시간 안).
 */
export const NEW_WINDOW_HOURS = 24

export interface RecentPost {
  id: string
  board: BoardId
  category: PostCategory
  title: string
  createdAt: IsoTime
}

export interface RecentComment {
  id: string
  board: BoardId
  postId: string
  postTitle: string
  authorName: string
  /** 내용 일부 */
  excerpt: string
  createdAt: IsoTime
}

/** API-ACM-005 응답 */
export interface DashboardData {
  asOf: IsoTime
  /** 팀원 찾기 모집 현황 (공개 /teams 안내판의 '모집 중' · '마감 임박'과 같은 규칙) */
  teams: { open: number; closingSoon: number }
  newPosts: Record<BoardId, number>
  newComments: Record<BoardId, number>
  windowHours: number
  recentPosts: RecentPost[]
  recentComments: RecentComment[]
}

/** 행사 일정 한 줄 (F-ACM-008): 날짜 · 구분(행사 / 마감) · 제목 · 기간 */
export interface DashboardScheduleItem {
  id: string
  date: Ymd
  endDate: Ymd | null
  kind: '행사' | '마감'
  title: string
  /** 어디서 왔는지: 동아리 일정(events.json) · 관리자 게시글 기간 · 지원폼 지원 기간 */
  source: 'calendar' | 'post' | 'recruit'
}

/** 글 앞부분 (줄바꿈은 띄어쓰기로) */
export function excerpt(text: string, max = 40): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max).trimEnd()}…` : flat
}

/** 게시판 요약: 새 글 · 새 댓글 수(최근 24시간)와 최근 5개씩 (Teams · Community 합쳐 최신순, 삭제 제외) + Teams 모집 현황 */
export function summarizeBoards(boards: BoardsState, now: number, { limit = 5 } = {}) {
  const livePosts = boards.posts.filter((p) => !p.deleted)
  const postById = new Map(livePosts.map((p) => [p.id, p]))
  const liveComments = boards.comments.filter((c) => !c.deleted && postById.has(c.postId))
  const fresh = (at: string) => isNew(at, now)
  const newest = <T extends { createdAt: string }>(a: T, b: T) => b.createdAt.localeCompare(a.createdAt)
  const today = kstToday(new Date(now))
  const teamsStatus = livePosts.filter((p) => p.board === 'teams' && p.endDate).map((p) => ({ endDate: p.endDate!, status: statusOf(p.endDate!, !!p.closedByAuthor, today) }))

  return {
    teams: {
      open: teamsStatus.filter((t) => t.status === '모집중').length,
      closingSoon: teamsStatus.filter((t) => closingSoon(t.endDate, t.status, today)).length,
    },
    newPosts: {
      teams: livePosts.filter((p) => p.board === 'teams' && fresh(p.createdAt)).length,
      community: livePosts.filter((p) => p.board === 'community' && fresh(p.createdAt)).length,
    },
    newComments: {
      teams: liveComments.filter((c) => c.board === 'teams' && fresh(c.createdAt)).length,
      community: liveComments.filter((c) => c.board === 'community' && fresh(c.createdAt)).length,
    },
    recentPosts: [...livePosts]
      .sort(newest)
      .slice(0, limit)
      .map(({ id, board, category, title, createdAt }): RecentPost => ({ id, board, category, title, createdAt })),
    recentComments: [...liveComments]
      .sort(newest)
      .slice(0, limit)
      .map(
        (c): RecentComment => ({
          id: c.id,
          board: c.board,
          postId: c.postId,
          postTitle: postById.get(c.postId)?.title ?? '',
          authorName: c.authorName,
          excerpt: excerpt(c.content),
          createdAt: c.createdAt,
        }),
      ),
  }
}

/**
 * 오늘 이후 일정 4개 (F-ACM-008, 기준은 홈 캘린더 F-HOM-004 와 같다):
 * - 행사: 동아리 일정(src/content/events.json, 휴회 제외) + 관리자가 쓴 Community 세션 · 행사 글의 기간
 * - 마감: 게시한 지원폼의 지원 기간 종료일 ('지원 마감')
 * 같은 날이면 마감을 먼저 (놓치면 안 되는 것).
 */
export function dashboardSchedule(events: readonly ScheduleEvent[], boards: BoardsState, form: RecruitFormState, today: Ymd, limit = 4): DashboardScheduleItem[] {
  const fromCalendar: DashboardScheduleItem[] = upcomingEvents(events, today).map((e) => ({ id: `cal-${e.id}`, date: e.date, endDate: e.endDate ?? null, kind: '행사', title: e.title, source: 'calendar' }))
  // 동아리 일정에서 옮겨 온 글(같은 날 · 같은 제목)은 한 번만
  const onCalendar = new Set(fromCalendar.map((e) => `${e.date}|${e.title}`))
  const fromPosts: DashboardScheduleItem[] = boards.posts
    .filter((p) => !p.deleted && p.board === 'community' && (p.category === '세션' || p.category === '행사') && p.startDate && (p.endDate ?? p.startDate) >= today)
    .filter((p) => !onCalendar.has(`${p.startDate}|${p.title}`))
    .map((p) => ({ id: `post-${p.id}`, date: p.startDate!, endDate: p.endDate && p.endDate !== p.startDate ? p.endDate : null, kind: '행사', title: p.title, source: 'post' }))
  const end = form.published?.endDate
  const fromRecruit: DashboardScheduleItem[] =
    end && end >= today ? [{ id: 'recruit-deadline', date: end, endDate: null, kind: '마감', title: `${form.published!.generation}기 지원 마감`, source: 'recruit' }] : []

  return [...fromCalendar, ...fromPosts, ...fromRecruit]
    .sort((a, b) => a.date.localeCompare(b.date) || (a.kind === b.kind ? a.title.localeCompare(b.title) : a.kind === '마감' ? -1 : 1))
    .slice(0, limit)
}
