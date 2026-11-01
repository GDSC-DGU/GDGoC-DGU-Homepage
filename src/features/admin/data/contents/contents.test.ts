import { beforeAll, describe, expect, it } from 'vitest'
import { createSessionStore } from '../auth/session'
import type { AdminRepoError } from '../common/errors'
import { setMockOptions } from '../common/mockContext'
import { createMockAdminRepositories } from '../repositories'
import { createAdminStore, memoryStorage } from '../store'
import { INTRO_IMAGE_MAX, moveItem, validateReviewInput } from './mockRepository'
import { createContentsSeed } from './seed'
import type { ReviewInput } from './types'

const NOW = Date.parse('2026-11-01T03:00:00Z')
beforeAll(() => setMockOptions({ latency: [0, 0], failureRate: 0 }))

async function signedIn() {
  const storage = memoryStorage()
  const store = createAdminStore({ storage, now: () => NOW })
  const repos = createMockAdminRepositories({ store, session: createSessionStore(storage), now: () => NOW })
  await repos.auth.login({ loginId: 'core-b', password: 'example1234' })
  const png = (name = '예시.png') => repos.uploads.upload(new File(['png'], name, { type: 'image/png' }), 'introImage')
  return { store, repos, png }
}
const rejects = (p: Promise<unknown>) =>
  p.then(
    () => {
      throw new Error('실패해야 합니다')
    },
    (e: AdminRepoError) => e,
  )
const review = (extra: Partial<ReviewInput> = {}): ReviewInput => ({ photoFileId: null, generation: 4, name: '예시 멤버 09', track: 'Frontend', content: '예시 후기입니다.', isPublic: true, ...extra })

describe('홈페이지 콘텐츠 seed', () => {
  const seed = createContentsSeed({ now: NOW })
  it('소개 이미지 · 리뷰(공개 · 비공개, 사진 있음 · 없음) · 포스터 · 영역별 마지막 변경', () => {
    expect(seed.introImages.length).toBeGreaterThan(1)
    expect(seed.introImages.length).toBeLessThanOrEqual(INTRO_IMAGE_MAX)
    expect(new Set(seed.reviews.map((r) => r.isPublic))).toEqual(new Set([true, false]))
    expect(new Set(seed.reviews.map((r) => r.photoUrl === null))).toEqual(new Set([true, false]))
    expect(seed.reviews.every((r) => r.content.length <= 200)).toBe(true)
    expect(seed.poster).not.toBeNull()
    expect(seed.changes.introImages && seed.changes.reviews && seed.changes.poster).toBeTruthy()
  })
})

describe('순서 바꾸기 (F-ACT-003)', () => {
  it('moveItem: 앞으로 · 뒤로, 범위 밖은 그대로', () => {
    expect(moveItem(['a', 'b', 'c'], 1, 0)).toEqual(['b', 'a', 'c'])
    expect(moveItem(['a', 'b', 'c'], 1, 2)).toEqual(['a', 'c', 'b'])
    expect(moveItem(['a', 'b', 'c'], 0, -1)).toEqual(['a', 'b', 'c'])
    expect(moveItem(['a', 'b', 'c'], 2, 3)).toEqual(['a', 'b', 'c'])
  })

  it('저장소: 순서대로 저장하고 변경자를 남긴다. 목록이 다르면 409', async () => {
    const { repos } = await signedIn()
    const ids = (await repos.contents.get()).introImages.map((i) => i.id)
    const next = moveItem(ids, ids.length - 1, 0)
    await repos.contents.reorderIntroImages(next)
    const after = await repos.contents.get()
    expect(after.introImages.map((i) => i.id)).toEqual(next)
    expect(after.changes.introImages).toMatchObject({ by: { name: '운영진B' }, at: new Date(NOW).toISOString() })
    expect((await rejects(repos.contents.reorderIntroImages(next.slice(1)))).code).toBe('CONFLICT')
  })
})

