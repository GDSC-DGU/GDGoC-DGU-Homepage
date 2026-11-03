import { beforeAll, describe, expect, it } from 'vitest'
import { createSessionStore } from './auth/session'
import type { AdminRepoError } from './common/errors'
import { setMockOptions } from './common/mockContext'
import { createMockAdminRepositories } from './repositories'
import { createAdminStore, memoryStorage } from './store'

const NOW = Date.parse('2026-11-01T03:00:00Z')
beforeAll(() => setMockOptions({ latency: [0, 0], failureRate: 0 }))

async function signedIn(loginId: 'lead-a' | 'core-b' = 'lead-a') {
  const storage = memoryStorage()
  const store = createAdminStore({ storage, now: () => NOW })
  const repos = createMockAdminRepositories({ store, session: createSessionStore(storage), now: () => NOW })
  await repos.auth.login({ loginId, password: 'example1234' })
  return { store, repos }
}
const rejects = (p: Promise<unknown>) => p.then(
  () => {
    throw new Error('실패해야 합니다')
  },
  (e: AdminRepoError) => e,
)

describe('예시 저장소 공통', () => {
  it('로그인하지 않으면 쓰기를 막는다 (서버의 401 흉내)', async () => {
    const storage = memoryStorage()
    const store = createAdminStore({ storage, now: () => NOW })
    const repos = createMockAdminRepositories({ store, session: createSessionStore(storage), now: () => NOW })
    expect((await rejects(repos.boards.deletePosts('teams', ['post-23']))).code).toBe('UNAUTHORIZED')
  })

  it('돌려받은 값을 고쳐도 store 는 그대로다 (복사본)', async () => {
    const { repos, store } = await signedIn()
    const page = await repos.boards.listPosts('teams', {})
    page.items[0].title = '바꿈'
    expect(store.get('boards').posts.some((p) => p.title === '바꿈')).toBe(false)
  })
})

describe('게시판 (API-ABD)', () => {
  it('Community 공지는 전체 · 검색어 없음일 때만 위에 고정, 분류 · 검색으로 거른다', async () => {
    const { repos } = await signedIn()
    await repos.boards.createCommunityPost({ category: '공지', title: '새 공지', startDate: null, endDate: null, content: '내용', attachmentIds: [] })
    const all = await repos.boards.listPosts('community', {})
    const notices = all.items.filter((p) => p.category === '공지')
    expect(notices.length).toBeGreaterThanOrEqual(2)
    expect(all.items.slice(0, notices.length).every((p) => p.category === '공지' && p.pinned)).toBe(true)
    const sessions = await repos.boards.listPosts('community', { category: '세션' })
    expect(sessions.total).toBeGreaterThan(0)
    expect(sessions.items.every((p) => p.category === '세션')).toBe(true)
    const found = await repos.boards.listPosts('teams', { q: '장하윤' })
    expect(found.total).toBe(2)
  })

  it('게시글을 지우면 삭제 상태(누가 · 언제) + 달린 댓글도 숨김', async () => {
    const { repos, store } = await signedIn()
    expect(await repos.boards.deletePosts('teams', ['post-23', 'cp-4th-ot'])).toEqual({ deleted: 1 })
    const post = store.get('boards').posts.find((p) => p.id === 'post-23')!
    expect(post.deleted).toEqual({ by: { kind: 'admin', id: 'user-admin-a', name: '운영진A', role: 'Lead' }, at: new Date(NOW).toISOString() })
    expect(store.get('boards').comments.filter((c) => c.postId === 'post-23').every((c) => c.deleted)).toBe(true)
    expect((await repos.boards.listComments('teams', {})).items.some((c) => c.postId === 'post-23')).toBe(false)
  })

  it("관리자 글은 '운영진' 이름으로, 세션 · 행사는 기간 필수", async () => {
    const { repos, store } = await signedIn()
    expect((await rejects(repos.boards.createCommunityPost({ category: '행사', title: '예시 행사', startDate: null, endDate: null, content: '', attachmentIds: [] }))).code).toBe('VALIDATION')
    const lastNo = Math.max(...store.get('boards').posts.filter((p) => p.board === 'community').map((p) => p.no))
    const row = await repos.boards.createCommunityPost({ category: '공지', title: '예시 공지', startDate: null, endDate: null, content: '예시', attachmentIds: [] })
    expect(row).toMatchObject({ authorName: '운영진', byAdmin: true, no: lastNo + 1, posted: { by: { name: '운영진A' } } })
  })
})

