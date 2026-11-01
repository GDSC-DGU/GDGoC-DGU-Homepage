import type { ContentsState, IntroImage, Review, ReviewInput } from './types'

/** 홈페이지 콘텐츠 저장소 (메서드 하나 = 명세서 API 하나). 주인: 2단계 콘텐츠 담당 */
export interface ContentsRepository {
  /** API-ACT-001 GET /api/admin/contents — 비공개 리뷰 포함 */
  get(): Promise<ContentsState>
  /** API-ACT-002 POST /api/admin/contents/intro-images { fileId } — 맨 뒤에 추가, 최대 8장 */
  addIntroImage(fileId: string): Promise<IntroImage>
  /** API-ACT-003 PATCH /api/admin/contents/intro-images/order { imageIds[] } — 지금 있는 이미지 전부를 표시 순서대로 (다르면 409) */
  reorderIntroImages(imageIds: string[]): Promise<void>
  /** API-ACT-004 DELETE /api/admin/contents/intro-images/{imageId} — 마지막 1장은 삭제 불가 (409) */
  deleteIntroImage(imageId: string): Promise<void>
  /** API-ACT-005 POST /api/admin/contents/reviews */
  addReview(input: ReviewInput): Promise<Review>
  /** API-ACT-006 PUT /api/admin/contents/reviews/{reviewId} */
  updateReview(reviewId: string, input: ReviewInput): Promise<Review>
  /** API-ACT-007 DELETE /api/admin/contents/reviews/{reviewId} — 사진도 함께 삭제 */
  deleteReview(reviewId: string): Promise<void>
  /** API-ACT-008 PUT /api/admin/contents/recruit-poster { fileId } */
  setPoster(fileId: string): Promise<void>
}