describe('홈 소개 이미지 추가 · 삭제 (F-ACT-002 · 004)', () => {
  it('맨 뒤에 추가, 최대 8장', async () => {
    const { repos, store, png } = await signedIn()
    const start = store.get('contents').introImages.length
    const f = await png('예시_추가.png')
    const added = await repos.contents.addIntroImage(f.fileId)
    expect(store.get('contents').introImages.at(-1)?.id).toBe(added.id)
    for (let i = start + 1; i < INTRO_IMAGE_MAX; i++) await repos.contents.addIntroImage((await png()).fileId)
    expect(store.get('contents').introImages).toHaveLength(INTRO_IMAGE_MAX)
    const e = await rejects(repos.contents.addIntroImage((await png()).fileId))
    expect(e).toMatchObject({ code: 'CONFLICT', message: '소개 이미지는 최대 8장까지 올릴 수 있습니다.' })
  })

  it('JPG · PNG 5MB 이하만 올라간다', async () => {
    const { repos } = await signedIn()
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' })
    expect((await rejects(repos.uploads.upload(big, 'introImage'))).message).toBe('JPG · PNG 이미지만, 5MB 이하로 올릴 수 있어요.')
    expect((await rejects(repos.uploads.upload(new File(['x'], 'a.webp', { type: 'image/webp' }), 'introImage'))).code).toBe('VALIDATION')
  })

  it('삭제하면 빠지고, 마지막 1장은 지울 수 없다 (409)', async () => {
    const { repos, store } = await signedIn()
    const ids = store.get('contents').introImages.map((i) => i.id)
    for (const id of ids.slice(1)) await repos.contents.deleteIntroImage(id)
    expect(store.get('contents').introImages.map((i) => i.id)).toEqual([ids[0]])
    const e = await rejects(repos.contents.deleteIntroImage(ids[0]))
    expect(e).toMatchObject({ code: 'CONFLICT', message: '소개 이미지는 최소 1장은 남겨야 합니다.' })
    expect((await rejects(repos.contents.deleteIntroImage(ids[1]))).code).toBe('NOT_FOUND')
  })
})

describe('리뷰 (F-ACT-005 · 007~009)', () => {
  it('입력 확인: 기수 · 이름 · 트랙/파트 · 후기 필수, 후기 200자', () => {
    expect(validateReviewInput(review())).toEqual({})
    expect(validateReviewInput(review({ content: '가'.repeat(200) }))).toEqual({})
    expect(validateReviewInput(review({ content: '가'.repeat(201) }))).toEqual({ content: '후기는 200자 이내로 써 주세요.' })
    expect(Object.keys(validateReviewInput(review({ generation: 0, name: ' ', track: '', content: '' }))).sort()).toEqual(['content', 'generation', 'name', 'track'])
  })

  it('추가 (사진 선택 · 공개 기본값) → 수정 (기존 사진 유지 · 공개 끄기) → 삭제, 변경자 기록', async () => {
    const { repos } = await signedIn()
    const photo = await repos.uploads.upload(new File(['p'], '예시사진.jpg', { type: 'image/jpeg' }), 'reviewPhoto')
    const added = await repos.contents.addReview(review({ photoFileId: photo.fileId }))
    expect(added).toMatchObject({ photoUrl: photo.url, isPublic: true, created: { by: { name: '운영진B' } }, updated: null })
    const edited = await repos.contents.updateReview(added.id, review({ photoFileId: null, photoUrl: added.photoUrl, isPublic: false, content: '예시 후기를 고쳤습니다.' }))
    expect(edited).toMatchObject({ photoUrl: photo.url, isPublic: false, content: '예시 후기를 고쳤습니다.', updated: { by: { name: '운영진B' } } })
    const noPhoto = await repos.contents.updateReview(added.id, review({ photoUrl: null }))
    expect(noPhoto.photoUrl).toBeNull()
    await repos.contents.deleteReview(added.id)
    const after = await repos.contents.get()
    expect(after.reviews.some((r) => r.id === added.id)).toBe(false)
    expect(after.changes.reviews?.by).toMatchObject({ name: '운영진B' })
    expect((await rejects(repos.contents.deleteReview(added.id))).code).toBe('NOT_FOUND')
  })

  it('리뷰 사진은 JPG · PNG 2MB 이하', async () => {
    const { repos } = await signedIn()
    const big = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'big.jpg', { type: 'image/jpeg' })
    expect((await rejects(repos.uploads.upload(big, 'reviewPhoto'))).message).toBe('JPG · PNG 이미지만, 2MB 이하로 올릴 수 있어요.')
  })
})

describe('모집 포스터 (F-ACT-006)', () => {
  it('바꾸면 새 그림 + 변경자 · 시각, JPG · PNG 10MB 이하', async () => {
    const { repos } = await signedIn()
    const f = await repos.uploads.upload(new File(['p'], '예시포스터.png', { type: 'image/png' }), 'recruitPoster')
    await repos.contents.setPoster(f.fileId)
    const after = await repos.contents.get()
    expect(after.poster?.url).toBe(f.url)
    expect(after.changes.poster).toMatchObject({ by: { name: '운영진B' }, at: new Date(NOW).toISOString() })
    const big = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' })
    expect((await rejects(repos.uploads.upload(big, 'recruitPoster'))).message).toBe('JPG · PNG 이미지만, 10MB 이하로 올릴 수 있어요.')
  })
})
