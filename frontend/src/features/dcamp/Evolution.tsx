import { useState } from 'react'
import type { Generation } from '@/domain/types'
import { evolutionRows } from './evolution'
import s from './evolution.module.css'

/** 처음에 보이는 기수 수 (dcamp 처럼 나머지는 '더보기') */
const FIRST = 3

/**
 * 연혁 (dcamp 'Our Evolution'): 검정 면, 왼쪽 영문 제목 | 오른쪽 기수 줄 (큰 기수 · 주황 고리 점 + 세로줄 · 그 기수에 한 일).
 * 자료: generations.json (확인된 기간 · 대표 기록).
 */
export function Evolution({ gens, title = 'Our Evolution' }: { gens: readonly Generation[]; title?: string }) {
  const rows = evolutionRows(gens)
  const [open, setOpen] = useState(false)
  const shown = open ? rows : rows.slice(0, FIRST)
  return (
    <section className={`on-dark ${s.evo}`} data-band="dark" aria-labelledby="evolution-title">
      <div className={`container ${s.grid}`}>
        <h2 id="evolution-title" className={s.title} lang="en">
          {title}
        </h2>
        <div>
          <ol className={s.rows}>
            {shown.map((r) => (
              <li key={r.n} className={s.row} data-current={r.current || undefined}>
                <div className={s.when}>
                  <span className={s.label}>{r.label}</span>
                  <span className={`num ${s.period}`}>{r.period}</span>
                </div>
                <span className={s.dot} aria-hidden="true" />
                <ul className={s.lines}>
                  {r.lines.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          {rows.length > FIRST && (
            <button type="button" className={s.more} aria-expanded={open} onClick={() => setOpen(!open)}>
              {open ? '접기' : '더보기'}
              <svg viewBox="0 0 16 16" aria-hidden="true" data-open={open || undefined}>
                <path d="M4 6l4 4 4-4" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
