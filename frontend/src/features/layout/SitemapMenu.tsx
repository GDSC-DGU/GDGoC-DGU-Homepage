import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { SITE_MENU } from '@/config/menu'
import { useModalDialog } from './useModalDialog'
import s from './sitemap.module.css'

const LOGO = { w: 280, h: 137 } as const

interface Props {
  open: boolean
  onClose: () => void
  /** 전체 메뉴를 닫고 검색 창을 연다 */
  onSearch: () => void
}

/**
 * 전체 메뉴 (4기 Organizer 2026-11-16: 슈어소프트테크 '전체 메뉴 열기' 그대로). 모든 폭에서 머리말 오른쪽 끝 버튼으로 연다.
 * 화면 가득 먹색 면, 위 줄은 머리말과 같은 자리(로고 · 검색 · 닫기), 아래는 메뉴마다 한 칸(제목 28 + 아래 칸 18, 칸 사이 세로 괘선).
 * 폰은 칸이 위아래로 쌓인다. <dialog> showModal 이라 초점이 안에만 돌고 Esc 로 닫힌다.
 */
export function SitemapMenu({ open, onClose, onSearch }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const { ref, restoreFocus } = useModalDialog(open, closeRef)
  const close = () => ref.current?.close()

  return (
    <dialog
      ref={ref}
      className={`on-dark ${s.sitemap}`}
      aria-label="전체 메뉴"
      onClose={() => {
        onClose()
        restoreFocus()
      }}
    >
      <div className={`container ${s.bar}`}>
        <Link className={s.brand} to="/" onClick={close}>
          <img className={s.logo} src={`${import.meta.env.BASE_URL}brand/gdg-dgu-logo.png`} alt="" width={LOGO.w} height={LOGO.h} />
          <span className="visually-hidden">GDGoC DGU 홈</span>
        </Link>
        <div className={s.tools}>
          <button type="button" className={s.icon} onClick={onSearch}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" />
              <path d="M16 16l4.5 4.5" />
            </svg>
            <span className="visually-hidden">검색 열기</span>
          </button>
          <button ref={closeRef} type="button" className={s.icon} onClick={close}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 5l14 14M19 5L5 19" />
            </svg>
            <span className="visually-hidden">전체 메뉴 닫기</span>
          </button>
        </div>
      </div>
      <nav className={`container ${s.body}`} aria-label="전체 메뉴">
        <ul className={s.cols}>
          {SITE_MENU.map((g) => (
            <li key={g.id} className={s.col}>
              <Link className={s.title} to={g.to} onClick={close}>
                {g.label}
              </Link>
              <ul className={s.items}>
                {g.items.map((it) => (
                  <li key={it.to}>
                    <Link className={s.item} to={it.to} onClick={close}>
                      {it.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </nav>
    </dialog>
  )
}
