import { Suspense, useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAdminAuth, useAdminMe } from '../auth/authContext'
import { PasswordChangeDialog } from '../auth/PasswordChangeDialog'
import { canAccessPath } from '../data/permissions'
import { useResetExampleData } from '../data/useAdminData'
import { useToast } from '../ui'
import { IconInfo } from '../ui/icons'
import { AdminErrorBoundary } from './AdminErrorBoundary'
import { Redirect } from './Redirect'
import { Sidebar } from './Sidebar'
import a from './admin.module.css'
import s from './shell.module.css'

/** 불러오는 중 한 줄 (로그인 확인 · 구역 파일 받기) */
export function AdminLoading({ full, label = '불러오는 중입니다' }: { full?: boolean; label?: string }) {
  return (
    <div className={`${a.loading} ${full ? a.full : ''}`} role="status">
      {label}
    </div>
  )
}

/**
 * 로그인한 관리자만 (F-ACM-001 · 003).
 * - 로그인하지 않았으면 로그인 화면으로 (원래 가려던 주소를 state.from 에 기억 → 로그인 뒤 그리로)
 * - 권한 없는 주소에 직접 들어오면 대시보드로 (F-ACM-003 4)
 */
export function RequireAdmin() {
  const auth = useAdminAuth()
  const location = useLocation()
  if (auth.status === 'loading') return <AdminLoading full label="로그인 상태를 확인하는 중입니다" />
  if (!auth.me) return <Redirect to="/admin/login" state={{ from: `${location.pathname}${location.search}${location.hash}` }} />
  if (!canAccessPath(auth.me.role, location.pathname)) return <Redirect to="/admin" state={{ denied: location.pathname }} />
  return <AdminLayout />
}

/**
 * 관리자 틀 (공개 사이트 AppLayout 밖): 본문 바로가기 · 사이드바 · 1024 미만 안내 · 본문.
 * 임시 비밀번호 상태면 본문 대신 비밀번호 변경 팝업만 (닫을 수 없음, F-ACM-002).
 * 주소가 바뀌면 본문으로 초점을 옮긴다 (키보드 · 화면 읽기 사용자가 메뉴를 다시 지나지 않게).
 */
function AdminLayout() {
  const me = useAdminMe()
  const location = useLocation()
  const toast = useToast()
  const resetData = useResetExampleData()
  const mainRef = useRef<HTMLElement>(null)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    mainRef.current?.focus({ preventScroll: true })
  }, [location.pathname])

  const denied = (location.state as { denied?: string } | null)?.denied
  useEffect(() => {
    if (denied) toast.info('권한이 없는 화면이라 대시보드로 이동했습니다.')
  }, [denied, toast])

  return (
    <div className={s.shell}>
      <button type="button" className="skip-link" onClick={() => mainRef.current?.focus()}>
        본문 바로가기
      </button>
      <Sidebar />
      <main id="admin-main" ref={mainRef} tabIndex={-1} className={s.content}>
        <p className={s.narrow} role="note">
          <IconInfo />
          관리자 화면은 넓은 화면(1024px 이상)에 맞춰져 있습니다. 좁은 화면에서는 표를 옆으로 넘겨 보세요.
        </p>
        <div className={s.main}>
          {me.mustChangePassword ? (
            <p className={s.blocked}>비밀번호를 바꾼 뒤 관리자 화면을 쓸 수 있습니다.</p>
          ) : (
            <AdminErrorBoundary resetKey={location.pathname} onResetData={resetData}>
              <Suspense fallback={<AdminLoading label="화면을 불러오는 중입니다" />}>
                <Outlet />
              </Suspense>
            </AdminErrorBoundary>
          )}
        </div>
      </main>
      <PasswordChangeDialog open={me.mustChangePassword} />
    </div>
  )
}
