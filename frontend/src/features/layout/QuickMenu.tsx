import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { SITE } from '@/config/site'
import { BRAND_PATHS } from './brandPaths'
import s from './quickMenu.module.css'

interface Quick {
  id: string
  label: string
  to: string
  icon: ReactNode
  external: boolean
}

const fill = (d: string) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={s.fill}>
    <path d={d} />
  </svg>
)

const QUICK: Quick[] = [
  {
    id: 'apply',
    label: '지원하기',
    to: '/recruits',
    external: false,
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={s.line}>
        <path d="M4 20h4L19 9l-4-4L4 16z" />
        <path d="M13.5 6.5l4 4" />
      </svg>
    ),
  },
  { id: 'instagram', label: '인스타그램', to: SITE.links.instagram, external: true, icon: fill(BRAND_PATHS.instagram) },
  ...(SITE.links.youtube ? [{ id: 'youtube', label: '유튜브', to: SITE.links.youtube, external: true, icon: fill(BRAND_PATHS.youtube) }] : []),
  {
    id: 'links',
    label: '모든 링크',
    to: SITE.links.linktree,
    external: true,
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={s.line}>
        <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" />
        <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />
      </svg>
    ),
  },
]

/**
 * 오른쪽 빠른 메뉴 (4기 Organizer 2026-11-16: 슈어소프트테크 오른쪽 '문의하기 · 뉴스레터 · 다운로드 · 블로그' 자리).
 * 넓은 화면은 오른쪽 아래 세로 네모 묶음 + 둥근 '맨 위로', 폰은 화면 아래 한 줄 띠 + 그 위 '맨 위로'.
 * 지원하기 페이지의 폰 화면은 페이지 자체의 아래 고정 띠(StickyCta)가 있어 띠를 숨긴다.
 */
export function QuickMenu() {
  const { pathname } = useLocation()
  const onRecruits = pathname.startsWith('/recruits')
  const toTop = () => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  return (
    <div className={s.quick} data-recruits={onRecruits || undefined}>
      <nav className={s.list} aria-label="빠른 메뉴">
        <ul>
          {QUICK.map((q) => (
            <li key={q.id}>
              {q.external ? (
                <a className={s.item} data-id={q.id} href={q.to} target="_blank" rel="noreferrer">
                  {q.icon}
                  <span className={s.label}>{q.label}</span>
                  <span className="visually-hidden"> (새 창)</span>
                </a>
              ) : (
                <Link className={s.item} data-id={q.id} to={q.to}>
                  {q.icon}
                  <span className={s.label}>{q.label}</span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>
      <button type="button" className={s.top} onClick={toTop}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 15l6-6 6 6M6 19h12" />
        </svg>
        <span className="visually-hidden">맨 위로</span>
      </button>
    </div>
  )
}
