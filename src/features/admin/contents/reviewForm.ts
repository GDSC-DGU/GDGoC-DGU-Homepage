import { validateReviewInput } from '../data/contents/mockRepository'

/**
 * 리뷰 팝업(P-ACT-02) 입력 칸. 사진은 새로 올린 것(fileId)과 원래 있던 것(url 만)을 나눠 든다.
 * 테스트: reviewForm.test.ts
 */
export interface ReviewDraft {
  photo: { url: string; fileId: string | null } | null
  /** select 값 ('' = 기수 없이) */
  generation: string
  name: string
  track: string
  content: string
  isPublic: boolean
}

/** 칸별 오류 (예시 저장소 · 서버와 같은 규칙, F-ACT-007 1) */
export function validateReviewForm(d: ReviewDraft): Record<string, string> {
  return validateReviewInput({ photoFileId: null, generation: generationOf(d.generation), name: d.name, track: d.track, content: d.content, isPublic: d.isPublic })
}

/** select 값 → 기수 ('' 이면 null) */
export const generationOf = (v: string): number | null => (v ? Number(v) : null)

/** 홈 공개 · 비공개 수 ('공개 4 · 비공개 2') */
export function publicSummary(list: readonly { isPublic: boolean }[]): string {
  const on = list.filter((r) => r.isPublic).length
  return `공개 ${on} · 비공개 ${list.length - on}`
}
