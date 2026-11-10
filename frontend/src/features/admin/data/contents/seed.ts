import { voices } from '@/content/story'
import { exampleImage, seedTools, type SeedContext } from '../common/seedContext'
import type { ContentsState, Review } from './types'

/** seed 모양을 바꾸면 1 올린다 */
export const CONTENTS_SEED_VERSION = 3

/**
 * 홈페이지 콘텐츠 처음 데이터.
 * - 지난 기수 리뷰: 공개 홈 Interview 와 같은 리뷰(content/story.ts voices, 공개 동의가 기록된 것만). 이름 · 파트 · 문장 · 순서가 같다.
 *   기수는 voices 에 적힌 것만 (홈도 확인되지 않은 기수를 붙이지 않는다), 사진은 없다(기본 이미지)
 * - 홈 소개 이미지 · 모집 포스터: 공개 사이트에 아직 그 자리가 없어 예시 그림. 프로토타입 보기에서는 화면에서 숨긴다 (ContentsPage)
 * 주인: 2단계 콘텐츠 담당.
 */
export function createContentsSeed(ctx: SeedContext): ContentsState {
  const { ago, by } = seedTools(ctx)
  const introAt = ago({ days: 6, hours: 4 })
  const posterAt = ago({ days: 12, hours: 1 })

  // 공개 동의를 받은 날 10:00 (KST) 에 홈 순서대로 등록 (동의가 기록된 리뷰만 홈에 나온다: home/homeData isShowableVoice 와 같은 조건)
  const shown = voices.filter((v) => v.quote.trim() && v.name.trim() && v.consent?.date && v.consent.by)
  const reviews: Review[] = shown.map((v, i) => ({
    id: `review-${v.id}`,
    photoUrl: null,
    generation: v.generation ?? null,
    name: v.name,
    track: v.part,
    content: v.quote,
    isPublic: true,
    created: by('A', new Date(Date.parse(`${v.consent.date}T10:00:00+09:00`) + i * 60_000).toISOString()),
    updated: null,
  }))
  const reviewAt = reviews.at(-1)?.created.at ?? ago({ days: 3 })

  return {
    introImages: [1, 2, 3, 4, 5].map((n) => ({
      id: `intro-${n}`,
      url: exampleImage(`예시 소개 이미지 ${n}`),
      alt: `예시 소개 이미지 ${n}`,
      created: by('A', ago({ days: 20 - n, hours: 2 })),
    })),
    reviews,
    poster: { url: exampleImage('예시 모집 포스터', { width: 1080, height: 1350 }), alt: '예시 모집 포스터' },
    changes: { introImages: by('A', introAt), reviews: by('A', reviewAt), poster: by('B', posterAt) },
  }
}
