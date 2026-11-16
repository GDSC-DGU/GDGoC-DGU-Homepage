import { Link } from 'react-router-dom'
import { SITE } from '@/config/site'
import { HOME_JOIN } from '@/content/home'
import { applyTarget, recruitStatus } from '@/content/recruitingStatus'
import { useToday } from '@/hooks/useToday'
import { fill } from './homeData'
import { aos } from './useReveal'
import s from './joinPanel.module.css'

/**
 * 5 지원 띠 (슈어소프트테크 'Contact'): 틀 안의 둥근 먹색 판, 가운데 한 문장 + 한 줄 + 버튼 둘.
 * 주 버튼은 모집 중이면 '지원서 쓰기'(지원서 주소가 있을 때만), 아니면 '지원 안내 보기'. 두 번째 버튼은 인스타그램.
 */
export function JoinPanel() {
  const today = useToday()
  const st = recruitStatus(today)
  const apply = applyTarget(st)
  return (
    <section className={s.section} aria-labelledby="join-title">
      <div className="container">
        <div className={`on-dark ${s.panel}`}>
          <h2 id="join-title" className={s.title} {...aos(250)}>
            {HOME_JOIN.title}
          </h2>
          <p className={s.sub} {...aos(300)}>{fill(HOME_JOIN.sub, { next: st.generation, handle: SITE.links.instagramHandle })}</p>
          <div className={s.actions} {...aos(350)}>
            {apply ? (
              apply.external ? (
                <a className="btn-primary" href={apply.href} target="_blank" rel="noreferrer">
                  {HOME_JOIN.apply}
                  <span className="visually-hidden"> (새 창)</span>
                </a>
              ) : (
                <Link className="btn-primary" to={apply.href}>
                  {HOME_JOIN.apply}
                </Link>
              )
            ) : (
              <Link className="btn-primary" to="/recruits">
                {HOME_JOIN.guide}
              </Link>
            )}
            <a className="btn-secondary" href={st.channelUrl} target="_blank" rel="noreferrer">
              {HOME_JOIN.instagram}
              <span className="visually-hidden"> (새 창)</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
