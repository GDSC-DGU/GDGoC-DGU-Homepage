import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/authContext'
import { loginPath } from '@/features/auth/session'
import { useHerePath } from '@/hooks/useHerePath'
import s from './layout.module.css'

/**
 * 머리말 오른쪽 로그인 자리 (F-COM-001 동작 4 · 5).
 * - 로그인 전: [로그인] → 로그인 화면(P-COM-010) → 끝나면 보던 페이지로
 * - 로그인: 이름 버튼(1440 미만은 사람 그림만) → 펼침: 이름 · (운영진이면 [관리자 페이지]) · [로그아웃]
 *   가운데 메뉴가 벌어질 때 겹치지 않게 머리말에는 한 칸만 둔다 (슈어소프트테크 머리말처럼 오른쪽은 작게)
 * - 작성 중에 로그인 1시간이 끝났으면: [다시 로그인] (새 탭)
 * 로그인 상태를 되찾는 동안(loading)은 비워 둔다 (로그인 버튼이 잠깐 보였다 사라지지 않게).
 */
export function AccountTools() {
  const auth = useAuth()
  const here = useHerePath()

  if (auth.status === 'loading') return null
  // 작성 중에 1시간이 끝남: 이 화면은 두고 새 탭에서 다시 로그인 (그 탭에서 로그인하면 이 탭도 로그인된다)
  if (auth.status === 'expired') {
    return (
      <Link className={s.account} to={loginPath('/', { done: 'tab' })} target="_blank" rel="noopener">
        다시 로그인<span className="visually-hidden"> (새 탭)</span>
      </Link>
    )
  }
  if (!auth.user) {
    if (here.startsWith('/login')) return null
    return (
      <Link className={s.account} to={loginPath(here)}>
        로그인
      </Link>
    )
  }
  return <AccountMenu name={auth.user.name} isAdmin={auth.isAdmin} onLogout={auth.logout} />
}

/** 이름 버튼 + 펼침 판. 바깥을 누르거나 Esc · 초점이 나가거나 주소가 바뀌면 닫힌다 */
function AccountMenu({ name, isAdmin, onLogout }: { name: string; isAdmin: boolean; onLogout: () => Promise<void> }) {
  const { pathname } = useLocation()
  // 연 주소를 기억해서, 주소가 바뀌면 저절로 닫힌다 (Sidebar 와 같은 방식)
  const [openAt, setOpenAt] = useState<string | null>(null)
  const open = openAt === pathname
  const [leaving, setLeaving] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpenAt(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpenAt(null)
      btnRef.current?.focus()
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const logout = async () => {
    setLeaving(true)
    try {
      await onLogout()
    } finally {
      setLeaving(false)
      setOpenAt(null)
    }
  }

  return (
    <div
      ref={wrapRef}
      className={s.accountMenu}
      onBlur={(e) => {
        if (open && !e.currentTarget.contains(e.relatedTarget as Node | null)) setOpenAt(null)
      }}
    >
      <button ref={btnRef} type="button" className={s.accountToggle} aria-expanded={open} aria-controls={panelId} onClick={() => setOpenAt(open ? null : pathname)}>
        <svg className={s.accountIcon} viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="8.5" r="3.8" />
          <path d="M4.5 20c1.2-3.6 4.1-5.5 7.5-5.5s6.3 1.9 7.5 5.5" />
        </svg>
        <span className={s.accountToggleName} aria-hidden="true">
          {name}
        </span>
        <svg className={s.accountCaret} viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 6l4 4 4-4" />
        </svg>
        <span className="visually-hidden">계정 메뉴 ({name})</span>
      </button>
      <div id={panelId} className={`on-light ${s.accountPanel}`} hidden={!open}>
        <p className={s.accountPanelName}>
          {name}
          <span className={s.accountPanelRole}>{isAdmin ? '운영진' : '회원'}</span>
        </p>
        {isAdmin && (
          <Link className={s.accountPanelItem} to="/admin" onClick={() => setOpenAt(null)}>
            관리자 페이지
          </Link>
        )}
        <button type="button" className={s.accountPanelItem} disabled={leaving} onClick={() => void logout()}>
          로그아웃
        </button>
      </div>
    </div>
  )
}
