import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { SITE_MENU } from '@/config/menu'
import { SearchDialog } from './SearchDialog'
import { AccountTools } from './AccountTools'
import { SitemapMenu } from './SitemapMenu'
import s from './layout.module.css'

/** 조금이라도 내려가면 머리말에 흰 바탕 + 그림자 (슈어소프트테크) */
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

/**
 * 내리면 머리말을 숨기고, 올리면 다시 보인다 (4기 Organizer 2026-11-16: 슈어소프트테크 머리말 그대로).
 * - 맨 위 근처(머리말 높이 이내)에서는 늘 보인다. 5px 안쪽으로 조금 움직인 것은 무시한다.
 * - 페이지 바닥에 닿아 튕기는 동안에는 바꾸지 않는다. keep 이면(메뉴 · 검색 창이 열림, 초점이 머리말 안) 숨기지 않는다.
 */
function useHideOnScroll(keep: boolean): boolean {
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    if (keep) return
    let last = window.scrollY
    const DELTA = 5
    const TOP = 80
    const on = () => {
      const y = window.scrollY
      if (y <= TOP) {
        setHidden(false)
        last = y
        return
      }
      if (Math.abs(y - last) <= DELTA) return
      if (y > last) setHidden(true)
      else if (y + window.innerHeight < document.documentElement.scrollHeight) setHidden(false)
      last = y
    }
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [keep])
  return hidden && !keep
}

/**
 * 머리말 아래에 검정 섹션(data-band='dark')이 깔려 있으면 머리말도 검정 띠로 (dcamp: 검정 머리 위 검정 머리말).
 * 스크롤 · 크기 변경 · 본문이 바뀔 때 다시 잰다 (한 프레임에 한 번).
 */
function useOnDark(key: string): boolean {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    let raf = 0
    const check = () => {
      raf = 0
      const y = 48 // 머리말 띠 가운데 (위 여백 16 + 띠 64 의 절반)
      let on = false
      for (const el of document.querySelectorAll('[data-band="dark"]')) {
        const r = el.getBoundingClientRect()
        if (r.top <= y && r.bottom >= y) {
          on = true
          break
        }
      }
      setDark(on)
    }
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(check)
    }
    queue()
    window.addEventListener('scroll', queue, { passive: true })
    window.addEventListener('resize', queue)
    const mo = new MutationObserver(queue)
    mo.observe(document.getElementById('main') ?? document.body, { childList: true, subtree: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', queue)
      window.removeEventListener('resize', queue)
      mo.disconnect()
    }
  }, [key])
  return dark
}

/** GDG DGU 로고 그림 크기 (public/brand/gdg-dgu-logo.png 원본 비율 그대로, 화면에서는 높이 26px) */
const LOGO = { w: 280, h: 137 } as const

/** 아래 칸이 가장 긴 메뉴의 줄 수 (흰 판 높이) */
const GNB_ROWS = Math.max(...SITE_MENU.map((g) => g.items.length))

/**
 * 미끄러지는 줄의 자리: 메뉴가 다 벌어진 뒤(칸 좌우 --gnb-pad-open)를 기준으로 계산한다.
 * 벌어지는 동안(0.3초) 지금 자리를 재면 줄이 엉뚱한 곳에 멈추므로, 글자 폭과 벌어진 여백으로 끝 자리를 바로 구한다.
 */
function barAt(list: HTMLUListElement | null, links: readonly (HTMLAnchorElement | null)[], i: number): { left: number; width: number } {
  if (!list) return { left: 0, width: 0 }
  const pad = parseFloat(getComputedStyle(list).getPropertyValue('--gnb-pad-open')) || 0
  let left = 0
  for (let j = 0; j < i; j++) left += (links[j]?.offsetWidth ?? 0) + pad * 2
  return { left: left + pad, width: links[i]?.offsetWidth ?? 0 }
}

/**
 * 모든 페이지 공통 머리말 (4기 Organizer 2026-11-16: 슈어소프트테크 머리말 그대로).
 * - 높이 90 (폰 70), 화면 폭 90% 틀. 맨 위에서는 바탕이 비치고, 조금이라도 내려가면 흰 바탕 + 그림자. 내리면 숨고 올리면 나타난다.
 * - 왼쪽 로고(= 홈) · 가운데 메뉴(1024 이상) · 오른쪽 검색 · 전체 메뉴 버튼.
 * - 가운데 메뉴에 마우스를 올리거나 초점이 들어오면 흰 판이 내려오며 메뉴마다 아래 칸이 한꺼번에 보인다 (config/menu.ts).
 * - 검정 섹션 위 맨 꼭대기에서는 글자 · 그림이 흰색 (useOnDark). 흰 바탕이 깔리면 다시 먹색.
 * 검색은 Ctrl/⌘ + K 로도 연다.
 */
