import { useEffect, type ReactNode } from 'react'
import { ScrollRestoration, useLocation } from 'react-router-dom'
import { AdminAuthProvider } from './auth/AdminAuthProvider'
import { AdminDataProvider } from './data/AdminDataProvider'
import { useResetExampleData } from './data/useAdminData'
import { AdminRoutes } from './routes'
import { AdminErrorBoundary } from './shell/AdminErrorBoundary'
import { FeedbackProvider } from './ui/FeedbackProvider'
import s from './shell/admin.module.css'

/** 관리자 화면은 검색 결과에 나오지 않게 (예시 화면이 실제 운영 화면처럼 퍼지지 않도록) */
function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])
}

function RootBoundary({ children }: { children: ReactNode }) {
  const reset = useResetExampleData()
  const { pathname } = useLocation()
  return (
    <AdminErrorBoundary resetKey={pathname} onResetData={reset}>
      {children}
    </AdminErrorBoundary>
  )
}

/**
 * 관리자 화면 입구 (/admin/*). app/router.tsx 가 이 파일을 늦게 받는다(lazy): 공개 페이지 첫 JS 에 들어가지 않는다.
 * 데이터(예시 store + repos) → 로그인 상태 → 토스트 · 확인 팝업 → 오류 안내 → 하위 라우트.
 */
export function AdminRoot() {
  useNoIndex()
  return (
    <div className={s.root}>
      <AdminDataProvider>
        <AdminAuthProvider>
          <FeedbackProvider>
            <RootBoundary>
              <AdminRoutes />
            </RootBoundary>
          </FeedbackProvider>
        </AdminAuthProvider>
      </AdminDataProvider>
      <ScrollRestoration />
    </div>
  )
}
