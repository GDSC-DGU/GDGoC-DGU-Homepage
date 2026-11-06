import type { ReactNode } from 'react'
import { Crumbs } from './Crumbs'
import s from './programHero.module.css'

export interface InfoCard {
  id: string
  title: string
  /** 큰 줄 */
  value: ReactNode
  /** 작은 줄들 (• 로 시작) */
  notes?: ReactNode[]
  icon: 'calendar' | 'person' | 'doc'
}

function LineIcon({ kind }: { kind: InfoCard['icon'] }) {
  return (
    <svg className={s.icon} viewBox="0 0 64 64" aria-hidden="true">
      {kind === 'calendar' && <path d="M8 14h48v42H8zM8 24h48M20 8v10M44 8v10" />}
      {kind === 'person' && <path d="M24 6h16v16H24zM8 34h48v22H8z" />}
      {kind === 'doc' && <path d="M12 6h40v52H12zM20 18h24M20 28h24M20 38h14" />}
    </svg>
  )
}

/**
 * 프로그램 머리 (dcamp 'dcamp batch' 페이지 맨 위): 지금 위치 → 주황 영문 이름표 → 제목(36, 두 줄) → 설명 → 알약 단추
 * → 따뜻한 회색 정보 카드 세 장 (제목 · 값 · • 메모, 오른쪽 아래 선 그림).
 */
export function ProgramHero({
  trail,
  eyebrow,
  title,
  lead,
  actions,
  cards,
}: {
  trail: readonly string[]
  eyebrow: ReactNode
  title: ReactNode
  lead?: ReactNode
  actions?: ReactNode
  cards: readonly InfoCard[]
}) {
  return (
    <header className={s.hero}>
      <div className="container">
        <Crumbs trail={trail} />
        <p className={s.eyebrow} lang="en">
          {eyebrow}
        </p>
        <h1 className={s.title}>{title}</h1>
        {lead && <div className={s.lead}>{lead}</div>}
        {actions && <div className={s.actions}>{actions}</div>}
        <ul className={s.cards}>
          {cards.map((c) => (
            <li key={c.id} className={s.card}>
              <h2 className={s.cardTitle}>{c.title}</h2>
              <p className={s.cardValue}>{c.value}</p>
              {c.notes && c.notes.length > 0 && (
                <ul className={s.notes}>
                  {c.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              )}
              <LineIcon kind={c.icon} />
            </li>
          ))}
        </ul>
      </div>
    </header>
  )
}
