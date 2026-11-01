import { screenById, type AdminScreenId } from '../screens'
import { PageHeader } from './PageHeader'
import { StatusBadge } from './StatusBadge'
import s from './layout.module.css'

/**
 * '이 화면은 만드는 중' 자리. 2단계가 구역 폴더의 페이지를 채우면 이 부품을 지운다.
 * 무엇이 들어올지(명세 화면 ID · 와이어프레임 · 기능 · 팝업 · 파일 위치)를 적어 둔다.
 */
export function ScreenPlaceholder({ screenId }: { screenId: AdminScreenId }) {
  const screen = screenById(screenId)
  return (
    <>
      <PageHeader title={screen.title} description={screen.summary} />
      <section className={s.placeholder} aria-labelledby="placeholder-title">
        <div>
          <StatusBadge tone="pending">만드는 중</StatusBadge>
        </div>
        <h2 id="placeholder-title" className={s.placeholderTitle}>
          이 화면은 만드는 중입니다
        </h2>
        <dl className={s.placeholderFacts}>
          <dt>화면</dt>
          <dd>
            {screen.id} · 와이어프레임 {screen.figma}
          </dd>
          <dt>기능</dt>
          <dd>{screen.functions}</dd>
          {screen.popups && (
            <>
              <dt>팝업</dt>
              <dd>{screen.popups.join(', ')}</dd>
            </>
          )}
          {screen.section && (
            <>
              <dt>파일</dt>
              <dd>
                <code>
                  src/features/admin/{screen.section}/index.ts → {screen.page}
                </code>
              </dd>
            </>
          )}
        </dl>
      </section>
    </>
  )
}
