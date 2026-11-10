import { AdminRepoError } from '../common/errors'
import { newId } from '../common/list'
import { isoNow, requireActor, respond, type MockContext } from '../common/mockContext'
import type { AuditStamp, FileRef } from '../common/types'
import type { ContentsRepository } from './repository'
import type { IntroImage, Review, ReviewInput } from './types'

/** 홈 소개 이미지 최대 장 수 (F-ACT-002 1) */
export const INTRO_IMAGE_MAX = 8
/** 소개 이미지 최소 장 수 (F-ACT-004 1) */
export const INTRO_IMAGE_MIN = 1
/** 후기 최대 글자 수 (F-ACT-007 1) */
export const REVIEW_CONTENT_MAX = 200

/**
 * 리뷰 입력 확인 (F-ACT-007): 이름 · 트랙/파트 · 후기 필수, 후기 200자 이내.
 * 기수는 선택 (공개 홈은 확인되지 않은 기수를 붙이지 않는다: 4기 Organizer 결정, content/story.ts)
 */
export function validateReviewInput(input: ReviewInput): Record<string, string> {
  const e: Record<string, string> = {}
  if (input.generation !== null && (!Number.isInteger(input.generation) || input.generation < 1)) e.generation = '기수를 다시 골라 주세요.'
  if (!input.name.trim()) e.name = '이름을 입력해 주세요.'
  if (!input.track.trim()) e.track = '트랙 / 파트를 입력해 주세요.'
  if (!input.content.trim()) e.content = '후기를 입력해 주세요.'
  else if (input.content.trim().length > REVIEW_CONTENT_MAX) e.content = `후기는 ${REVIEW_CONTENT_MAX}자 이내로 써 주세요.`
  return e
}

/**
 * 순서 바꾸기 (F-ACT-003): from 자리의 것을 to 자리로 옮긴 새 배열. 범위 밖이면 그대로.
 * 화면의 [앞으로] · [뒤로] 버튼이 쓴다 (드래그 대신 버튼, BRIEF).
 */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return [...list]
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

