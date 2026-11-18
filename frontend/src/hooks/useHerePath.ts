import { useLocation } from 'react-router-dom'

/** 지금 주소 (주소 · 검색 · # 까지). 로그인 뒤 돌아올 곳으로 쓴다 */
export function useHerePath(): string {
  const { pathname, search, hash } = useLocation()
  return `${pathname}${search}${hash}`
}
