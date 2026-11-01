import { useId, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { PLACE_BY_ID } from '@/config/places'
import { SITE } from '@/config/site'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useAdminAuth, useAdminMe } from '../auth/authContext'
import { Button } from '../ui'
import { isGroup, visibleMenu } from './menu'
import { SampleData } from './SampleData'
import s from './shell.module.css'

/** 관리자 화면이 맞춰진 폭(1024) 미만: 사이드바를 위 띠로 접고 안내를 띄운다 (shell.module.css 와 같은 값) */
const ADMIN_NARROW_QUERY = '(max-width: 1023px)'

/**
 * 관리자 사이드바 (P-ACM-02, F-ACM-003 · 004).
 * 위: 이름 · 예시 표시 / 가운데: 권한별 메뉴 (지금 메뉴 강조) / 아래: '운영진A · Lead' · [로그아웃] · 홈페이지로 이동.
 * 1024 미만에서는 위 띠로 접히고 [메뉴] 버튼으로 연다 (주소가 바뀌면 다시 접는다).
 */
export function Sidebar() {
  const me = useAdminMe()
  const auth = useAdminAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  // 좁은 화면의 메뉴 펼침: 연 주소를 기억해서, 주소가 바뀌면 저절로 접힌다
  const [openAt, setOpenAt] = useState<string | null>(null)
  const open = openAt === pathname
  // 1024 미만에서만 메뉴를 접는다 (넓은 화면은 늘 펼침, 접기 버튼도 없음)
  const narrow = useMediaQuery(ADMIN_NARROW_QUERY)
  const [leaving, setLeaving] = useState(false)
  const panelId = useId()
  const menu = visibleMenu(me.role)

  const logout = async () => {
    setLeaving(true)
    try {
      await auth.logout()
      navigate('/admin/login', { replace: true })
    } finally {
      setLeaving(false)
    }
  }

  return (
    <div className={s.sideCol}>
      <aside className={s.sidebar} aria-label="관리자 사이드바">
        <div className={s.top}>
          <div className={s.brandRow}>
            <Link to="/admin" className={s.brand}>
              <span lang="en">{SITE.shortName}</span>
              <span className={s.brandSub}>관리자</span>
            </Link>
            {narrow && (
              <Button variant="secondary" size="xs" aria-expanded={open} aria-controls={panelId} onClick={() => setOpenAt(open ? null : pathname)}>
                {open ? '메뉴 닫기' : '메뉴'}
              </Button>
            )}
          </div>
          <SampleData />
        </div>

        <div id={panelId} className={s.collapsible} hidden={narrow && !open}>
          <nav className={s.nav} aria-label="관리자 메뉴">
            <ul className={s.navList}>
              {menu.map((m) =>
                isGroup(m) ? (
                  <li key={m.label}>
                    <span className={s.groupLabel} id={`menu-${m.area}`}>
                      {m.label}
                    </span>
                    <ul className={s.subList} aria-labelledby={`menu-${m.area}`}>
                      {m.children.map((c) => (
                        <li key={c.to}>
                          <NavLink to={c.to} end={c.end} className={s.link}>
                            {c.label}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  </li>
                ) : (
                  <li key={m.to}>
                    <NavLink to={m.to} end={m.end} className={s.link}>
                      {m.label}
                    </NavLink>
                  </li>
                ),
              )}
            </ul>
          </nav>

          <div className={s.account}>
            {/* F-ACM-003 1) 표시 형식: '운영진A · Lead' */}
            <p className={s.accountName}>
              <span className="visually-hidden">로그인한 계정 </span>
              {me.name} <span className={s.accountRole}>· {me.role}</span>
            </p>
            <div className={s.accountActions}>
              <Button variant="secondary" size="xs" busy={leaving} onClick={() => void logout()}>
                로그아웃
              </Button>
              {/* F-ACM-004 2) 로그인 상태를 유지한 채 홈으로 */}
              <Link to={PLACE_BY_ID.about.path} className={s.homeLink}>
                홈페이지로 이동
              </Link>
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
