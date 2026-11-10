import type { ReactNode } from 'react'
import { Link, type To } from 'react-router-dom'
import { useToday } from '@/hooks/useToday'
import { ticketDate, ticketDday } from './ticketData'
import s from './ticket.module.css'

export interface TicketProps {
  /** 행사 날짜 'YYYY-MM-DD' (한국 날짜). 표에는 '10.27' + 요일, 올해가 아니면 '2027.01.30' */
  date: string
  /** 여러 날 행사의 마지막 날. 그 사이에는 D-day 자리에 '진행 중' */
  endDate?: string | null
  /** 행사 이름 */
  title: ReactNode
  /** 표 맨 앞 작은 글자 ('다음 모임' · '이번 주') */
  kicker?: ReactNode
  /** 제목 아래 한 줄 ('18:00 · 장소 미정'). size='large' 에서만 보인다 */
  meta?: ReactNode
  /** 사이트 안 이동 (표 전체가 링크) */
  to?: To
  /** 사이트 밖 이동 (새 창). to 와 함께 쓰지 않는다 */
  href?: string
  /** large: 커뮤니티 '이번 주' 큰 판 (날짜 --t-num) */
  size?: 'default' | 'large'
  /** 표가 놓인 면. paper · field 위에서는 1px 선을 더하고, dark 위에서는 포커스 링이 옅은 파랑 */
  surface?: 'dark' | 'paper' | 'field'
  /** 오늘 (테스트 · 미리보기용). 비우면 지금 한국 날짜 */
  today?: string
  className?: string
}

/**
 * 일정 표 (DESIGN 7장 · 아트 디렉션 4-6): 다음 모임 한 장.
 * [다음 모임] [10.27 화] [G-Sprint 중간 발표] [D-9]
 * 홈 띠 맨 아래(먹색 면 위)와 커뮤니티 '이번 주'(size='large')가 같은 부품을 쓴다. D-day 는 날짜로 계산한다 (손으로 적지 않는다).
 * 표는 늘 흰 판이다 (.on-light: 먹색 면 안에서도 글자 단계를 밝은 면 값으로 되돌린다).
 */
export function Ticket({ date, endDate, title, kicker, meta, to, href, size = 'default', surface = 'dark', today: todayProp, className = '' }: TicketProps) {
  const now = useToday()
  const today = todayProp ?? now
  const { day, week } = ticketDate(date, today)
  const dday = ticketDday(date, endDate, today)
  const cls = `on-light ${s.ticket} ${size === 'large' ? s.large : ''} ${to || href ? s.linked : ''} ${className}`

  const body = (
    <>
      {kicker && <span className={s.kicker}>{kicker}</span>}
      <span className={`num ${s.when}`}>
        {day}
        <small className={s.week}>{week}</small>
      </span>
      <span className={s.title}>{title}</span>
      {meta && size === 'large' && <span className={s.meta}>{meta}</span>}
      <span className={`num ${s.dday}`}>{dday}</span>
    </>
  )

  if (to) {
    return (
      <Link className={cls} to={to} data-surface={surface}>
        {body}
      </Link>
    )
  }
  if (href) {
    return (
      <a className={cls} href={href} target="_blank" rel="noreferrer" data-surface={surface}>
        {body}
        <span className="visually-hidden"> (새 창)</span>
      </a>
    )
  }
  return (
    <div className={cls} data-surface={surface}>
      {body}
    </div>
  )
}
