import type { ReactNode } from 'react'
import { ShareAction } from '@/features/pages/recruits/ShareAction'
import { Crumbs } from './Crumbs'
import s from './darkHero.module.css'

export interface HeroStat {
  label: string
  /** 큰 주황 숫자 (예: '244') */
  value: string
  /** 숫자 뒤 단위 (예: '명') */
  unit?: string
  /** '이상'을 뜻하는 + 를 붙인다 (그날 기준 숫자라 더 늘어날 때만) */
  plus?: boolean
}

/**
 * 검정 머리 (dcamp 'Who we are' 를 따름, 4기 Organizer 2026-11-06).
 * 검정 바탕 + 아래쪽 주황 빛 + 옅은 격자. 머리말이 이 위에 겹친다 (data-band='dark' 로 머리말이 검정 띠로 바뀐다).
 * 위: 지금 위치 | 공유. 큰 흰 제목(56). 아래 두 칸: 왼쪽 회색 이름 + 주황 큰 숫자 · 기준일, 오른쪽 설명 문단(18, #D5D2CF).
 */
export function DarkHero({
  trail,
  title,
  stats,
  note,
  paragraphs,
  share,
}: {
  trail: readonly string[]
  title: ReactNode
  stats: readonly HeroStat[]
  note?: string
  paragraphs: readonly ReactNode[]
  share?: { title: string; text: string }
}) {
  return (
    <section className={`on-dark ${s.hero}`} data-band="dark" aria-labelledby="page-title">
      <div className={`container ${s.inner}`}>
        <div className={s.top}>
          <Crumbs trail={trail} tone="dark" />
          {share && <ShareAction className={s.share} label="공유" title={share.title} text={share.text} />}
        </div>
        <h1 id="page-title" className={s.title}>
          {title}
        </h1>
        <div className={s.body}>
          <div className={s.statsCol}>
            <dl className={s.stats}>
              {stats.map((st) => (
                <div key={st.label} className={s.stat}>
                  <dt className={s.statLabel}>{st.label}</dt>
                  <dd className={s.statValue}>
                    <span className="num">{st.value}</span>
                    {st.unit}
                    {st.plus && (
                      <span className={s.plus}>
                        {' '}
                        +<span className="visually-hidden"> 이상</span>
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            {note && <p className={s.note}>{note}</p>}
          </div>
          <div className={s.text}>
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
