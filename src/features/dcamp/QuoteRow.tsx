import type { Voice } from '@/content/story'
import { QuoteMark } from '@/features/common/Glyphs'
import s from './quoteRow.module.css'

/**
 * 후기 한 줄 (dcamp '배치 참여 후기'): 검정 면, 따옴표 · 글 · 소속 | 이름을 세로 괘선으로 나눠 옆으로 늘어놓는다 (옆으로 넘김).
 * 글은 본인 회고 원문 그대로 (content/story.ts voices, 공개 동의 기록이 있는 것만).
 */
export function QuoteRow({ title, voices }: { title: string; voices: readonly Voice[] }) {
  if (voices.length === 0) return null
  return (
    <section className={`on-dark ${s.row}`} data-band="dark" aria-labelledby="quotes-title">
      <div className="container">
        <h2 id="quotes-title" className={s.title}>
          {title}
        </h2>
        <ul className={s.list} tabIndex={0} aria-label={title}>
          {voices.map((v) => (
            <li key={v.id} className={s.item}>
              <figure className={s.fig}>
                <QuoteMark className={s.mark} />
                <blockquote className={s.quote}>
                  {v.headline && <p className={s.headline}>{v.headline}</p>}
                  <p>{v.quote}</p>
                </blockquote>
                <figcaption className={s.who}>
                  <span className={s.part}>{v.part} 파트</span>
                  <span className={s.name}>{v.name}</span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
