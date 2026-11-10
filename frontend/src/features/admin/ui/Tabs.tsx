import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import s from './layout.module.css'

export interface TabItem<V extends string> {
  value: V
  label: ReactNode
  /** 탭 안 내용 */
  panel: ReactNode
}

/**
 * 탭 (한 화면 안에서 영역 바꾸기, WAI-ARIA tabs): ← → Home End 로 옮기고, 고른 탭의 내용만 보인다.
 *   <Tabs label="지원서" value={tab} onChange={setTab} items={[{ value: 'answers', label: '응답', panel: <Answers/> }, …]} />
 * 주소가 다른 화면 사이(지원폼 질문 ↔ 평가 기준)는 NavTabs.
 */
export function Tabs<V extends string>({ label, items, value, onChange }: { label: string; items: readonly TabItem<V>[]; value: V; onChange: (v: V) => void }) {
  const base = useId()
  const refs = useRef(new Map<V, HTMLButtonElement>())
  const index = Math.max(0, items.findIndex((t) => t.value === value))

  const onKeyDown = (e: KeyboardEvent) => {
    const last = items.length - 1
    const next = e.key === 'ArrowRight' ? (index + 1) % items.length : e.key === 'ArrowLeft' ? (index - 1 + items.length) % items.length : e.key === 'Home' ? 0 : e.key === 'End' ? last : -1
    if (next < 0) return
    e.preventDefault()
    onChange(items[next].value)
    refs.current.get(items[next].value)?.focus()
  }

  return (
    <div>
      <div role="tablist" aria-label={label} className={s.tabs} onKeyDown={onKeyDown}>
        {items.map((t) => {
          const selected = t.value === value
          return (
            <button
              key={t.value}
              ref={(el) => {
                if (el) refs.current.set(t.value, el)
                else refs.current.delete(t.value)
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${t.value}`}
              aria-selected={selected}
              aria-controls={`${base}-panel-${t.value}`}
              tabIndex={selected ? 0 : -1}
              className={s.tab}
              onClick={() => onChange(t.value)}
            >
              {t.label}
            </button>
          )
        })}
      </div>
      {items.map((t) => (
        <div key={t.value} role="tabpanel" id={`${base}-panel-${t.value}`} aria-labelledby={`${base}-tab-${t.value}`} hidden={t.value !== value} tabIndex={0}>
          {t.value === value && t.panel}
        </div>
      ))}
    </div>
  )
}

/**
 * 주소가 다른 화면을 탭처럼 잇는 줄 (지원폼 작성: '지원폼 질문' /admin/recruit/form ↔ '평가 기준' /admin/recruit/form/criteria).
 * 진짜 링크(nav)라 새 탭으로 열 수 있고, 지금 화면은 aria-current="page".
 */
export function NavTabs({ label, items }: { label: string; items: readonly { to: string; label: ReactNode; end?: boolean }[] }) {
  return (
    <nav aria-label={label}>
      <div className={s.tabs}>
        {items.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end ?? true} className={s.tab}>
            {t.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
