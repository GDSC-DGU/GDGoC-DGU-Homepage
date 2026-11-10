import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { SITE } from '@/config/site'
import { CHAPTER } from '@/content'
import { PageHead } from './PageParts'
import s from './pages.module.css'

/**
 * 화면을 그리다 오류가 났을 때. 이 화면은 AppLayout 대신 그려지므로 머리말 · 꼬리말이 없다.
 * 그래서 혼자서도 읽히게: 본문(main) · 이름 · 홈 링크 · 연락처를 직접 둔다.
 */
export function ErrorPage() {
  const error = useRouteError()
  const notFound = isRouteErrorResponse(error) && error.status === 404
  if (import.meta.env.DEV) console.error(error)
  return (
    <main id="main" className={s.errorMain}>
      <div className={`container ${s.page}`}>
        <Link to="/" className={s.errorBrand}>
          {SITE.shortName}
          <span className="visually-hidden"> 홈</span>
        </Link>
        <PageHead
          wide
          eyebrow={<span className="num">{notFound ? '404' : '오류'}</span>}
          title={notFound ? '이 주소에는 페이지가 없습니다' : '화면을 불러오지 못했습니다'}
          lead={
            notFound
              ? '주소가 바뀌었거나 없는 페이지입니다.'
              : '잠시 뒤 새로고침해 주세요. 계속 같은 화면이 나오면 운영진에게 알려 주시면 고치겠습니다.'
          }
          meta={
            <>
              연락{' '}
              <a className="link num" href={`mailto:${CHAPTER.email}`}>
                {CHAPTER.email}
              </a>
            </>
          }
        />
        <div className={s.errorActions}>
          {!notFound && (
            <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
              새로고침
            </button>
          )}
          <Link className="link" to="/">
            홈으로 가기
          </Link>
        </div>
      </div>
    </main>
  )
}
