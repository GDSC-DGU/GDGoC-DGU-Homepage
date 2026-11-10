import { statusOf } from '@/features/teams/data/rules'
import { kstToday } from '@/lib/date'
import { AdminRepoError } from '../common/errors'
import { byNewest, matchesQuery, newId, paginate } from '../common/list'
import { isoNow, requireActor, respond, type MockContext } from '../common/mockContext'
import type { BoardsRepository } from './repository'
import { ATTACHMENT_MAX, COMMUNITY_CATEGORIES, PERIOD_CATEGORIES, PINNED_CATEGORY, type AdminComment, type AdminPost, type BoardsState, type CommentRow, type CommunityPostInput, type PostRow } from './types'

/** 'YYYY-MM-DD' 인지 (날짜 칸은 브라우저가 이 모양으로 준다) */
const isYmd = (s: string | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s)

/**
 * 관리자 게시글 입력 확인 (F-ABD-010, F-TEM-005 2 · 011 1). 칸별 오류 문구, 없으면 빈 객체.
 * 작성 화면과 예시 저장소가 같은 규칙을 쓴다 (서버도 같은 규칙으로 다시 본다).
 * 칸 이름: category · title · startDate · endDate · content · attachments
 */
export function validateCommunityPostInput(input: CommunityPostInput): Record<string, string> {
  const e: Record<string, string> = {}
  if (!COMMUNITY_CATEGORIES.includes(input.category)) e.category = '분류를 골라 주세요.'
  if (!input.title.trim()) e.title = '제목을 입력해 주세요.'
  if (PERIOD_CATEGORIES.includes(input.category)) {
    if (!isYmd(input.startDate)) e.startDate = '세션 · 행사는 시작일을 입력해 주세요.'
    if (!isYmd(input.endDate)) e.endDate = '세션 · 행사는 종료일을 입력해 주세요.'
    else if (isYmd(input.startDate) && input.endDate < input.startDate) e.endDate = '종료일은 시작일과 같거나 이후여야 합니다.'
  }
  if (!input.content.trim()) e.content = '내용을 입력해 주세요.'
  if (input.attachmentIds.length > ATTACHMENT_MAX) e.attachments = `첨부파일은 게시글당 최대 ${ATTACHMENT_MAX}개까지 올릴 수 있습니다.`
  return e
}

/**
 * 게시판 예시 저장소 (store 의 boards 칸만 읽고 쓴다).
 * 주인: 2단계 게시판 담당. 규칙을 바꾸면 이 파일과 테스트(boards.test.ts)만 고친다.
 */