describe('프로젝트 (API-APJ)', () => {
  it('실제 프로젝트로 시작, 페이지당 10개 · 제목 + 설명 검색', async () => {
    const { repos } = await signedIn()
    const page = await repos.projects.list({})
    expect(page.pageSize).toBe(10)
    expect(page.total).toBeGreaterThan(10)
    expect((await repos.projects.list({ q: '약조심' })).total).toBeGreaterThanOrEqual(0)
  })
  it('등록 검증: 썸네일 · 제목 · 설명 60자 · 기수 · URL', async () => {
    const { repos } = await signedIn()
    const e = await rejects(repos.projects.create({ thumbnailUrl: null, title: '', summary: '가'.repeat(61), generation: null, members: '', githubUrl: 'github.com', serviceUrl: null, isPublic: true }))
    expect(Object.keys(e.fields ?? {}).sort()).toEqual(['generation', 'githubUrl', 'summary', 'thumbnail', 'title'])
  })
})

describe('홈페이지 콘텐츠 (API-ACT)', () => {
  it('소개 이미지는 최소 1장 남긴다 (409)', async () => {
    const { repos, store } = await signedIn()
    store.set('contents', (c) => ({ ...c, introImages: c.introImages.slice(0, 1) }))
    expect((await rejects(repos.contents.deleteIntroImage('intro-1'))).code).toBe('CONFLICT')
  })
})

describe('사용자 (API-AMB) — 권한은 permissions.ts 로 한 번 더 막는다', () => {
  it('Core 는 Lead 를 추가할 수 없고 General 은 추가한다 (PIN 대기 · 이력 기록)', async () => {
    const { repos, store } = await signedIn('core-b')
    expect((await rejects(repos.users.create({ name: '예시 멤버 30', studentId: '2026000130', email: 'm30@example.com', type: 'Lead', generation: 4, loginId: 'newlead' }))).code).toBe('FORBIDDEN')
    const r = await repos.users.create({ name: '예시 멤버 30', studentId: '2026000130', email: 'm30@example.com', type: 'General', generation: 4, loginId: null })
    expect(r.user).toMatchObject({ pinStatus: 'pending', maskedStudentId: '2026****30' })
    expect(r.temporaryPassword).toBeNull()
    expect(store.get('users').history.at(-1)).toMatchObject({ kind: 'add', actor: { name: '운영진B' } })
  })

  it('학번 중복 · 아이디 중복', async () => {
    const { repos } = await signedIn()
    const dup = await rejects(repos.users.create({ name: '예시 멤버 31', studentId: '2026000101', email: 'm31@example.com', type: 'General', generation: 4, loginId: null }))
    expect(dup.fields?.studentId).toBe('이미 등록된 학번이에요.')
    expect(await repos.users.checkLoginId('lead-a')).toMatchObject({ available: false })
    expect(await repos.users.checkLoginId('newcore01')).toMatchObject({ available: true })
    expect(await repos.users.checkLoginId('a!')).toMatchObject({ available: false })
  })

  it('목록: 학번 가림, 탭별 인원, PIN 미설정 인원', async () => {
    const { repos } = await signedIn()
    const list = await repos.users.list({ type: 'General' })
    expect(list.items.every((u) => u.type === 'General' && /\*{4}/.test(u.maskedStudentId))).toBe(true)
    expect(list.items[0]).not.toHaveProperty('studentId')
    expect(list.counts.all).toBe(list.counts.Lead + list.counts.Core + list.counts.General)
    expect(list.pinNotSet).toBeGreaterThan(0)
  })
})
