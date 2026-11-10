import { useEffect } from 'react'

/** 사이트 기본 제목 (index.html 의 <title> 과 같다) */
export const SITE_TITLE = 'GDGoC DGU · 동국대학교 Google Developer Groups on Campus'

/** 브라우저 탭 제목: '팀원 찾기 · GDGoC DGU'. 아무것도 주지 않으면 사이트 기본 제목 */
export const pageTitle = (...parts: Array<string | null | undefined>) => {
  const shown = parts.filter((p): p is string => Boolean(p))
  return shown.length ? [...shown, 'GDGoC DGU'].join(' · ') : SITE_TITLE
}

/** 탭 · 북마크 · 방문 기록에서 페이지를 구별할 수 있게 페이지마다 제목을 단다. 떠나면 기본 제목으로 */
export function usePageTitle(...parts: Array<string | null | undefined>) {
  const title = pageTitle(...parts)
  useEffect(() => {
    document.title = title
    return () => {
      document.title = SITE_TITLE
    }
  }, [title])
}
