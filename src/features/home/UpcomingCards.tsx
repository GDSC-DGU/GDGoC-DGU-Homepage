import { Link } from 'react-router-dom'
import { KIND_LABEL } from '@/config/kinds'
import { EVENTS } from '@/content'
import { withoutStalePlans } from '@/content/plan'
import { useSchedule } from '@/data/queries'
import { useToday } from '@/hooks/useToday'
import s from './upcomingCards.module.css'

const dot = (ymd: string) => ymd.replaceAll('-', '.')
const LIMIT = 4

/**
 * 홈 '다가오는 일정' (dcamp 홈 'Accelerating your growth': 따뜻한 회색 면, 왼쪽 영문 세 줄 | 오른쪽 흰 정사각 카드가 엇갈려 쌓인다).
 * 카드마다 일정 이름 → 종류(주황) → 아래 날짜. 제목 위 이름표는 두지 않는다 (hallmark 54). 누르면 소개의 다가오는 일정으로.
 * 일정은 events.json (서버에서 받기 전에는 저장소 스냅샷). 휴회 · 지난 계획은 뺀다.
 */
export function UpcomingCards() {
  const today = useToday()
  const { data } = useSchedule()
  const list = withoutStalePlans(data ?? EVENTS, today)
    .filter((e) => e.kind !== 'rest' && (e.endDate ?? e.date) >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, LIMIT)
  if (list.length === 0) return null
  return (
    <section className={s.section} aria-labelledby="upcoming-cards-title">
      <div className={`container ${s.grid}`}>
        <div className={s.head}>
          <h2 id="upcoming-cards-title" className={s.title} lang="en">
            Learn every Tuesday
            <br />
            Build in G-Sprint
            <br />
            Driven by GDGoC DGU
          </h2>
          <p className={s.sub}>다가오는 일정</p>
          <Link className={s.more} to="/about#upcoming">
            일정 전체 보기 
          </Link>
        </div>
        <ul className={s.cards}>
          {list.map((e) => (
            <li key={e.id} className={s.item}>
              <Link className={s.card} to="/about#upcoming">
                <span className={s.name}>{e.title}</span>
                <span className={s.kind}>{KIND_LABEL[e.kind]}</span>
                <span className={`num ${s.when}`}>
                  {dot(e.date)}
                  {e.endDate && e.endDate !== e.date ? ` ~ ${dot(e.endDate)}` : ''}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
