import { VOICES, voices, type Voice } from '@/content/story'
import { isShowableVoice } from './homeData'
import { ReviewCarousel } from './ReviewCarousel'
import s from './voices.module.css'

/**
 * 개발 화면(npm run dev)에서만 쓰는 예시 카드: 받은 리뷰가 아직 없을 때 넘어가는 모양을 보려고 둔다.
 * 공개 사이트(빌드)에는 절대 나오지 않는다 (지어낸 후기 금지, docs/DESIGN.md 1 · 10장). 카드마다 '예시' 표시가 붙는다.
 */
const DEV_SAMPLES: Voice[] = [1, 2, 3, 4, 5].map((n) => ({
  id: `sample-${n}`,
  quote: `예시 리뷰 ${n}입니다. 받은 리뷰를 src/content/story.ts 의 voices 에 넣으면 이 카드는 사라지고 실제 리뷰가 보입니다.`,
  name: `예시 멤버 ${String(n).padStart(2, '0')}`,
  part: ['Frontend', 'Backend', 'AI/ML', 'Product Design', 'Frontend'][n - 1],
  generation: n <= 2 ? 3 : n <= 4 ? 2 : 1,
  consent: { date: '0000-00-00', by: '예시' },
}))

/**
 * Interview: 지난 기수 멤버가 직접 쓴 리뷰가 자동으로 넘어간다 (content/story.ts 의 voices).
 * 공개 동의가 기록된 리뷰만 싣고, 하나도 없으면 공개 사이트에서는 섹션째 그리지 않는다.
 * 옅은 회색 면. 넓은 화면은 왼쪽 제목 · 번호 · 버튼 | 오른쪽 한 사람 카드 (ReviewCarousel).
 */
export function VoicesSection() {
  const real = voices.filter(isShowableVoice)
  const sample = real.length === 0 && import.meta.env.DEV
  const shown = sample ? DEV_SAMPLES : real
  if (shown.length === 0) return null
  return (
    <section id="reviews" className={`story field ${s.section}`} aria-labelledby="reviews-title">
      <ReviewCarousel
        voices={shown}
        sample={sample}
        head={
          <header className={s.head}>
            <h2 id="reviews-title" className={s.title} lang="en">
              {VOICES.title}
            </h2>
            <p className={s.sub}>{VOICES.sub}</p>
          </header>
        }
      />
    </section>
  )
}
