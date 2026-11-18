import { Suspense, useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/authContext'
import { ADMIN_ONLY, loginPath } from '@/features/auth/session'
import { useAdminAuth } from '../auth/authContext'
import { canAccessPath } from '../data/permissions'
import { useResetExampleData } from '../data/useAdminData'
import { Button, useToast } from '../ui'
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
 * 운영진만 (F-AUTH-007 · F-COM-003 규칙 2).
 * - 로그인하지 않았으면 공개 로그인 화면(/login)으로. 로그인하면 원래 가려던 관리자 주소로 돌아온다
 * - 일반 회원이면 '운영진만 쓸 수 있는 페이지예요.' 안내 후 홈으로
 * - 권한 없는 주소에 직접 들어오면 대시보드로
 */
export function RequireAdmin() {
  const auth = useAdminAuth()
  const location = useLocation()
  const here = `${location.pathname}${location.search}${location.hash}`
  if (auth.status === 'loading') return <AdminLoading full label="로그인 상태를 확인하는 중입니다" />
  if (auth.status === 'guest') return <Redirect to={loginPath(here)} />
  if (auth.status === 'denied') return <DeniedToHome />
  if (auth.status === 'unavailable' || !auth.me) return <ExampleAdminUnavailable />
  if (!canAccessPath(auth.me.role, location.pathname)) return <Redirect to="/admin" state={{ denied: location.pathname }} />
  return <AdminLayout />
}

/** 일반 회원: 화면 아래 안내를 띄우고 홈으로 (안내는 공개 사이트에서도 보인다) */
function DeniedToHome() {
  const { notify } = useAuth()
  useEffect(() => {
    notify(ADMIN_ONLY)
  }, [notify])
  return <Redirect to="/" />
}

/** 운영진인데 예시 데이터의 운영진A 를 쓸 수 없을 때 (예시 데이터에서 비활성으로 바꾼 경우 등) */
function ExampleAdminUnavailable() {
  const reset = useResetExampleData()
  return (
    <div className={`${a.loading} ${a.full}`}>
      <div className={a.error} role="alert">
        <p>관리자 화면 예시 데이터에서 운영진A 계정을 쓸 수 없습니다. 예시 데이터를 처음으로 되돌리면 다시 들어갈 수 있습니다.</p>
        <Button variant="secondary" size="md" onClick={() => void reset()}>
          예시 데이터 처음으로
        </Button>
      </div>
    </div>
  )
}

/**
 * 관리자 틀 (공개 사이트 AppLayout 밖): 본문 바로가기 · 사이드바 · 1024 미만 안내 · 본문.
 * 주소가 바뀌면 본문으로 초점을 옮긴다 (키보드 · 화면 읽기 사용자가 메뉴를 다시 지나지 않게).
 */
function AdminLayout() {
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
          <AdminErrorBoundary resetKey={location.pathname} onResetData={resetData}>
            <Suspense fallback={<AdminLoading label="화면을 불러오는 중입니다" />}>
              <Outlet />
            </Suspense>
          </AdminErrorBoundary>
        </div>
      </main>
    </div>
  )
}
