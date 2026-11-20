import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/app/router'
import { RepositoryProvider } from '@/data/RepositoryProvider'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { CampusProvider } from '@/state/CampusProvider'
import '@/styles/global.css'

/** 로그인 상태는 라우터 밖에서 공개 사이트 · 관리자 화면을 함께 감싼다. 주소 이동은 router 로 */
const navigate = (to: string) => void router.navigate(to)
const currentPath = () => {
  const { pathname, search, hash } = router.state.location
  return `${pathname}${search}${hash}`
}
/** 새 탭으로 여는 링크 주소 (hash 주소 미리보기에서는 #/login…) */
const toHref = (to: string) => {
  try {
    return router.createHref(new URL(to, window.location.origin))
  } catch {
    return to
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RepositoryProvider>
      <AuthProvider navigate={navigate} currentPath={currentPath} toHref={toHref}>
        <CampusProvider>
          <RouterProvider router={router} />
        </CampusProvider>
      </AuthProvider>
    </RepositoryProvider>
  </StrictMode>,
)
