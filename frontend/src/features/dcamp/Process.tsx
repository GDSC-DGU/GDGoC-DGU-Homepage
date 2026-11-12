import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import s from './process.module.css'

export interface ProcessStep {
  id: string
  title: string
  when: ReactNode
  note?: ReactNode
}

/**
 * 과정 (dcamp 'Process'): 따뜻한 회색 면, 주황 번호 동그라미 01~04 를 가는 선으로 잇고 아래에 단계 이름 · 날짜.
 * 2026-11-12: 마우스를 올린 단계까지 잇는 선이 주황으로 차오르고(scaleX), 그 단계 번호가 살짝 커지며, 뒤 단계는 옅어진다.
 * 마우스가 없는 화면(폰)에서는 섹션이 보일 때 선이 01 → 04 로 한 번 차오른다. 움직임은 transform · opacity 만, 동작 줄이기면 바로 채운다.
 */
export function Process({ title, steps, note }: { title: string; steps: readonly ProcessStep[]; note?: ReactNode }) {
  const [active, setActive] = useState<number | null>(null)
  const [seen, setSeen] = useState(false)
  const ref = useRef<HTMLElement>(null)

  // 마우스가 없는 화면: 보일 때 한 번 차오른다
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    if (window.matchMedia('(hover: hover)').matches) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true)
          io.disconnect()
        }
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section ref={ref} className={s.process} aria-labelledby="process-title">
      <div className="container">
        <h2 id="process-title" className={s.title} lang="en">
          {title}
        </h2>
        <ol className={s.steps} data-hovering={active !== null || undefined} data-seen={seen || undefined} onMouseLeave={() => setActive(null)}>
          {steps.map((st, i) => (
            <li
              key={st.id}
              className={s.step}
              style={{ '--i': i } as CSSProperties}
              data-state={active === null ? undefined : i === active ? 'on' : i < active ? 'past' : 'next'}
              onMouseEnter={() => setActive(i)}
            >
              {i < steps.length - 1 && <span className={s.fill} aria-hidden="true" data-on={(active !== null && i < active) || undefined} />}
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