/** 홈페이지 콘텐츠 예시 저장소 (store 의 contents 칸). 주인: 2단계 콘텐츠 담당 */
export function createMockContentsRepository(ctx: MockContext): ContentsRepository {
  const state = () => ctx.store.get('contents')
  const stamp = (): AuditStamp => ({ by: requireActor(ctx), at: isoNow(ctx) })
  const file = (id: string): FileRef => {
    const f = ctx.files.get(id)
    if (!f) throw new AdminRepoError('NOT_FOUND', '올린 파일을 찾을 수 없습니다. 다시 올려 주세요.')
    return f
  }
  const check = (input: ReviewInput) => {
    const fields = validateReviewInput(input)
    if (Object.keys(fields).length) throw new AdminRepoError('VALIDATION', '입력한 내용을 확인해 주세요.', { fields })
  }
  const photoOf = (input: ReviewInput) => (input.photoFileId ? file(input.photoFileId).url : (input.photoUrl ?? null))
  /**
   * 파일 저장소에서도 지우기 (F-ACT-004 2 · 005 1). 예시 화면에서는 이 브라우저 안 object URL 을 놓아준다.
   * seed 의 예시 그림(data URL)은 놓아줄 것이 없다.
   */
  const discard = (url: string | null | undefined) => {
    if (!url?.startsWith('blob:')) return
    for (const [id, f] of ctx.files) if (f.url === url) ctx.files.delete(id)
    // 화면이 새 목록을 받기 전까지 옛 그림이 잠깐 남아 있으므로 조금 뒤에 놓아준다 (빈 그림이 번쩍이지 않게)
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  return {
    get: () => respond(() => state()),

    addIntroImage: (fileId) =>
      respond(() => {
        const s = stamp()
        if (state().introImages.length >= INTRO_IMAGE_MAX) throw new AdminRepoError('CONFLICT', `소개 이미지는 최대 ${INTRO_IMAGE_MAX}장까지 올릴 수 있습니다.`)
        const f = file(fileId)
        const image: IntroImage = { id: newId('intro'), url: f.url, alt: f.name, created: s }
        ctx.store.set('contents', (c) => ({ ...c, introImages: [...c.introImages, image], changes: { ...c.changes, introImages: s } }))
        return image
      }),

    reorderIntroImages: (imageIds) =>
      respond(() => {
        const s = stamp()
        const current = state().introImages
        // 지금 있는 이미지를 빠짐없이 한 번씩 (다른 사람이 그사이 바꿨으면 다시 불러오게)
        const same = imageIds.length === current.length && new Set(imageIds).size === imageIds.length && current.every((i) => imageIds.includes(i.id))
        if (!same) throw new AdminRepoError('CONFLICT', '그사이 소개 이미지가 바뀌었습니다. 목록을 다시 불러온 뒤 순서를 바꿔 주세요.')
        ctx.store.set('contents', (c) => {
          const byId = new Map(c.introImages.map((i) => [i.id, i]))
          return { ...c, introImages: imageIds.map((id) => byId.get(id)!), changes: { ...c.changes, introImages: s } }
        })
      }),

    deleteIntroImage: (imageId) =>
      respond(() => {
        const s = stamp()
        const target = state().introImages.find((i) => i.id === imageId)
        if (!target) throw new AdminRepoError('NOT_FOUND', '이미 삭제된 이미지입니다.')
        if (state().introImages.length <= INTRO_IMAGE_MIN) throw new AdminRepoError('CONFLICT', '소개 이미지는 최소 1장은 남겨야 합니다.')
        ctx.store.set('contents', (c) => ({ ...c, introImages: c.introImages.filter((i) => i.id !== imageId), changes: { ...c.changes, introImages: s } }))
        discard(target.url)
      }),

    addReview: (input) =>
      respond(() => {
        const s = stamp()
        check(input)
        const review: Review = { id: newId('review'), photoUrl: photoOf(input), generation: input.generation, name: input.name.trim(), track: input.track.trim(), content: input.content.trim(), isPublic: input.isPublic, created: s, updated: null }
        ctx.store.set('contents', (c) => ({ ...c, reviews: [...c.reviews, review], changes: { ...c.changes, reviews: s } }))
        return review
      }),

    updateReview: (reviewId, input) =>
      respond(() => {
        const s = stamp()
        check(input)
        const prev = state().reviews.find((r) => r.id === reviewId)
        if (!prev) throw new AdminRepoError('NOT_FOUND', '리뷰를 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.')
        const next: Review = { ...prev, photoUrl: photoOf(input), generation: input.generation, name: input.name.trim(), track: input.track.trim(), content: input.content.trim(), isPublic: input.isPublic, updated: s }
        ctx.store.set('contents', (c) => ({ ...c, reviews: c.reviews.map((r) => (r.id === reviewId ? next : r)), changes: { ...c.changes, reviews: s } }))
        if (prev.photoUrl !== next.photoUrl) discard(prev.photoUrl)
        return next
      }),

    deleteReview: (reviewId) =>
      respond(() => {
        const s = stamp()
        const target = state().reviews.find((r) => r.id === reviewId)
        if (!target) throw new AdminRepoError('NOT_FOUND', '이미 삭제된 리뷰입니다.')
        ctx.store.set('contents', (c) => ({ ...c, reviews: c.reviews.filter((r) => r.id !== reviewId), changes: { ...c.changes, reviews: s } }))
        // 리뷰 사진도 함께 삭제 (F-ACT-005 1)
        discard(target.photoUrl)
      }),

    setPoster: (fileId) =>
      respond(() => {
        const s = stamp()
        const f = file(fileId)
        const prev = state().poster
        ctx.store.set('contents', (c) => ({ ...c, poster: { url: f.url, alt: '모집 포스터' }, changes: { ...c.changes, poster: s } }))
        discard(prev?.url)
      }),
  }
}
