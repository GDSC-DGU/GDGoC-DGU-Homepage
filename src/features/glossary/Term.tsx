import { useId, useState } from 'react'
import { GLOSSARY, type TermId } from '@/content/glossary'
import { keepHyphenated } from '@/lib/text'
import s from './term.module.css'

export interface TermProps {
  id: TermId
  /** 풀이 없이 용어만 (같은 화면에서 두 번째로 나올 때) */
  bare?: boolean
  /**
   * 용어를 눌러 괄호 안 풀이를 한두 문장(long)으로 펼친다. 터치 · 키보드(Enter · Space, Esc 로 접기) 모두 된다.
   * 버튼이 들어가므로 링크 · 버튼 안에서는 쓰지 않는다 (기본 모양은 어디서나 써도 된다).
   */
  more?: boolean
  /** 용어와 풀이 사이에 붙일 이름의 나머지 ('Solution Challenge' + ' 2026' → 'Solution Challenge 2026(풀이)') */
  suffix?: string
}

/**
 * 용어 + 짧은 풀이. 처음 보는 사람이 막히지 않게, 마우스를 올리지 않아도 늘 보인다 (hover 툴팁 없음).
 * - 기본: 'G-Sprint(한 학기 팀 프로젝트)' — 풀이는 옅은 글자. 글자 크기는 둘레를 따른다
 * - bare: 'G-Sprint'
 * - more: 용어가 버튼이 되고, 누르면 괄호 안 짧은 풀이가 한두 문장 풀이로 바뀐다 (aria-expanded)
 * 조사는 뒤에 붙여 쓴다: <Term id="g-sprint" />는 → 'G-Sprint(한 학기 팀 프로젝트)는'
 */
export function Term({ id, bare = false, more = false, suffix = '' }: TermProps) {
  const def = GLOSSARY[id]
  const longId = useId()
  const [open, setOpen] = useState(false)
  // 'G-Sprint' 가 하이픈에서 줄이 바뀌지 않게
  const term = keepHyphenated(def.term)
  if (bare) return <>{term}{suffix}</>
  if (!more) {
    return (
      <span className={s.term}>
        {term}
        {suffix}
        <span className={s.short}>({def.short})</span>
      </span>
    )
  }
  return (
    <span className={s.term}>
      <button
        type="button"
        className={s.word}
        aria-expanded={open}
        aria-controls={longId}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && open) {
            e.stopPropagation()
            setOpen(false)
          }
        }}
      >
        {term}
        {suffix}
        <span className="visually-hidden"> 풀이</span>
      </button>
      <span className={s.short}>
        (<span hidden={open}>{def.short}</span>
        <span id={longId} className={s.long} hidden={!open}>
          {def.long}
        </span>
        )
      </span>
    </span>
  )
}