export function SiteHeader() {
  const scrolled = useScrolled()
  // 메뉴 · 검색 창은 '연 주소' 를 기억하고, 지금 주소가 같을 때만 열려 있다.
  // 주소가 바뀌면(뒤로 가기 · 폰의 뒤로 단추 포함) 저절로 닫힌다 (QA 2026-11-05: 열린 메뉴가 새 페이지 위에 남았다)
  const { pathname, search } = useLocation()
  const here = `${pathname}${search}`
  const hereRef = useRef(here)
  const [searchAt, setSearchAt] = useState<string | null>(null)
  const [menuAt, setMenuAt] = useState<string | null>(null)
  const [gnbAt, setGnbAt] = useState<string | null>(null)
  const searchOpen = searchAt === here
  const menuOpen = menuAt === here
  const gnbOpen = gnbAt === here
  const [focusIn, setFocusIn] = useState(false)
  const hidden = useHideOnScroll(searchOpen || menuOpen || focusIn || gnbOpen)
  useEffect(() => {
    hereRef.current = here
  }, [here])
  const onDark = useOnDark(here) && !scrolled && !gnbOpen
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const searchBtnRef = useRef<HTMLButtonElement>(null)
  // 가운데 메뉴의 미끄러지는 줄: 올린 메뉴 번호 → 메뉴가 다 벌어진 뒤의 자리 · 폭
  const gnbListRef = useRef<HTMLUListElement>(null)
  const gnbLinkRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  // 줄은 마지막 자리를 기억한다: 다시 열면 그 자리에서 다음 메뉴로 미끄러진다
  const [bar, setBar] = useState({ left: 0, width: 0 })
  const hoverMenu = (i: number) => {
    setHoverIdx(i)
    setBar(barAt(gnbListRef.current, gnbLinkRefs.current, i))
  }

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

  const openSearch = () => {
    setMenuAt(null)
    setGnbAt(null)
    setSearchAt(here)
  }

  return (
    <>
      <header
        className={s.header}
        data-site-header=""
        data-scrolled={scrolled || undefined}
        data-on-dark={onDark || undefined}
        data-hidden={hidden || undefined}
        data-gnb={gnbOpen || undefined}
        style={{ ['--gnb-rows-px' as string]: `${GNB_ROWS * 32 - 8}px` }}
        // 메뉴 사이 빈 곳 · 흰 판 위에 있는 동안은 펼친 채로, 머리말(흰 판 포함)을 벗어나면 닫는다
        onMouseLeave={() => {
          setGnbAt(null)
          setHoverIdx(null)
        }}
        onFocus={() => setFocusIn(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusIn(false)
        }}
      >
        <div className={`container ${s.bar} ${onDark ? 'on-dark' : ''}`}>
          {/* 로고만 보이고, 읽히는 이름은 'GDGoC DGU 홈' (public/brand: 4기 Organizer 가 준 GDG DGU 로고) */}
          <Link className={s.brand} to="/">
            <img className={s.brandLogo} src={`${import.meta.env.BASE_URL}brand/gdg-dgu-logo.png`} alt="" width={LOGO.w} height={LOGO.h} />
            <span className="visually-hidden">GDGoC DGU 홈</span>
          </Link>
          <nav
            className={s.gnb}
            aria-label="주요 메뉴"
            onMouseEnter={() => setGnbAt(here)}
            onFocus={() => setGnbAt(here)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setGnbAt(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setGnbAt(null)
            }}
          >
            <ul ref={gnbListRef} className={s.gnbList}>
              {SITE_MENU.map((g, i) => (
                <li key={g.id} className={s.gnbItem} data-hover={(gnbOpen && hoverIdx === i) || undefined}>
                  <NavLink
                    ref={(el) => {
                      gnbLinkRefs.current[i] = el
                    }}
                    to={g.to}
                    className={({ isActive }) => `${s.gnbLink} ${isActive ? s.gnbActive : ''}`}
                    onMouseEnter={() => hoverMenu(i)}
                    onFocus={() => hoverMenu(i)}
                    onClick={() => setGnbAt(null)}
                  >
                    {g.label}
                  </NavLink>
                  <ul className={s.sub}>
                    {g.items.map((it) => (
                      <li key={it.to}>
                        <Link className={s.subLink} to={it.to} tabIndex={gnbOpen ? undefined : -1} onMouseEnter={() => hoverMenu(i)} onFocus={() => hoverMenu(i)} onClick={() => setGnbAt(null)}>
                          {it.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
              {/* 올린 메뉴 아래 한 줄: 메뉴를 옮기면 옆으로 미끄러진다 (슈어소프트테크 gnbBar). 꾸밈이라 읽지 않는다 */}
              <li className={s.gnbBar} aria-hidden="true" data-on={(gnbOpen && hoverIdx !== null) || undefined} style={{ transform: `translateX(${bar.left}px)`, width: bar.width }} />
            </ul>
          </nav>
          <div className={s.tools}>
            <AccountTools />
            <button ref={searchBtnRef} type="button" className={s.iconBtn} aria-haspopup="dialog" aria-expanded={searchOpen} aria-keyshortcuts="Control+K Meta+K" onClick={openSearch}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="6.5" />
                <path d="M16 16l4.5 4.5" />
              </svg>
              <span className="visually-hidden">검색 열기</span>
            </button>
            <button
              ref={menuBtnRef}
              type="button"
              className={s.iconBtn}
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              onClick={() => {
                setGnbAt(null)
                setMenuAt(here)
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
              <span className="visually-hidden">전체 메뉴 열기</span>
            </button>
          </div>
        </div>
        {/* 가운데 메뉴의 아래 칸 뒤 흰 판 (꾸밈) */}
        <div className={s.gnbPanel} aria-hidden="true" />
      </header>
      {/* 전체 메뉴 안에서 연 검색을 닫으면 메뉴는 이미 닫혀 있다: 초점은 머리말의 메뉴 버튼으로 */}
      <SearchDialog open={searchOpen} onClose={() => setSearchAt(null)} returnFallbacks={[searchBtnRef, menuBtnRef]} />
      <SitemapMenu open={menuOpen} onClose={() => setMenuAt(null)} onSearch={openSearch} />
    </>
  )
}
