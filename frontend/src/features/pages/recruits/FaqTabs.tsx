import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useLocation } from 'react-router-dom'
import type { Faq } from '@/domain/types'
import { useChanged } from '@/hooks/useChanged'
import { FAQ_GROUP_LABEL, faqGroupOf, faqIdFromHash, groupFaqs, type FaqGroupId } from './faqGroups'
import k from './recruit.module.css'

const ORDER: readonly FaqGroupId[] = ['apply', 'activity']

function QaList({ faqs, open, target }: { faqs: readonly Faq[]; open: ReadonlySet<string>; target: string | null }) {
  return (
    <ul className={k.faq}>
      {faqs.map((f) => (
        <li key={f.id}>
          <details className={k.qa} id={`faq-${f.id}`} open={open.has(f.id) || f.id === target}>
            <summary>
              <span className={k.q}>{f.q}</span>
              <span className={k.sign} aria-hidden="true" />
            </summary>
            <div className={k.a}>
              <p>{f.a}</p>
            </div>
          </details>
        </li>
      ))}
    </ul>
  )
}

/**
 * 자주 묻는 질문: '지원' · '활동' 두 탭 (WAI-ARIA 탭 패턴).
 * 질문마다 id="faq-<faq.json id>" 가 붙는다. 홈 · 다른 페이지가 /recruits#faq-who 처럼 바로 가리키므로 id 는 바꾸지 않는다.
 * 답의 출처는 답마다 달지 않고 페이지 끝 출처 줄에 모은다.
 * - 화살표 ← → 로 탭을 옮기면 바로 그 묶음이 열린다 (Home · End 도). 탭 키는 선택된 탭 하나에만 멈춘다
 * - '#faq-who' 처럼 질문 하나를 가리키는 주소로 오면 그 질문이 든 탭을 열고 질문을 펼친다
 * - 한 묶음만 있으면 탭 없이 목록만
 */
export function FaqTabs({ faqs, open = [] }: { faqs: readonly Faq[]; open?: readonly string[] }) {
  const { hash } = useLocation()
  const target = faqIdFromHash(hash)
  const groups = useMemo(() => groupFaqs(faqs), [faqs])
  const tabs = ORDER.filter((g) => groups[g].length > 0)
  const [tab, setTab] = useState<FaqGroupId>(() => (target ? faqGroupOf(target) : (tabs[0] ?? 'apply')))
  // 다른 질문을 가리키는 주소로 바뀌면 그 탭으로 (렌더 중에 맞추는 React 권장 방식)
  const [seen, setSeen] = useState(target)
  const moved = useChanged(tab) // 탭을 바꿨을 때만 패널이 페이드로 나타난다
  if (seen !== target) {
    setSeen(target)
    if (target) setTab(faqGroupOf(target))
  }
  const openSet = useMemo(() => new Set(open), [open])
  const base = useId()
  const refs = useRef<Partial<Record<FaqGroupId, HTMLButtonElement | null>>>({})

  if (tabs.length < 2) return <QaList faqs={faqs} open={openSet} target={target} />

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = tabs.indexOf(tab)
    let next = -1
    if (e.key === 'ArrowRight') next = (i + 1) % tabs.length
    else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = tabs.length - 1
    if (next < 0) return
    e.preventDefault()
    setTab(tabs[next])
    refs.current[tabs[next]]?.focus()
  }

  return (
    <div className={k.faqTabs}>
      <div className={k.tablist} role="tablist" aria-label="질문 묶음">
        {tabs.map((g) => {
          const selected = g === tab
          return (
            <button
              key={g}
              ref={(el) => {
                refs.current[g] = el
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${g}`}
              aria-selected={selected}
              aria-controls={`${base}-panel-${g}`}
              tabIndex={selected ? 0 : -1}
              className={k.tab}
              onClick={() => setTab(g)}
              onKeyDown={onKeyDown}
            >
              {FAQ_GROUP_LABEL[g]}
              <span className={`${k.tabCount} num`}>
                <span className="visually-hidden"> </span>
                {groups[g].length}
                <span className="visually-hidden">개</span>
              </span>
            </button>
          )
        })}
      </div>
      {tabs.map((g) => (
        <div key={g} role="tabpanel" id={`${base}-panel-${g}`} aria-labelledby={`${base}-tab-${g}`} hidden={g !== tab} className={moved ? 'fade-in' : undefined}>
          <QaList faqs={groups[g]} open={openSet} target={target} />
        </div>
      ))}
    </div>
  )
}
