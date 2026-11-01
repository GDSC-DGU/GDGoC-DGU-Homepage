import { useId, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { IconArrowLeft } from './icons'
import { useAdminTitle } from './useAdminTitle'
import s from './layout.module.css'

/**
 * 관리자 페이지 머리: (← 돌아가기) · 제목(h1) · 설명 · 기준 줄 | 오른쪽 주 행동.
 * 브라우저 탭 제목도 같이 바꾼다. 주 버튼(variant primary)은 한 화면에 하나.
 *
 *   <PageHeader title="사용자 관리" description="Lead · Core · General 사용자와 관리 권한을 관리합니다."
 *     actions={<Button onClick={openAdd}>사용자 추가</Button>} />
 *   <PageHeader back={{ to: '/admin/users', label: '사용자 관리' }} title="사용자 변경 이력" />
 */
export function PageHeader({
  title,
  description,
  meta,
  actions,
  back,
  documentTitle,
}: {
  title: ReactNode
  description?: ReactNode
  /** 기준 줄 ('오늘 2026.11.01 (일) 기준' · '마지막 저장 10:42') */
  meta?: ReactNode
  actions?: ReactNode
  back?: { to: string; label: string }
  /** 탭 제목 (title 이 글자가 아닐 때) */
  documentTitle?: string
}) {
  useAdminTitle(documentTitle ?? (typeof title === 'string' ? title : undefined))
  return (
    <header className={s.header}>
      <div className={s.headerText}>
        {back && (
          <Link to={back.to} className={s.back}>
            <IconArrowLeft />
            {back.label}
          </Link>
        )}
        <h1 className={s.title}>{title}</h1>
        {description && <p className={s.description}>{description}</p>}
        {meta && <p className={s.meta}>{meta}</p>}
      </div>
      {actions && <div className={s.actions}>{actions}</div>}
    </header>
  )
}

/**
 * 흰 판: 한 영역(대시보드 카드 · 콘텐츠 관리의 세 영역 · 상세의 묶음)을 제목(h2)과 함께 묶는다.
 *   <Panel title="새로운 게시글" actions={<Link className="link" to="…">전체 보기</Link>}>…</Panel>
 * flush: 안에 표 · 목록을 꽉 채울 때 (안쪽 여백 없음)
 */
export function Panel({
  title,
  titleId,
  description,
  actions,
  flush,
  headingLevel = 2,
  className,
  children,
}: {
  title: ReactNode
  titleId?: string
  description?: ReactNode
  actions?: ReactNode
  flush?: boolean
  headingLevel?: 2 | 3
  className?: string
  children: ReactNode
}) {
  const auto = useId()
  const headingId = titleId ?? auto
  const H = headingLevel === 3 ? 'h3' : 'h2'
  return (
    <section className={`${s.panel} ${className ?? ''}`} aria-labelledby={headingId}>
      <div className={s.panelHead}>
        <div>
          <H id={headingId} className={s.panelTitle}>
            {title}
          </H>
          {description && <p className={s.panelDesc}>{description}</p>}
        </div>
        {actions}
      </div>
      <div className={`${s.panelBody} ${flush ? s.flush : ''}`}>{children}</div>
    </section>
  )
}

/**
 * 빈 상태: 목록이 비었을 때 · 검색 결과가 없을 때 (명세 문구 '검색 결과가 없습니다.').
 * 표 안에서는 DataTable 의 empty 로 넘긴다.
 */
export function EmptyState({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className={s.empty}>
      <p className={s.emptyTitle}>{title}</p>
      {description && <p className={s.emptyDesc}>{description}</p>}
      {action && <div className={s.emptyAction}>{action}</div>}
    </div>
  )
}
