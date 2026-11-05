import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
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

/**
 * 모든 페이지 공통 머리말 (4기 Figma 시안 2026-11): 80px 흰 띠(폰 64), 위에 붙어 있다.
 * 왼쪽 로고(= 홈, 글자 없이 로고만: 4기 Organizer 2026-11-05) · 오른쪽 메뉴 넷(소개 · 아카이브 · 팀원 찾기 · 지원 안내). 지금 메뉴는 먹색 글자 + 먹색 밑줄.
 * 메뉴에 마우스를 올리면 지도에서 같은 건물이 올라온다 (메뉴 = 지도).
 * 검색은 넓은 화면 오른쪽 돋보기 단추(4기 Organizer 2026-11-05) · Ctrl/⌘ + K · 폰 메뉴 시트에서. 폰(900px 이하)은 이름 · 메뉴 버튼 한 줄, 메뉴는 전체 화면 시트로 연다.
 */
export function SiteHeader() {
  const { hover } = useCampusActions()
  const scrolled = useScrolled()
  // 메뉴 · 검색 창은 '연 주소' 를 기억하고, 지금 주소가 같을 때만 열려 있다.
  // 주소가 바뀌면(뒤로 가기 · 폰의 뒤로 단추 포함) 저절로 닫힌다 (QA 2026-11-05: 열린 메뉴가 새 페이지 위에 남았다)
  const { pathname, search } = useLocation()
  const here = `${pathname}${search}`
  const hereRef = useRef(here)
  const [searchAt, setSearchAt] = useState<string | null>(null)
  const [menuAt, setMenuAt] = useState<string | null>(null)
  const searchOpen = searchAt === here
  const menuOpen = menuAt === here
  useEffect(() => {
    hereRef.current = here
  }, [here])
  const recruitingOpen = recruitStatus(useToday()).state === 'open'
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const searchBtnRef = useRef<HTMLButtonElement>(null)

  // Ctrl/⌘ + K 로 어디서든 검색 창을 연다
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setMenuAt(null)
        setSearchAt(hereRef.current)
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
            {/* 넓은 화면: 메뉴 오른쪽 돋보기 (폰은 메뉴 시트 안에 검색이 있다) */}
            <button
              ref={searchBtnRef}
              type="button"
              className={`${s.iconBtn} ${s.searchBtn}`}
              aria-haspopup="dialog"
              aria-expanded={searchOpen}
              aria-keyshortcuts="Control+K Meta+K"
              onClick={() => {
                setMenuAt(null)
                setSearchAt(here)
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="6.5" />
                <path d="M16 16l4.5 4.5" />
              </svg>
              <span className="visually-hidden">검색</span>
            </button>
            <button ref={menuBtnRef} type="button" className={`${s.iconBtn} ${s.menuBtn}`} aria-haspopup="dialog" aria-expanded={menuOpen} onClick={() => setMenuAt(here)}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
              <span className="visually-hidden">메뉴</span>
            </button>
          </div>
        </div>
      </header>
      {/* 폰 메뉴 안에서 연 검색을 닫으면 메뉴는 이미 닫혀 있다: 초점은 머리말의 메뉴 버튼으로 */}
      <SearchDialog open={searchOpen} onClose={() => setSearchAt(null)} returnFallbacks={[searchBtnRef, menuBtnRef]} />
      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuAt(null)}
        onSearch={() => {
          setMenuAt(null)
          setSearchAt(here)
        }}
      />
    </>
  )
}
