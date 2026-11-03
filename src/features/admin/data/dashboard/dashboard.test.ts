import { beforeAll, describe, expect, it } from 'vitest'
import { EVENTS } from '@/content'
import type { ScheduleEvent } from '@/domain/types'
import { closingSoon, isNew, statusOf } from '@/features/teams/data/rules'
import { createSampleSeed } from '@/features/teams/data/sampleSeed'
import { createSessionStore } from '../auth/session'
import { createBoardsSeed } from '../boards/seed'
import type { BoardsState } from '../boards/types'
import { setMockOptions } from '../common/mockContext'
import type { RecruitFormState } from '../recruit/types'
import { createMockAdminRepositories } from '../repositories'
import { createAdminStore, memoryStorage } from '../store'
import { dashboardSchedule, excerpt, summarizeBoards } from './dashboard'

const NOW = Date.parse('2026-11-01T03:00:00Z')
beforeAll(() => setMockOptions({ latency: [0, 0], failureRate: 0 }))

const noForm: RecruitFormState = { draft: null, draftSaved: null, published: null, publishedStamp: null }
const ev = (id: string, date: string, extra: Partial<ScheduleEvent> = {}): ScheduleEvent => ({ id, date, title: id, kind: 'event', place: 'community', ...extra })

describe('대시보드 게시판 요약 (F-ACM-005~007)', () => {
  const boards = createBoardsSeed({ now: NOW })
  const sampleBoards = createBoardsSeed({ now: NOW, sample: true })

  it('Teams · Community 를 합쳐 최신순 5개, 삭제 제외', () => {
    const sum = summarizeBoards(sampleBoards, NOW)
    expect(sum.recentPosts).toHaveLength(5)
    const times = sum.recentPosts.map((p) => p.createdAt)
    expect([...times].sort().reverse()).toEqual(times)
    expect(new Set(sum.recentPosts.map((p) => p.board))).toEqual(new Set(['teams', 'community']))
    expect(sum.recentComments).toHaveLength(5)
    expect(sum.recentComments[0].postTitle).not.toBe('')
  })

  it("새로운 게시글 · 댓글 · 모집 현황은 공개 /teams 와 같은 규칙 ('N 새 글' · 모집 중 · 마감 임박)", () => {
    const sum = summarizeBoards(boards, NOW)
    const pub = createSampleSeed('2026-11-01', NOW)
    expect(sum.newPosts.teams).toBe(pub.posts.filter((p) => isNew(p.createdAt, NOW)).length)
    expect(sum.newPosts.teams).toBeGreaterThan(0)
    expect(sum.newComments.teams).toBe(pub.comments.filter((c) => isNew(c.createdAt, NOW)).length)
    const status = pub.posts.map((p) => ({ endDate: p.endDate, status: statusOf(p.endDate, p.closedByAuthor, '2026-11-01') }))
    expect(sum.teams).toEqual({ open: status.filter((x) => x.status === '모집중').length, closingSoon: status.filter((x) => closingSoon(x.endDate, x.status, '2026-11-01')).length })
    expect(summarizeBoards(sampleBoards, NOW).newPosts.community).toBeGreaterThan(0)
  })

  it('게시글을 지우면 그 글과 달린 댓글이 대시보드에서 빠진다', () => {
    const newest = summarizeBoards(boards, NOW).recentPosts[0]
    const deleted: BoardsState = {
      posts: boards.posts.map((p) => (p.id === newest.id ? { ...p, deleted: { by: { kind: 'system', name: '시스템' }, at: '' } } : p)),
      comments: boards.comments,
    }
    const sum = summarizeBoards(deleted, NOW)
    expect(sum.recentPosts.some((p) => p.id === newest.id)).toBe(false)
    expect(sum.recentComments.some((c) => c.postId === newest.id)).toBe(false)
  })

  it('내용 일부는 줄바꿈을 펴고 40자에서 자른다', () => {
    expect(excerpt('첫 줄\n둘째 줄')).toBe('첫 줄 둘째 줄')
    expect(excerpt('가'.repeat(50))).toBe(`${'가'.repeat(40)}…`)
  })
})

describe('대시보드 행사 일정 (F-ACM-008)', () => {
  const empty: BoardsState = { posts: [], comments: [] }

  it('오늘 이후 4개, 휴회 · 지난 일정 제외, 날짜순', () => {
    const events = [ev('past', '2026-10-01'), ev('rest', '2026-11-10', { kind: 'rest' }), ev('c', '2026-12-01'), ev('a', '2026-11-02'), ev('b', '2026-11-20'), ev('d', '2026-12-15'), ev('e', '2026-12-22')]
    expect(dashboardSchedule(events, empty, noForm, '2026-11-01').map((x) => x.id)).toEqual(['cal-a', 'cal-b', 'cal-c', 'cal-d'])
  })

  it('관리자 Community 세션 · 행사 글의 기간과 게시한 지원폼의 마감을 더한다 (같은 날이면 마감 먼저)', () => {
    const boards = createBoardsSeed({ now: NOW })
    const withPost: BoardsState = {
      posts: [{ ...boards.posts[0], id: 'new', board: 'community', category: '행사', title: '새 행사', startDate: '2026-11-20', endDate: '2026-11-21', deleted: null }],
      comments: [],
    }
    const form: RecruitFormState = { ...noForm, published: { generation: 5, startDate: '2026-11-10', endDate: '2026-11-20', questions: [] } }
    const items = dashboardSchedule([ev('a', '2026-11-02')], withPost, form, '2026-11-01')
    expect(items.map((x) => [x.kind, x.title])).toEqual([
      ['행사', 'a'],
      ['마감', '5기 지원 마감'],
      ['행사', '새 행사'],
    ])
    expect(items[2]).toMatchObject({ source: 'post', endDate: '2026-11-21' })
  })

  it('동아리 일정에서 옮겨 온 seed 글은 일정과 겹쳐 두 번 나오지 않는다', () => {
    const boards = createBoardsSeed({ now: NOW })
    const items = dashboardSchedule(EVENTS, boards, noForm, '2026-11-01')
    expect(items.length).toBeGreaterThan(0)
    expect(items.every((x) => x.source === 'calendar')).toBe(true)
    expect(new Set(items.map((x) => `${x.date}|${x.title}`)).size).toBe(items.length)
  })
})

describe('대시보드 예시 저장소 = 게시판 store 를 같이 읽는다', () => {
  it('게시판 관리에서 지우면 대시보드도 바로 바뀐다', async () => {
    const storage = memoryStorage()
    const store = createAdminStore({ storage, now: () => NOW })
    const session = createSessionStore(storage)
    const repos = createMockAdminRepositories({ store, session, now: () => NOW })
    await repos.auth.login({ loginId: 'lead-a', password: 'example1234' })
    const before = await repos.dashboard.get()
    expect(before.teams.open).toBeGreaterThan(0)
    const target = before.recentPosts[0]
    await repos.boards.deletePosts(target.board, [target.id])
    const after = await repos.dashboard.get()
    expect(after.recentPosts.some((p) => p.id === target.id)).toBe(false)
    expect(store.get('boards').posts.find((p) => p.id === target.id)?.deleted?.by).toMatchObject({ kind: 'admin', name: '운영진A' })
  })
})
