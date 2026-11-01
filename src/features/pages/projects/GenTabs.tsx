import { useRef, type KeyboardEvent } from 'react'
import { genTabId, type GenTab } from './generations'
import p from '../projects.module.css'

/**
 * 기수 탭 (3기 · 2기 · 1기 · 기타): 고른 탭의 프로젝트만 아래에 보인다.
 * WAI-ARIA 탭: 화살표 ← → · Home · End 로 옮기면 바로 그 기수를 보여 준다. 탭 하나만 Tab 키로 들어온다.
 */
export function GenTabs({ tabs, active, onChange, panelId }: { tabs: readonly GenTab[]; active: string; onChange: (key: string) => void; panelId: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const move = (to: number) => {
    const i = (to + tabs.length) % tabs.length
    onChange(tabs[i].key)
    refs.current[i]?.focus()
  }
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const to = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null
    if (to === null) return
    e.preventDefault()
    move(to)
  }

  return (
    <div className={p.tabs} role="tablist" aria-label="기수">
      {tabs.map((t, i) => {
        const selected = t.key === active
        return (
          <button
            key={t.key}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="tab"
            id={genTabId(t.key)}
            className={p.tab}
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.key)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {t.gen !== null ? (
              <>
                <span className="num">{t.gen}</span>기
              </>
            ) : (
              t.label
            )}
            <span className="visually-hidden">, 프로젝트 {t.count}개</span>
          </button>
        )
      })}
    </div>
  )
}
