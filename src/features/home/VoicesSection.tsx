import { useId, useRef, useState } from 'react'
import { VOICES, voices, type Voice } from '@/content/story'
import { StorySection } from '@/features/common'
import { isShowableVoice, voicesShown } from './homeData'
import { revealElement } from './scrollTo'
import s from './voices.module.css'

/** 처음에 보이는 회고 수 (넓은 화면 한 줄). 나머지는 '회고 더 보기' */
const FIRST = 3

/**
 * 개발 화면(npm run dev)에서만 쓰는 예시: 받은 회고가 아직 없을 때 모양을 보려고 둔다.
 * 공개 사이트(빌드)에는 절대 나오지 않는다 (지어낸 후기 금지, docs/DESIGN.md 1 · 10장). 줄마다 '예시' 표시가 붙는다.
 */
const DEV_SAMPLES: Voice[] = [1, 2, 3, 4].map((n) => ({
  id: `sample-${n}`,
  quote: `예시 회고 ${n}입니다. 받은 회고를 src/content/story.ts 의 voices 에 넣으면 이 줄은 사라집니다.`,
  name: `예시 멤버 ${String(n).padStart(2, '0')}`,
  part: ['Frontend', 'Backend', 'AI/ML', 'Product Design'][n - 1],
  consent: { date: '0000-00-00', by: '예시' },
}))

function VoiceItem({ v, sample }: { v: Voice; sample: boolean }) {
  return (
    <li className={s.item}>
      <figure className={s.figure}>
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
 * 멤버 회고 (AI 티 점검 2026-11-05: 저절로 넘어가는 'Interview' 카드 대신 한 번에 읽히는 목록).
 * 지난 기수 멤버가 활동을 마치고 쓴 회고에서 본인 문장을 그대로 옮긴다 (content/story.ts voices).
 * 공개 동의가 기록된 회고만 싣고, 하나도 없으면 공개 사이트에서는 섹션째 그리지 않는다.
 * 넓은 화면 세 칸, 처음엔 세 사람 → '회고 더 보기'로 나머지를 펼친다. 상자 · 그림자 · 따옴표 장식 없이 위 괘선 한 줄.
 */
export function VoicesSection() {
  const real = voices.filter(isShowableVoice)
  const sample = real.length === 0 && import.meta.env.DEV
  const all = sample ? DEV_SAMPLES : real
  const [open, setOpen] = useState(false)
  const listId = useId()
  const btnRef = useRef<HTMLButtonElement>(null)
  if (all.length === 0) return null
  const shown = voicesShown(all, open, FIRST)
  const rest = all.length - FIRST
  return (
    <StorySection id="reviews" tone="field" title={VOICES.title} sub={VOICES.sub}>
      <ul id={listId} className={s.list}>
        {shown.map((v) => (
          <VoiceItem key={v.id} v={v} sample={sample} />
        ))}
      </ul>
      {rest > 0 && (
        <div className={s.more}>
          <button
            ref={btnRef}
            type="button"
            className="btn-secondary"
            aria-expanded={open}
            aria-controls={listId}
            onClick={() => {
              const closing = open
              setOpen(!open)
              // 접으면 목록이 짧아져 누른 단추가 화면 위로 사라진다: 단추가 보이게 맞춘다 (QA 2026-11-05)
              if (closing) requestAnimationFrame(() => btnRef.current && revealElement(btnRef.current, 'center'))
            }}
          >
            {open ? (
              '회고 접기'
            ) : (
              <span>
                회고 <span className="num">{rest}</span>개 더 보기
              </span>
            )}
          </button>
        </div>
      )}
    </StorySection>
  )
}
