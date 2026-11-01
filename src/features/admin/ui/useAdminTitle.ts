import { useEffect } from 'react'

/** 브라우저 탭 제목: '사용자 관리 · 관리자 (예시) · GDGoC DGU'. 화면을 떠나면 원래 제목으로 */
export const adminTitle = (page?: string) => [page, '관리자 (예시)', 'GDGoC DGU'].filter(Boolean).join(' · ')

export function useAdminTitle(page?: string) {
  useEffect(() => {
    const prev = document.title
    document.title = adminTitle(page)
    return () => {
      document.title = prev
    }
  }, [page])
}
