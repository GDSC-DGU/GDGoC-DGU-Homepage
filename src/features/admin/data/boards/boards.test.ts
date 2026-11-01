import { beforeAll, describe, expect, it } from 'vitest'
import { createSessionStore } from '../auth/session'
import type { AdminRepoError } from '../common/errors'
import { setMockOptions } from '../common/mockContext'
import { createMockAdminRepositories } from '../repositories'
import { createAdminStore, memoryStorage } from '../store'
import { validateCommunityPostInput } from './mockRepository'
import { createBoardsSeed } from './seed'
import type { CommunityPostInput } from './types'

const NOW = Date.parse('2026-11-01T03:00:00Z')
const TODAY = '2026-11-01'
beforeAll(() => setMockOptions({ latency: [0, 0], failureRate: 0 }))

async function signedIn() {
  const storage = memoryStorage()
  const store = createAdminStore({ storage, now: () => NOW })
  const repos = createMockAdminRepositories({ store, session: createSessionStore(storage), now: () => NOW })
  await repos.auth.login({ loginId: 'core-b', password: 'example1234' })
  return { store, repos }
}
const rejects = (p: Promise<unknown>) =>
  p.then(
    () => {
      throw new Error('실패해야 합니다')
    },
    (e: AdminRepoError) => e,
  )
const input = (extra: Partial<CommunityPostInput> = {}): CommunityPostInput => ({ category: '공지', title: '예시 공지', startDate: null, endDate: null, content: '예시 내용', attachmentIds: [], ...extra })

