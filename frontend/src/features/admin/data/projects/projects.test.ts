import { beforeAll, describe, expect, it } from 'vitest'
import { PROJECTS, PUBLIC_PROJECTS } from '@/content'
import { createSessionStore } from '../auth/session'
import type { AdminRepoError } from '../common/errors'
import { setMockOptions } from '../common/mockContext'
import { createMockAdminRepositories } from '../repositories'
import { createAdminStore, memoryStorage } from '../store'
import { normalizeProjectInput, validateProjectInput } from './mockRepository'
import { createProjectsSeed } from './seed'
import type { ProjectInput } from './types'

const NOW = Date.parse('2026-11-01T03:00:00Z')
beforeAll(() => setMockOptions({ latency: [0, 0], failureRate: 0 }))

async function signedIn() {
  const storage = memoryStorage()
  const store = createAdminStore({ storage, now: () => NOW })
  const repos = createMockAdminRepositories({ store, session: createSessionStore(storage), now: () => NOW })
  await repos.auth.login({ loginId: 'lead-a', password: 'example1234' })
  return { store, repos }
}
const rejects = (p: Promise<unknown>) =>
  p.then(
    () => {
      throw new Error('실패해야 합니다')
    },
    (e: AdminRepoError) => e,
  )
const valid = (extra: Partial<ProjectInput> = {}): ProjectInput => ({
  thumbnailUrl: 'blob:example',
  title: '예시 프로젝트',
  summary: '예시 설명입니다.',
  generation: 4,
  members: '',
  githubUrl: null,
  serviceUrl: null,
  isPublic: true,
  ...extra,
})

describe('프로젝트 seed = 저장소의 실제 프로젝트', () => {
  const seed = createProjectsSeed({ now: NOW })
  it('모두 옮기고, 공개 여부는 공개 Projects 페이지와 같다 (비공개도 있음)', () => {
    expect(seed.projects).toHaveLength(PROJECTS.length)
    expect(seed.projects.filter((p) => p.isPublic).map((p) => p.id).sort()).toEqual(PUBLIC_PROJECTS.map((p) => p.id).sort())
    expect(seed.projects.some((p) => !p.isPublic)).toBe(true)
  })
  it('그림 경로는 저장소 그림 그대로', () => {
    const withCover = PROJECTS.filter((p) => p.cover)
    for (const p of withCover) expect(seed.projects.find((x) => x.id === p.id)?.thumbnailUrl).toBe(`/${p.cover!.src}`)
  })
})

describe('프로젝트 목록 (F-APJ-001 · 002, API-APJ-001)', () => {
  it('비공개 포함 최신 등록순 10개씩, 전체 개수', async () => {
    const { repos } = await signedIn()
    const page = await repos.projects.list({})
    expect(page).toMatchObject({ page: 1, pageSize: 10, total: PROJECTS.length })
    const times = page.items.map((p) => p.createdAt)
    expect([...times].sort().reverse()).toEqual(times)
    const all = await repos.projects.list({ pageSize: 100 })
    expect(all.items.some((p) => !p.isPublic)).toBe(true)
  })

  it('검색은 제목 + 설명, 없으면 0개', async () => {
    const { repos } = await signedIn()
    const byTitle = await repos.projects.list({ q: 'AgriGuard' })
    expect(byTitle.items.map((p) => p.id)).toContain('agriguard')
    const bySummary = await repos.projects.list({ q: '작물 질병' })
    expect(bySummary.items.map((p) => p.id)).toContain('agriguard')
    expect((await repos.projects.list({ q: '없는 프로젝트 이름' })).total).toBe(0)
  })
})

describe('프로젝트 등록 · 수정 · 삭제 (F-APJ-003~006)', () => {
  it('입력 확인: 썸네일 · 제목 · 설명(60자) · 기수 필수, URL 은 쓰면 형식 확인', () => {
    expect(validateProjectInput(valid())).toEqual({})
    expect(validateProjectInput(valid({ summary: '가'.repeat(60) }))).toEqual({})
    expect(validateProjectInput(valid({ summary: '가'.repeat(61) }))).toHaveProperty('summary')
    expect(validateProjectInput(valid({ githubUrl: '  ', serviceUrl: '' }))).toEqual({})
    expect(Object.keys(validateProjectInput(valid({ githubUrl: 'github.com/x', serviceUrl: 'ftp://x' }))).sort()).toEqual(['githubUrl', 'serviceUrl'])
    expect(normalizeProjectInput(valid({ title: ' 예시 ', githubUrl: ' https://github.com/x ', serviceUrl: ' ' }))).toMatchObject({ title: '예시', githubUrl: 'https://github.com/x', serviceUrl: null })
  })

  it('등록: 공개 기본값 · 등록한 계정 · 시각, 목록 맨 위', async () => {
    const { repos } = await signedIn()
    const created = await repos.projects.create(valid({ isPublic: false, members: '예시 멤버 01, 예시 멤버 02' }))
    expect(created).toMatchObject({ title: '예시 프로젝트', isPublic: false, created: { by: { name: '운영진A' }, at: new Date(NOW).toISOString() }, updated: null })
    expect(created.no).toBe(PROJECTS.length + 1)
    expect((await repos.projects.list({})).items[0].id).toBe(created.id)
  })

  it('수정: 공개 여부 · 내용이 바로 바뀌고 수정 기록이 남는다. 없는 프로젝트는 404', async () => {
    const { repos } = await signedIn()
    const before = await repos.projects.get('agriguard')
    const saved = await repos.projects.update('agriguard', { ...before, summary: '예시로 바꾼 설명', isPublic: false })
    expect(saved).toMatchObject({ summary: '예시로 바꾼 설명', isPublic: false, created: before.created, updated: { by: { name: '운영진A' } } })
    expect((await repos.projects.get('agriguard')).isPublic).toBe(false)
    expect((await rejects(repos.projects.get('없음'))).code).toBe('NOT_FOUND')
    expect((await rejects(repos.projects.update('agriguard', { ...before, summary: '' }))).fields).toHaveProperty('summary')
  })

  it('삭제: 삭제 상태로만 (누가 · 언제), 목록 · 수정 화면에서 빠진다', async () => {
    const { repos, store } = await signedIn()
    expect(await repos.projects.remove(['agriguard', 'yakjosim'])).toEqual({ deleted: 2 })
    expect(store.get('projects').projects.find((p) => p.id === 'agriguard')?.deleted?.by).toMatchObject({ name: '운영진A' })
    expect((await repos.projects.list({})).total).toBe(PROJECTS.length - 2)
    expect((await rejects(repos.projects.get('agriguard'))).code).toBe('NOT_FOUND')
    expect(await repos.projects.remove(['agriguard'])).toEqual({ deleted: 0 })
  })
})
