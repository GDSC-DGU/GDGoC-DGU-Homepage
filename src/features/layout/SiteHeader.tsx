import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import type { CSSProperties } from 'react'
import { HEADER_NAV, PLACE_BY_ID, headerLabel } from '@/config/places'
import { recruitStatus } from '@/content/recruitingStatus'
import { useToday } from '@/hooks/useToday'
import { useCampusActions } from '@/state/useCampus'
import { MobileMenu } from './MobileMenu'
import { SearchDialog } from './SearchDialog'
import s from './layout.module.css'

/** 조금이라도 내려가면 머리말 아래에 1px 선을 긋는다 */
function useScrolled(): boolean {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 2)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return scrolled
}

/** GDG DGU 로고 그림 크기 (public/brand/gdg-dgu-logo.png 원본 비율 그대로, 화면에서는 높이 26px) */
const LOGO = { w: 280, h: 137 } as const

/** 지금 메뉴 글자색: 장소색을 흰 바탕에서 읽히게 짙게 한 것 (tokens.css --place-*-text, 4.5:1 이상) */
const activeColor = (id: string) => ({ '--active': `var(--place-${id}-text)` }) as CSSProperties

/**
 * 모든 페이지 공통 머리말 (4기 Figma 시안 2026-11): 80px 흰 띠(폰 64), 위에 붙어 있다.
 * 왼쪽 로고(= 홈, 글자 없이 로고만: 4기 Organizer 2026-11-05) · 오른쪽 메뉴 넷(소개 · 아카이브 · 팀원 찾기 · 지원 안내). 지금 메뉴는 그 장소색(짙게) 글자.
 * 메뉴에 마우스를 올리면 지도에서 같은 건물이 올라온다 (메뉴 = 지도).
 * 검색은 Ctrl/⌘ + K 와 폰 메뉴 시트에서. 폰(900px 이하)은 이름 · 메뉴 버튼 한 줄, 메뉴는 전체 화면 시트로 연다.
 */
export function SiteHeader() {
  const { hover } = useCampusActions()
  const scrolled = useScrolled()
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const recruitingOpen = recruitStatus(useToday()).state === 'open'
  const menuBtnRef = useRef<HTMLButtonElement>(null)

  // Ctrl/⌘ + K 로 어디서든 검색 창을 연다
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setMenuOpen(false)
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <header className={s.header} data-site-header="" data-scrolled={scrolled || undefined}>
        <div className={`container ${s.bar}`}>
          {/* 로고만 보이고, 읽히는 이름은 'GDGoC DGU 홈' (public/brand: 4기 Organizer 가 준 GDG DGU 로고) */}
          <Link className={s.brand} to="/">
            <img className={s.brandLogo} src={`${import.meta.env.BASE_URL}brand/gdg-dgu-logo.png`} alt="" width={LOGO.w} height={LOGO.h} />
            <span className="visually-hidden">GDGoC DGU 홈</span>
          </Link>
          <nav className={s.nav} aria-label="주요 메뉴">
            <ul>
              {HEADER_NAV.map((id) => (
                <li key={id}>
                  <NavLink
                    to={PLACE_BY_ID[id].path}
                    style={activeColor(id)}
                    className={({ isActive }) => `${s.navLink} ${isActive ? s.navActive : ''}`}
                    onMouseEnter={() => hover(id)}
                    onMouseLeave={() => hover(null)}
                    onFocus={() => hover(id)}
                    onBlur={() => hover(null)}
                  >
                    {/* 메뉴는 이름만 ('준비 중' 표시는 그 페이지 머리에서) */}
                    {headerLabel(id, recruitingOpen)}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className={s.tools}>
            <button ref={menuBtnRef} type="button" className={`${s.iconBtn} ${s.menuBtn}`} aria-haspopup="dialog" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
              <span className="visually-hidden">메뉴</span>
            </button>
          </div>
        </div>
      </header>
      {/* 폰 메뉴 안에서 연 검색을 닫으면 메뉴는 이미 닫혀 있다: 초점은 머리말의 메뉴 버튼으로 */}
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} returnFallbacks={[menuBtnRef]} />
      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSearch={() => {
          setMenuOpen(false)
          setSearchOpen(true)
        }}
      />
    </>
  )
}