export function createMockBoardsRepository(ctx: MockContext): BoardsRepository {
  const state = () => ctx.store.get('boards')
  const live = <T extends { deleted: unknown }>(x: T) => !x.deleted

  const commentCount = (s: BoardsState, postId: string) => s.comments.filter((c) => c.postId === postId && live(c)).length
  /** Teams 모집 상태는 볼 때마다 다시 정한다 (종료일 다음 날 0시에 자동 마감: 공개 /teams 와 같은 규칙) */
  const recruitStatusOf = (p: AdminPost) => (p.board === 'teams' && p.endDate ? statusOf(p.endDate, !!p.closedByAuthor, kstToday(new Date(ctx.now()))) : p.recruitStatus)
  const toRow = (s: BoardsState, p: AdminPost, pinned = false): PostRow => ({ ...p, recruitStatus: recruitStatusOf(p), commentCount: commentCount(s, p.id), pinned })

  return {
    listPosts: (board, query) =>
      respond(() => {
        const s = state()
        const rows = s.posts
          .filter((p) => p.board === board && live(p))
          .filter((p) => !query.category || p.category === query.category)
          .filter((p) => matchesQuery(query.q, [p.title, p.content, p.authorName]))
          .sort((a, b) => byNewest<AdminPost>((p) => p.createdAt)(a, b) || b.no - a.no)
        // Community 공지는 '전체' 탭 · 검색어 없음일 때만 모든 페이지 위에 고정 (F-CMU-001 2, F-ABD-010 3).
        // 다른 탭 · 검색 결과에서는 일반 글과 같이 최신순. 쪽 나누기는 고정하지 않은 글로 한다
        const pinNotices = board === 'community' && !query.category && !query.q?.trim()
        if (!pinNotices) return paginate(rows.map((p) => toRow(s, p)), query)
        const pinned = rows.filter((p) => p.category === PINNED_CATEGORY)
        const page = paginate(
          rows.filter((p) => p.category !== PINNED_CATEGORY),
          query,
        )
        return { ...page, total: rows.length, items: [...pinned.map((p) => toRow(s, p, true)), ...page.items.map((p) => toRow(s, p))] }
      }),

    deletePosts: (board, postIds) =>
      respond(() => {
        const stamp = { by: requireActor(ctx), at: isoNow(ctx) }
        const ids = new Set(postIds)
        let deleted = 0
        ctx.store.set('boards', (s) => {
          // 이 게시판의 글만 (다른 게시판 id 가 섞여 와도 지우지 않는다)
          const hit = new Set(s.posts.filter((p) => p.board === board && ids.has(p.id) && !p.deleted).map((p) => p.id))
          deleted = hit.size
          return {
            posts: s.posts.map((p) => (hit.has(p.id) ? { ...p, deleted: stamp } : p)),
            // 게시글을 지우면 달린 댓글도 함께 숨김 (F-ABD-003 3)
            comments: s.comments.map((c) => (hit.has(c.postId) && !c.deleted ? { ...c, deleted: stamp } : c)),
          }
        })
        return { deleted }
      }),

    listComments: (board, query) =>
      respond(() => {
        const s = state()
        const posts = new Map(s.posts.map((p) => [p.id, p]))
        const rows: CommentRow[] = s.comments
          // 지운 글에 달린 댓글은 글과 함께 숨긴다
          .filter((c) => c.board === board && live(c) && !posts.get(c.postId)?.deleted)
          .sort(byNewest((c) => c.createdAt))
          .map((c) => ({ ...c, postTitle: posts.get(c.postId)?.title ?? '(지워진 게시글)' }))
        return paginate(rows, query)
      }),

    deleteComments: (commentIds) =>
      respond(() => {
        const stamp = { by: requireActor(ctx), at: isoNow(ctx) }
        const ids = new Set(commentIds)
        let deleted = 0
        ctx.store.set('boards', (s) => ({
          ...s,
          comments: s.comments.map((c): AdminComment => {
            if (!ids.has(c.id) || c.deleted) return c
            deleted++
            return { ...c, deleted: stamp }
          }),
        }))
        return { deleted }
      }),

    createCommunityPost: (input) =>
      respond(() => {
        const actor = requireActor(ctx)
        const fields = validateCommunityPostInput(input)
        if (Object.keys(fields).length) throw new AdminRepoError('VALIDATION', '입력한 내용을 확인해 주세요.', { fields })
        const attachments = input.attachmentIds.map((id) => {
          const f = ctx.files.get(id)
          if (!f) throw new AdminRepoError('NOT_FOUND', '올린 첨부파일을 찾을 수 없습니다. 다시 올려 주세요.', { fields: { attachments: '올린 첨부파일을 찾을 수 없습니다. 다시 올려 주세요.' } })
          return f
        })
        const withPeriod = PERIOD_CATEGORIES.includes(input.category)
        const at = isoNow(ctx)
        const s = state()
        const no = Math.max(0, ...s.posts.filter((p) => p.board === 'community').map((p) => p.no)) + 1
        const post: AdminPost = {
          id: newId('cp'),
          board: 'community',
          no,
          category: input.category,
          title: input.title.trim(),
          content: input.content.trim(),
          // 홈페이지에는 '운영진'으로만 보인다. 게시한 계정은 내부 기록(posted)으로 남긴다 (F-ABD-010 4)
          authorName: '운영진',
          byAdmin: true,
          createdAt: at,
          views: 0,
          // 기간은 세션 · 행사만 (그 밖의 분류는 캘린더에 나오지 않으므로 저장하지 않는다)
          startDate: withPeriod ? input.startDate : null,
          endDate: withPeriod ? input.endDate : null,
          recruitStatus: null,
          attachments,
          posted: { by: actor, at },
          deleted: null,
        }
        ctx.store.set('boards', (prev) => ({ ...prev, posts: [...prev.posts, post] }))
        return toRow(ctx.store.get('boards'), post, post.category === PINNED_CATEGORY)
      }),
  }
}
