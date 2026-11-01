import { exampleImage, seedTools, type SeedContext } from '../common/seedContext'
import type { ContentsState, Review } from './types'

/** seed 모양을 바꾸면 1 올린다 */
export const CONTENTS_SEED_VERSION = 2

/**
 * 리뷰 예시 사진: 작은 원 안에서도 읽히게 큰 '예시' 글자 (사람 사진처럼 보이지 않게 단색 면 + 글자만).
 */
function examplePhoto(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" fill="#E3E6EA"/><text x="80" y="84" fill="#474C55" font-family="Pretendard, sans-serif" font-size="56" font-weight="700" text-anchor="middle" dominant-baseline="middle">예시</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/**
 * 홈페이지 콘텐츠 예시 데이터.
 * 실제 활동 사진 · 후기는 쓰지 않는다: 소개 이미지 · 포스터 · 리뷰 사진은 '예시' 글자 그림(SVG), 리뷰는 '예시 멤버' 이름 + 예시 티가 나는 문장.
 * 소개 이미지 5장(최대 8장), 리뷰 6개(공개 4 · 비공개 2, 사진 있음 3 · 없음 3), 모집 포스터 1장.
 * 주인: 2단계 콘텐츠 담당.
 */
export function createContentsSeed(ctx: SeedContext): ContentsState {
  const { ago, by } = seedTools(ctx)
  const introAt = ago({ days: 6, hours: 4 })
  const reviewAt = ago({ days: 3, hours: 2 })
  const posterAt = ago({ days: 12, hours: 1 })

  const review = (id: string, generation: number, name: string, track: string, content: string, isPublic: boolean, withPhoto: boolean, who: 'A' | 'B' | 'C', at: string): Review => ({
    id,
    photoUrl: withPhoto ? examplePhoto() : null,
    generation,
    name,
    track,
    content,
    isPublic,
    created: by(who, at),
    updated: null,
  })

  return {
    introImages: [1, 2, 3, 4, 5].map((n) => ({
      id: `intro-${n}`,
      url: exampleImage(`예시 소개 이미지 ${n}`),
      alt: `예시 소개 이미지 ${n}`,
      created: by('A', ago({ days: 20 - n, hours: 2 })),
    })),
    reviews: [
      review('review-1', 3, '예시 멤버 01', 'Frontend', '예시 후기입니다. 실제 멤버의 후기가 아니며, 화면을 보여 주려고 만든 문장입니다.', true, true, 'A', ago({ days: 30 })),
      review('review-2', 3, '예시 멤버 02', 'Backend', '예시 후기입니다. 비공개 상태라 홈에는 보이지 않는 예시입니다.', false, false, 'B', ago({ days: 29 })),
      review('review-3', 3, '예시 멤버 03', 'AI', '예시 후기입니다. 세션과 프로젝트를 함께 하며 배운 점을 적는 자리입니다.', true, false, 'A', ago({ days: 20 })),
      review('review-4', 2, '예시 멤버 04', 'Design', '예시 후기입니다. 사진이 있는 리뷰는 홈 카드에 원형 사진으로 보입니다.', true, true, 'C', ago({ days: 14 })),
      review('review-5', 2, '예시 멤버 05', 'Mobile', '예시 후기입니다. 후기는 200자까지 쓸 수 있고, 주인공의 동의를 받은 후기만 올립니다.', true, false, 'B', ago({ days: 7 })),
      review('review-6', 1, '예시 멤버 06', 'Cloud', '예시 후기입니다. 동의 확인을 기다리는 중이라 비공개로 둔 예시입니다.', false, true, 'A', reviewAt),
    ],
    poster: { url: exampleImage('예시 모집 포스터', { width: 1080, height: 1350 }), alt: '예시 모집 포스터' },
    changes: { introImages: by('A', introAt), reviews: by('A', reviewAt), poster: by('B', posterAt) },
  }
}
