import { Link } from 'react-router-dom'
import s from './crumbs.module.css'

/**
 * 지금 위치 한 줄 (dcamp: '⌂ › About › Who we are'). 마지막 칸이 지금 페이지.
 * tone='dark' 는 검정 머리 위 흰 글자.
 */
export function Crumbs({ trail, tone = 'light' }: { trail: readonly string[]; tone?: 'light' | 'dark' }) {
  return (
    <nav className={s.crumbs} data-tone={tone} aria-label="지금 위치">
      <ol>
        <li>
          <Link to="/" className={s.home}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 10.5 12 4l8 6.5V20h-5.5v-5.5h-5V20H4z" />
            </svg>
            <span className="visually-hidden">홈</span>
          </Link>
        </li>
        {trail.map((t, i) => (
          <li key={t} aria-current={i === trail.length - 1 ? 'page' : undefined}>
            {t}
          </li>
        ))}
      </ol>
    </nav>
  )
}
