import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { aos } from './useReveal'
import s from './homeHead.module.css'

/**
 * 홈 섹션 머리 (슈어소프트테크 '• Solution & Service •' + 큰 제목). 4기 Organizer 2026-11-16 결정으로
 * 홈에서만 제목 위 영문 이름표를 둔다 (스킬 규칙의 이름표 금지보다 이 결정이 먼저. GLOSSARY.md '홈 움직임').
 * 떠오르기: 이름표 200 → 제목 250ms.
 */
export function HomeHead({ id, eng, title, tone = 'light', center = false }: { id: string; eng: string; title: ReactNode; tone?: 'light' | 'dark'; center?: boolean }) {
  return (
    <header className={s.head} data-tone={tone} data-center={center || undefined}>
      <p className={s.eng} lang="en" {...aos(200)}>
        {eng}
      </p>
      <h2 id={id} className={s.title} {...aos(250)}>
        {title}
      </h2>
    </header>
  )
}

function Arrow() {
  return (
    <svg className={s.arrow} viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * 슈어소프트테크 'View More →' 단추: 1px 테두리 알약, 글자 + 오른쪽 화살표 그림.
 * tone='dark' 는 사진 · 먹색 위 (흰 테두리 · 흰 글자). href 가 바깥 주소면 새 창.
 */
export function MoreLink({ to, children, tone = 'light', tabIndex }: { to: string; children: ReactNode; tone?: 'light' | 'dark'; tabIndex?: number }) {
  const external = /^https?:\/\//.test(to)
  const body = (
    <>
      <span>{children}</span>
      <Arrow />
      {external && <span className="visually-hidden"> (새 창)</span>}
    </>
  )
  return external ? (
    <a className={s.more} data-tone={tone} href={to} target="_blank" rel="noreferrer" tabIndex={tabIndex}>
      {body}
    </a>
  ) : (
    <Link className={s.more} data-tone={tone} to={to} tabIndex={tabIndex}>
      {body}
    </Link>
  )
}
