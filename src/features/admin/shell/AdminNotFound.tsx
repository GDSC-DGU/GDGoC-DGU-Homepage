import { Link, useLocation } from 'react-router-dom'
import { EmptyState, PageHeader } from '../ui'

/** 관리자 틀 안의 없는 주소 */
export function AdminRoutesNotFound() {
  const { pathname } = useLocation()
  return (
    <>
      <PageHeader title="이 주소에는 관리자 화면이 없습니다" documentTitle="찾을 수 없음" meta={<>요청한 주소 {pathname}</>} />
      <EmptyState
        title="왼쪽 메뉴에서 찾던 화면을 골라 주세요."
        action={
          <Link className="link-go" to="/admin">
            대시보드로 가기
          </Link>
        }
      />
    </>
  )
}
