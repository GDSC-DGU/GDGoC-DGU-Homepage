import { VOICES, voices, type Voice } from '@/content/story'
import { StorySection } from '@/features/common'
import { isShowableVoice, voiceColumns, VOICE_LIMIT } from './homeData'
import s from './voices.module.css'

/**
 * 개발 화면(npm run dev)에서만 쓰는 예시: 받은 회고가 아직 없을 때 모양을 보려고 둔다.
 * 공개 사이트(빌드)에는 절대 나오지 않는다 (지어낸 후기 금지, docs/DESIGN.md 1 · 10장). 줄마다 '예시' 표시가 붙는다.
 */
const DEV_SAMPLES: Voice[] = [1, 2, 3, 4, 5, 6].map((n) => ({
  id: `sample-${n}`,
  headline: `예시 회고 ${n}의 굵은 한 줄입니다.`,
  quote: `예시 회고 ${n}입니다. 받은 회고를 src/content/story.ts 의 voices 에 넣으면 이 카드는 사라집니다.`,
  name: `예시 멤버 ${String(n).padStart(2, '0')}`,
  part: ['Frontend', 'Backend', 'AI/ML', 'Product Design', 'Community', 'Marketing'][n - 1],
  consent: { date: '0000-00-00', by: '예시' },
}))

function VoiceCard({ v, index, sample }: { v: Voice; index: number; sample: boolean }) {
  // 1 · 5 · 9번째(넓은 화면의 대각선)는 먹색 카드 (4기 Organizer 2026-11-06: 회고가 너무 정적이다)
  const dark = index % 4 === 0
  return (
    <li role="listitem" className={s.item} style={{ order: index }} data-dark={dark || undefined}>
      <figure className={s.card}>
        <span className={s.mark} aria-hidden="true">
          “
        </span>
        {sample && <span className={s.sampleTag}>예시</span>}
        <blockquote className={s.quote}>
          {v.headline && <p className={s.headline}>{v.headline}</p>}
          <p className={s.body}>{v.quote}</p>
        </blockquote>
        <figcaption className={s.who}>
          <span className={s.name}>{v.name}</span>
          <span className={s.meta}>
            {v.generation !== undefined && (
              <>
                <span className="num">{v.generation}</span>기 ·{' '}
              </>
            )}
            {v.part} 파트
          </span>
        </figcaption>
      </figure>
    </li>
  )
}

/**
 * 멤버 회고 (4기 Organizer 2026-11-06: 위 괘선 한 줄짜리 목록은 너무 정적 → 카드 아홉 장을 3 × 3 으로 한 번에).
 * 지난 기수 멤버가 활동을 마치고 쓴 회고에서 본인 문장을 그대로 옮긴다 (content/story.ts voices).
 * 공개 동의가 기록된 회고만 싣고, 하나도 없으면 공개 사이트에서는 섹션째 그리지 않는다.
 * 넓은 화면: 세 줄기에 세 장씩, 가운데 줄기만 조금 내려 엇갈리게 (글 길이가 달라 카드 높이도 다르다). 대각선 세 장은 먹색.
 * 태블릿 · 폰: 한 줄로 옆으로 넘긴다 (읽는 순서는 1 → 9 그대로, li 의 order).
 */
export function VoicesSection() {
  const real = voices.filter(isShowableVoice)
  const sample = real.length === 0 && import.meta.env.DEV
  const all = (sample ? DEV_SAMPLES : real).slice(0, VOICE_LIMIT)
  if (all.length === 0) return null
  const cols = voiceColumns(all, 3)
  return (
    <StorySection id="reviews" tone="field" title={VOICES.title} sub={VOICES.sub}>
      {/* 태블릿 · 폰에서는 옆으로 넘기는 칸이라 키보드로도 닿게 tabIndex (axe scrollable-region-focusable) */}
      <div className={s.cols} role="list" aria-label={VOICES.title} tabIndex={0}>
        {cols.map((col, c) => (
          <ul key={c} className={s.col} role="presentation">
            {col.map(({ item, index }) => (
              <VoiceCard key={item.id} v={item} index={index} sample={sample} />
            ))}
          </ul>
        ))}
      </div>
    </StorySection>
  )
}