describe('게시판 seed', () => {
  const seed = createBoardsSeed({ now: NOW })
  const teams = seed.posts.filter((p) => p.board === 'teams')
  const community = seed.posts.filter((p) => p.board === 'community')

  it('페이지 나누기를 볼 만큼 (게시판마다 글 20개 이상, 댓글 10개 이상)', () => {
    expect(teams.length).toBeGreaterThan(20)
    expect(community.length).toBeGreaterThan(20)
    expect(seed.comments.filter((c) => c.board === 'teams').length).toBeGreaterThan(10)
    expect(seed.comments.filter((c) => c.board === 'community').length).toBeGreaterThan(10)
  })

  it('번호는 게시판마다 오래된 글부터 1, 2, 3 …', () => {
    for (const list of [teams, community]) {
      const ordered = [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      expect(ordered.map((p) => p.no)).toEqual(ordered.map((_, i) => i + 1))
    }
  })

  it('댓글은 글보다 늦게 쓰였고, 글과 같은 게시판이다', () => {
    const byId = new Map(seed.posts.map((p) => [p.id, p]))
    for (const c of seed.comments) {
      const post = byId.get(c.postId)!
      expect(post, c.id).toBeDefined()
      expect(c.board, c.id).toBe(post.board)
      expect(c.createdAt > post.createdAt, c.id).toBe(true)
    }
  })

  it('관리자 글(공지 · 세션 · 행사)은 운영진 이름 + 게시한 계정 기록, 세션 · 행사는 지난 기간', () => {
    for (const p of community.filter((x) => x.byAdmin)) {
      expect(['공지', '세션', '행사']).toContain(p.category)
      expect(p.authorName).toBe('운영진')
      expect(p.posted?.by.kind).toBe('admin')
      if (p.category !== '공지') expect(p.endDate! < TODAY, p.id).toBe(true)
    }
    expect(community.filter((p) => !p.byAdmin).every((p) => ['정보 공유', '기타'].includes(p.category))).toBe(true)
  })

  it('Teams 모집 상태: 종료일이 지나면 마감, 직접 마감한 글은 종료일 전에도 마감', () => {
    for (const p of teams) {
      if (p.endDate! < TODAY) expect(p.recruitStatus, p.id).toBe('마감')
    }
    expect(teams.some((p) => p.recruitStatus === '마감' && p.endDate! >= TODAY)).toBe(true)
    expect(teams.some((p) => p.recruitStatus === '모집중')).toBe(true)
  })
})

describe('게시글 목록 (F-ABD-001 · 002 · 006~008, API-ABD-001)', () => {
  it('최신순 10개씩 + 전체 개수', async () => {
    const { repos, store } = await signedIn()
    const page1 = await repos.boards.listPosts('teams', {})
    const teamsCount = store.get('boards').posts.filter((p) => p.board === 'teams').length
    expect(page1).toMatchObject({ page: 1, pageSize: 10, total: teamsCount, totalPages: Math.ceil(teamsCount / 10) })
    const times = page1.items.map((p) => p.createdAt)
    expect([...times].sort().reverse()).toEqual(times)
    const last = await repos.boards.listPosts('teams', { page: page1.totalPages })
    expect(last.items.length).toBe(teamsCount - (page1.totalPages - 1) * 10)
  })

  it('Community 공지는 전체 탭 · 검색어 없음일 때 모든 페이지 맨 위에 고정된다', async () => {
    const { repos, store } = await signedIn()
    const notices = store.get('boards').posts.filter((p) => p.board === 'community' && p.category === '공지')
    const others = store.get('boards').posts.filter((p) => p.board === 'community' && p.category !== '공지')
    const p1 = await repos.boards.listPosts('community', {})
    const p2 = await repos.boards.listPosts('community', { page: 2 })
    for (const page of [p1, p2]) {
      expect(page.items.slice(0, notices.length).every((p) => p.pinned && p.category === '공지')).toBe(true)
      expect(page.items.slice(notices.length).some((p) => p.pinned || p.category === '공지')).toBe(false)
    }
    expect(p1.total).toBe(notices.length + others.length)
    expect(p1.totalPages).toBe(Math.ceil(others.length / 10))
    // 다른 탭 · 검색에서는 고정하지 않는다
    const tab = await repos.boards.listPosts('community', { category: '공지' })
    expect(tab.items.every((p) => !p.pinned)).toBe(true)
    const search = await repos.boards.listPosts('community', { q: '예시' })
    expect(search.items.every((p) => !p.pinned)).toBe(true)
  })

  it('분류 + 검색어를 함께 적용, 검색 범위는 제목 · 내용 · 작성자', async () => {
    const { repos } = await signedIn()
    const sessions = await repos.boards.listPosts('community', { category: '세션', q: '주차' })
    expect(sessions.total).toBeGreaterThan(0)
    expect(sessions.items.every((p) => p.category === '세션' && p.title.includes('주차'))).toBe(true)
    // 작성자 이름 (한 사람이 쓴 글 여러 개)
    const byAuthor = await repos.boards.listPosts('teams', { q: '예시 멤버 07' })
    expect(byAuthor.total).toBeGreaterThan(1)
    expect(byAuthor.items.every((p) => p.authorName === '예시 멤버 07')).toBe(true)
    // 내용
    expect((await repos.boards.listPosts('teams', { q: '관리자 화면을 보여 주려고' })).total).toBeGreaterThan(10)
    // 관리자 글은 '운영진'으로만 찾힌다 (관리자 개인 이름으로는 안 찾힘, F-TEM-003 2)
    expect((await repos.boards.listPosts('community', { q: '운영진' })).items.every((p) => p.byAdmin)).toBe(true)
    expect((await repos.boards.listPosts('community', { q: '운영진A' })).total).toBe(0)
    expect((await repos.boards.listPosts('teams', { q: '없는 검색어' })).total).toBe(0)
  })

  it('댓글 수는 살아 있는 댓글만 센다', async () => {
    const { repos, store } = await signedIn()
    const before = (await repos.boards.listPosts('teams', { q: '알고리즘 스터디' })).items[0]
    expect(before.commentCount).toBe(1)
    const commentId = store.get('boards').comments.find((c) => c.postId === before.id)!.id
    await repos.boards.deleteComments([commentId])
    expect((await repos.boards.listPosts('teams', { q: '알고리즘 스터디' })).items[0].commentCount).toBe(0)
  })
})

describe('게시글 · 댓글 삭제 (F-ABD-003 · 005 · 009 · 012)', () => {
  it('선택 삭제: 삭제 상태로만 바꾸고(누가 · 언제), 다른 게시판 글은 건드리지 않는다', async () => {
    const { repos, store } = await signedIn()
    const before = store.get('boards').posts.length
    expect(await repos.boards.deletePosts('community', ['cp-03', 'cp-05', 'tp-04'])).toEqual({ deleted: 2 })
    const posts = store.get('boards').posts
    expect(posts).toHaveLength(before)
    expect(posts.find((p) => p.id === 'cp-03')?.deleted).toEqual({ by: { kind: 'admin', id: 'user-admin-b', name: '운영진B', role: 'Core' }, at: new Date(NOW).toISOString() })
    expect(posts.find((p) => p.id === 'tp-04')?.deleted).toBeNull()
    // 다시 지워도 셈에 들어가지 않는다
    expect(await repos.boards.deletePosts('community', ['cp-03'])).toEqual({ deleted: 0 })
  })

  it('지운 글은 목록 · 전체 개수에서 빠지고, 달린 댓글도 댓글 목록에서 빠진다', async () => {
    const { repos } = await signedIn()
    const total = (await repos.boards.listPosts('community', {})).total
    const comments = (await repos.boards.listComments('community', { pageSize: 100 })).items
    expect(comments.some((c) => c.postId === 'cp-03')).toBe(true)
    await repos.boards.deletePosts('community', ['cp-03'])
    expect((await repos.boards.listPosts('community', {})).total).toBe(total - 1)
    const after = await repos.boards.listComments('community', { pageSize: 100 })
    expect(after.items.some((c) => c.postId === 'cp-03')).toBe(false)
    expect(after.total).toBe(comments.length - comments.filter((c) => c.postId === 'cp-03').length)
  })

  it('댓글 목록은 최신순 10개씩, 게시글 제목을 함께 준다. 삭제는 상태만 바꾼다', async () => {
    const { repos, store } = await signedIn()
    const page = await repos.boards.listComments('teams', {})
    expect(page.pageSize).toBe(10)
    expect(page.totalPages).toBeGreaterThan(1)
    const times = page.items.map((c) => c.createdAt)
    expect([...times].sort().reverse()).toEqual(times)
    expect(page.items.every((c) => c.postTitle.includes('예시'))).toBe(true)
    const ids = page.items.slice(0, 2).map((c) => c.id)
    expect(await repos.boards.deleteComments(ids)).toEqual({ deleted: 2 })
    expect(store.get('boards').comments.filter((c) => ids.includes(c.id)).every((c) => c.deleted?.by.kind === 'admin')).toBe(true)
    expect((await repos.boards.listComments('teams', {})).total).toBe(page.total - 2)
  })
})

describe('관리자 게시글 작성 (F-ABD-010 · 013, API-ABD-005)', () => {
  it('입력 확인: 분류 · 제목 · 내용 필수, 세션 · 행사는 기간 필수 + 종료일 ≥ 시작일, 첨부 3개까지', () => {
    expect(validateCommunityPostInput(input())).toEqual({})
    expect(Object.keys(validateCommunityPostInput(input({ title: ' ', content: '' }))).sort()).toEqual(['content', 'title'])
    expect(Object.keys(validateCommunityPostInput(input({ category: '세션' }))).sort()).toEqual(['endDate', 'startDate'])
    expect(validateCommunityPostInput(input({ category: '행사', startDate: '2026-11-10', endDate: '2026-11-09' }))).toEqual({ endDate: '종료일은 시작일과 같거나 이후여야 합니다.' })
    expect(validateCommunityPostInput(input({ category: '행사', startDate: '2026-11-10', endDate: '2026-11-10' }))).toEqual({})
    // 공지 · 정보 공유 · 기타는 기간 없이
    expect(validateCommunityPostInput(input({ category: '기타' }))).toEqual({})
    expect(validateCommunityPostInput(input({ attachmentIds: ['a', 'b', 'c', 'd'] }))).toHaveProperty('attachments')
  })

  it("'운영진' 이름으로 게시, 게시한 계정 기록, 기간은 세션 · 행사만 저장", async () => {
    const { repos } = await signedIn()
    const notice = await repos.boards.createCommunityPost(input({ startDate: '2026-11-10', endDate: '2026-11-11' }))
    expect(notice).toMatchObject({ authorName: '운영진', byAdmin: true, pinned: true, startDate: null, endDate: null, posted: { by: { name: '운영진B', role: 'Core' } } })
    const event = await repos.boards.createCommunityPost(input({ category: '행사', title: '예시 행사', startDate: '2026-11-10', endDate: '2026-11-11' }))
    expect(event).toMatchObject({ startDate: '2026-11-10', endDate: '2026-11-11', pinned: false })
    // 새 공지는 전체 탭 맨 위 고정 줄에 들어간다
    const list = await repos.boards.listPosts('community', {})
    expect(list.items[0].id).toBe(notice.id)
    expect(list.items.find((p) => p.id === event.id)).toBeDefined()
  })

  it('첨부파일: 올린 파일(PDF · JPG · PNG, 10MB 이하)을 게시글에 연결한다', async () => {
    const { repos } = await signedIn()
    const pdf = await repos.uploads.upload(new File(['예시'], '예시_자료.pdf', { type: 'application/pdf' }), 'postAttachment')
    const bad = await rejects(repos.uploads.upload(new File(['x'], 'a.gif', { type: 'image/gif' }), 'postAttachment'))
    expect(bad.message).toBe('PDF · JPG · PNG 파일만, 10MB 이하로 올릴 수 있어요.')
    const row = await repos.boards.createCommunityPost(input({ attachmentIds: [pdf.fileId] }))
    expect(row.attachments).toEqual([pdf])
    expect((await rejects(repos.boards.createCommunityPost(input({ attachmentIds: ['없는-파일'] })))).code).toBe('NOT_FOUND')
  })

  it('입력이 틀리면 칸별 오류 (서버 400 흉내)', async () => {
    const { repos } = await signedIn()
    const e = await rejects(repos.boards.createCommunityPost(input({ category: '세션', title: '', content: '' })))
    expect(e.code).toBe('VALIDATION')
    expect(Object.keys(e.fields ?? {}).sort()).toEqual(['content', 'endDate', 'startDate', 'title'])
  })
})
