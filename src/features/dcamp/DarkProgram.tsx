import type { ReactNode } from 'react'
import s from './darkProgram.module.css'

export interface GlassStat {
  label: string
  value: ReactNode
}
export interface DarkCard {
  id: string
  title: string
  lines: readonly ReactNode[]
  icon: 'calendar' | 'sprint' | 'mic' | 'people' | 'monitor' | 'star'
}

function SquareIcon({ kind }: { kind: DarkCard['icon'] }) {
  return (
    <span className={s.sq} aria-hidden="true">
      <svg viewBox="0 0 24 24">
        {kind === 'calendar' && <path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" />}
        {kind === 'sprint' && <path d="M4 20h16M7 20v-6M12 20V9M17 20V4" />}
        {kind === 'mic' && <path d="M9 3h6v10H9zM6 11a6 6 0 0 0 12 0M12 17v4" />}
        {kind === 'people' && <path d="M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM15.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c.8-3.5 3-5 5.5-5s4.7 1.5 5.5 5M10 20c.8-3.5 3-5 5.5-5s4.7 1.5 5.5 5" />}
        {kind === 'monitor' && <path d="M3 5h18v11H3zM9 20h6M12 16v4" />}
        {kind === 'star' && <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />}
      </svg>
    </span>
  )
}

/**
 * 검정 프로그램 띠 (dcamp batch 가운데): 검정 위 주황 · 파랑 빛줄기 → 주황 이름표 · 큰 흰 제목 → 반투명 숫자 카드 세 장
 * → '주요 활동' 검정 카드 여섯 장 (주황 네모 아이콘 · 제목 · • 줄).
 */
export function DarkProgram({
  id,
  eyebrow,
  title,
  stats,
  statNote,
  cardsTitle,
  cards,
  children,
}: {
  id: string
  eyebrow: string
  title: ReactNode
  stats: readonly GlassStat[]
  statNote?: string
  cardsTitle: string
  cards: readonly DarkCard[]
  children?: ReactNode
}) {
  return (
    <section id={id} className={`on-dark ${s.band}`} data-band="dark" aria-labelledby={`${id}-title`}>
      <div className={s.light} aria-hidden="true" />
      <div className={`container ${s.inner}`}>
        <p className={s.eyebrow}>{eyebrow}</p>
        <h2 id={`${id}-title`} className={s.title}>
          {title}
        </h2>
        <ul className={s.stats}>
          {stats.map((st) => (
            <li key={st.label} className={s.glass}>
              <span className={s.glassLabel}>{st.label}</span>
              <span className={s.glassValue}>{st.value}</span>
            </li>
          ))}
        </ul>
        {statNote && <p className={s.statNote}>{statNote}</p>}

        <h3 className={s.cardsTitle}>{cardsTitle}</h3>
        <ul className={s.cards}>
          {cards.map((c) => (
            <li key={c.id} className={s.card}>
              <SquareIcon kind={c.icon} />
              <h4 className={s.cardTitle}>{c.title}</h4>
              <ul className={s.lines}>
                {c.lines.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        {children}
      </div>
    </section>
  )
}
