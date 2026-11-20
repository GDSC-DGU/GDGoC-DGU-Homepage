import { NavLink } from 'react-router-dom'
import { APPLY_PLACE, PLACE_BY_ID, SOON_LABEL, SOON_PLACES } from '@/config/places'
import { RECRUITING } from '@/content'
import { applyTarget, recruitStatus } from '@/content/recruitingStatus'
import type { PlaceId } from '@/domain/types'
import { useToday } from '@/hooks/useToday'
import { daysUntil, monthDay } from '@/lib/date'
import s from './layout.module.css'

type Where = 'wide' | 'bar' | 'sheet'

const place = PLACE_BY_ID[APPLY_PLACE]
const generation = RECRUITING.current.generation

/** '10.31 마감' · 오늘이면 '오늘 마감' */
function dueLabel(deadline: string | undefined, today: string): string | null {
  if (!deadline) return null
  return daysUntil(deadline, today) === 0 ? '오늘 마감' : `${monthDay(deadline)} 마감`
}

/**
 * 머리말 · 폰 메뉴의 지원 행동. 모집 상태(content/recruitingStatus.ts)를 따른다.
 * 모양은 두 번째 버튼(옅은 면) 작은 크기. 지원 안내 페이지에 있으면 먹색 바탕 · 흰 글자로 '지금 여기'.
 * - 모집 중(open): '지원서 쓰기' + 마감일 (머리말은 두 번째 버튼, 폰 메뉴 시트만 먹색). 지원서 주소가 있으면 바로 지원서(새 창), 사이트 안 지원서가 열려 있으면 /recruits/apply, 둘 다 아니면 지원 안내 페이지 (applyTarget)
 * - 그 밖(unscheduled · soon · ended): '지원 안내'. 상태 점(장소색 네모)을 달지 않는다
 *   ('지금 열려 있다'로 읽혔다: 2026-10 리뷰). 열렸는지 · 언제 여는지는 지원 안내 페이지가 말한다
 * where: wide = 넓은 화면 머리말 오른쪽 끝 · bar = 폰 머리말 (아주 좁은 폰에서는 숨김) · sheet = 폰 메뉴 시트 아래 폭 가득
 */
export function ApplyLink({ where, onHover, onClick }: { where: Where; onHover?: (id: PlaceId | null) => void; onClick?: () => void }) {
  const today = useToday()
  const st = recruitStatus(today)
  const open = st.state === 'open'
  const due = open ? dueLabel(st.deadline, today) : null

  const shape = where === 'sheet' ? s.applySheet : `btn-secondary btn-sm ${s.apply} ${where === 'bar' ? s.applyBar : s.applyWide}`
  // 머리말에서는 모집 중에도 두 번째 버튼으로 둔다: 홈 · 지원 안내 첫 화면에 먹색 '지원서 쓰기' 주 버튼이 이미 있어서
  // 한 화면에 주 버튼이 둘이 되지 않게 (DESIGN 7장). 폰 메뉴 시트에서만 먹색으로 채운다
  const cls = `${shape} ${open && where === 'sheet' ? s.applyNow : ''}`
  const hover = onHover && {
    onMouseEnter: () => onHover(APPLY_PLACE),
    onMouseLeave: () => onHover(null),
    onFocus: () => onHover(APPLY_PLACE),
    onBlur: () => onHover(null),
  }

  const name = open ? '지원서 쓰기' : place.label
  // 시트의 오른쪽 설명: 모집 중이면 마감일, 열릴 날이 정해졌으면 그날, 아니면 페이지가 다루는 것
  const sub = open
    ? [`${generation}기`, due].filter(Boolean).join(' ')
    : st.state === 'soon' && st.opensAt
      ? `${monthDay(st.opensAt)}부터 ${generation}기 지원`
      : '모집 일정과 지원 방법'

  const body = (
    <>
      <span className={s.applyName}>{name}</span>
      {where === 'sheet' ? (
        <span className={s.applySub}>{sub}</span>
      ) : (
        due && (
          // 폰 머리말에는 자리가 없어 읽기 전용으로만 (시트에서 보인다)
          <span className={where === 'bar' ? 'visually-hidden' : s.applyDue}>
            {where === 'bar' && ', '}
            <span className="num">{due}</span>
          </span>
        )
      )}
    </>
  )

  const target = applyTarget(st)
  if (target?.external) {
    return (
      <a className={cls} href={target.href} target="_blank" rel="noreferrer" onClick={onClick} {...hover}>
        {body}
        <span className="visually-hidden"> ({generation}기 지원서, 새 창)</span>
      </a>
    )
  }
  return (
    <NavLink to={target?.href ?? place.path} className={({ isActive }) => `${cls} ${isActive ? s.applyActive : ''}`} onClick={onClick} {...hover}>
      {body}
    </NavLink>
  )
}

/** 아직 열지 않은 장소 이름 옆의 작은 '준비 중' 표시 (꼬리말 둘러보기. 머리말 메뉴 · 폰 메뉴에는 달지 않는다) */
export function SoonTag({ place: id }: { place: PlaceId }) {
  if (!SOON_PLACES.has(id)) return null
  return (
    <>
      {/* 읽을 때 '팀원 찾기, 준비 중' 으로 끊어지게 */}
      <span className="visually-hidden">, </span>
      <span className={s.soon}>{SOON_LABEL}</span>
    </>
  )
}
