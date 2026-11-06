import { useRef } from 'react'
import { useStaggerReveal } from '@/hooks/useStaggerReveal'
import s from './work.module.css'

export interface WorkCard {
  id: string
  title: string
  body: string
  /** 그림: 회색 판 위 선 그림 + 주황 점 하나 */
  icon: 'calendar' | 'sprint' | 'mic' | 'people' | 'trophy'
}

function Icon({ kind }: { kind: WorkCard['icon'] }) {
  return (
    <svg className={s.icon} viewBox="0 0 48 48" aria-hidden="true">
      {kind === 'calendar' && (
        <>
          <rect x="8" y="11" width="32" height="29" rx="2" />
          <path d="M8 19h32M16 7v8M32 7v8" />
          <circle className={s.dot} cx="30" cy="30" r="3.5" />
        </>
      )}
      {kind === 'sprint' && (
        <>
          <path d="M8 38h32M14 38V26M24 38V18M34 38V10" />
          <circle className={s.dot} cx="34" cy="10" r="3.5" />
        </>
      )}
      {kind === 'mic' && (
        <>
          <rect x="18" y="6" width="12" height="22" rx="6" />
          <path d="M12 22a12 12 0 0 0 24 0M24 34v8M17 42h14" />
          <circle className={s.dot} cx="24" cy="17" r="3" />
        </>
      )}
      {kind === 'people' && (
        <>
          <circle cx="17" cy="17" r="6" />
          <circle cx="33" cy="17" r="6" />
          <path d="M6 38c1.5-7 6-10 11-10s9.5 3 11 10M22 38c1.5-7 6-10 11-10s9.5 3 11 10" />
          <circle className={s.dot} cx="25" cy="9" r="3" />
        </>
      )}
      {kind === 'trophy' && (
        <>
          <path d="M15 8h18v10a9 9 0 0 1-18 0zM15 12H8a6 6 0 0 0 7 7M33 12h7a6 6 0 0 1-7 7M24 27v8M16 41h16l-2-6H18z" />
          <circle className={s.dot} cx="24" cy="15" r="3" />
        </>
      )}
    </svg>
  )
}

/**
 * 하는 일 카드 (dcamp 'How We Work'): 흰 면 위 따뜻한 회색 카드가 가로로 늘어선다 (넓은 화면 네 장, 좁으면 옆으로 넘김).
 * 카드마다 왼쪽 위 작은 선 그림(주황 점 하나) → 제목(20) → 설명(15).
 */
export function WorkCards({ title, cards }: { title: string; cards: readonly WorkCard[] }) {
  const listRef = useRef<HTMLUListElement>(null)
  useStaggerReveal(listRef) // 소개 페이지의 순차 등장은 여기 한 곳
  return (
    <section className={s.work} aria-labelledby="work-title">
      <div className="container">
        <h2 id="work-title" className={s.title} lang="en">
          {title}
        </h2>
        <ul ref={listRef} className={s.cards} tabIndex={0} aria-label={title}>
          {cards.map((c) => (
            <li key={c.id} className={s.card}>
              <Icon kind={c.icon} />
              <h3 className={s.cardTitle}>{c.title}</h3>
              <p className={s.cardBody}>{c.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
