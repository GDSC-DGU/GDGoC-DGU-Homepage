import type { ReactNode } from 'react'
import s from './process.module.css'

export interface ProcessStep {
  id: string
  title: string
  when: ReactNode
  note?: ReactNode
}

/** 과정 (dcamp 'Process'): 따뜻한 회색 면, 주황 번호 동그라미 01–04 를 가는 선으로 잇고 아래에 단계 이름 · 날짜 */
export function Process({ title, steps, note }: { title: string; steps: readonly ProcessStep[]; note?: ReactNode }) {
  return (
    <section className={s.process} aria-labelledby="process-title">
      <div className="container">
        <h2 id="process-title" className={s.title} lang="en">
          {title}
        </h2>
        <ol className={s.steps}>
          {steps.map((st, i) => (
            <li key={st.id} className={s.step}>
              <span className={`num ${s.n}`} aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className={s.stepTitle}>{st.title}</h3>
              <p className={s.when}>{st.when}</p>
              {st.note && <p className={s.note}>{st.note}</p>}
            </li>
          ))}
        </ol>
        {note && <p className={s.foot}>{note}</p>}
      </div>
    </section>
  )
}
