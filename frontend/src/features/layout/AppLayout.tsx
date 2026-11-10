import { useEffect } from 'react'
import { Outlet, ScrollRestoration } from 'react-router-dom'
import { preloadPages } from '@/app/pageModules'
import { PlacePreviewProvider } from './PlacePreviewProvider'
import { SiteFooter } from './SiteFooter'
import { SiteHeader } from './SiteHeader'

/** 첫 화면을 다 그리고 한가할 때 나머지 페이지 파일을 받아 둔다 (메뉴를 누르면 빈 화면 없이 바로 바뀌게) */
function usePreloadPages() {
  useEffect(() => {
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(preloadPages, { timeout: 4000 })
      return () => window.cancelIdleCallback(id)
    }
    const id = window.setTimeout(preloadPages, 2000)
    return () => window.clearTimeout(id)
  }, [])
}

/**
 * 모든 페이지의 틀: 본문 바로가기 + 머리말 + 본문 + 꼬리말(먹색).
 * 페이지 끝 '{gen}기에서 만나요'(common/JoinStrip)는 여기서 붙이지 않고 각 페이지가 <main> 맨 끝에 직접 넣는다
 * (페이지마다 변형 · 생략이 다르다: /teams 는 variant="teams", /recruits 는 없음).
 * 본문이 이야기 섹션(.story)으로 끝나면 꼬리말이 위 여백 없이 바로 붙는다 (layout.module.css).
 */
export function AppLayout() {
  usePreloadPages()
  return (
    <PlacePreviewProvider>
      {/* hash 주소(#/…)를 쓰는 미리보기에서도 동작하도록 링크 대신 버튼으로 초점을 옮긴다 */}
      <button type="button" className="skip-link" onClick={() => document.getElementById('main')?.focus()}>
        본문 바로가기
      </button>
      <SiteHeader />
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <SiteFooter />
      <ScrollRestoration />
    </PlacePreviewProvider>
  )
}
