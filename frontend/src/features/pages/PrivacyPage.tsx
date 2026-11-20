import type { MouseEvent } from 'react'
import { koreanDate, PRIVACY_EFFECTIVE_DATE, PRIVACY_INTRO, PRIVACY_SECTIONS, type PolicyBlock } from '@/content/privacy'
import { usePageTitle } from '@/hooks/usePageTitle'
import s from './privacy.module.css'

/** 목차를 누르면 그 조항으로 (hash 주소 미리보기에서도 되게 주소 대신 직접 옮기고, 초점도 제목으로) */
function jump(e: MouseEvent<HTMLAnchorElement>, id: string) {
  const target = document.getElementById(id)
  if (!target) return
  e.preventDefault()
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  target.focus({ preventScroll: true })
}

function Block({ block }: { block: PolicyBlock }) {
  if (block.kind === 'p') return <p className={s.text}>{block.text}</p>
  if (block.kind === 'list') {
    return (
      <ul className={s.list}>
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    )
  }
  return (
    <div className={s.tableBox}>
      <table className={s.table}>
        <caption className="visually-hidden">{block.caption}</caption>
        <thead>
          <tr>
            {block.head.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row) => (
            <tr key={row.join('|')}>
              {row.map((cell, i) =>
                i === 0 ? (
                  <th key={i} scope="row">
                    {cell}
                  </th>
                ) : (
                  <td key={i}>{cell}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * 개인정보 처리방침 (/privacy, P-COM-008 · F-COM-005). 내용은 src/content/privacy.ts.
 * 머리(이름 · 시행일) → 머리글 → 목차 → 조항 1 ~ N. 글 폭은 읽기 좋은 한 단(760).
 * Google 로그인 동의 화면 · 꼬리말 · 로그인 화면 · 지원서 동의란이 이 주소로 온다.
 */
export function PrivacyPage() {
  usePageTitle('개인정보 처리방침')
  return (
    <div className={`container ${s.page}`}>
      <header className={s.head}>
        <p className={s.eyebrow}>GDGoC DGU</p>
        <h1 className={s.title}>개인정보 처리방침</h1>
        <p className={s.meta}>
          시행일 <time dateTime={PRIVACY_EFFECTIVE_DATE}>{koreanDate(PRIVACY_EFFECTIVE_DATE)}</time>
        </p>
      </header>

      <p className={s.intro}>{PRIVACY_INTRO}</p>

      <nav className={s.toc} aria-labelledby="privacy-toc">
        <h2 id="privacy-toc" className={s.tocTitle}>
          목차
        </h2>
        <ol className={s.tocList}>
          {PRIVACY_SECTIONS.map((sec) => (
            <li key={sec.id}>
              <a href={`#${sec.id}`} onClick={(e) => jump(e, sec.id)}>
                {sec.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <ol className={s.sections}>
        {PRIVACY_SECTIONS.map((sec, i) => (
          <li key={sec.id} className={s.section}>
            <h2 id={sec.id} className={s.sectionTitle} tabIndex={-1}>
              <span className="num">{i + 1}.</span> {sec.title}
            </h2>
            {sec.blocks.map((b, j) => (
              <Block key={j} block={b} />
            ))}
          </li>
        ))}
      </ol>
    </div>
  )
}
