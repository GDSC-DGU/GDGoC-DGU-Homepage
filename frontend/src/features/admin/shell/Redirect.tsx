import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * 다른 주소로 바로 옮긴다 (기록을 바꿔치기, 뒤로 가기에 남지 않음).
 * react-router 의 <Navigate> 와 같은 일을 하지만, 공개 사이트가 쓰지 않는 부품을 공통 파일로 끌어오지 않도록 useNavigate 만 쓴다
 * (관리자 코드가 공개 페이지 첫 JS 를 늘리지 않게, docs/ADMIN.md '번들').
 */
export function Redirect({ to, state }: { to: string; state?: unknown }) {
  const navigate = useNavigate()
  useEffect(() => {
    navigate(to, { replace: true, state })
  }, [navigate, to, state])
  return null
}
