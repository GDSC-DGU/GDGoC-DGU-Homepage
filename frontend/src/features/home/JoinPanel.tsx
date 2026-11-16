import { SITE } from '@/config/site'
import { HOME_JOIN } from '@/content/home'
import { applyTarget, recruitStatus } from '@/content/recruitingStatus'
import { useToday } from '@/hooks/useToday'
import { HomeHead, MoreLink } from './HomeHead'
import { fill } from './homeData'
import { aos } from './useReveal'
import s from './joinPanel.module.css'

/**
 * 5 지원 띠 (슈어소프트테크 'Contact'): 화면 양옆 3% 만 남긴 둥근(30) 먹색 판, 위아래 160.
 * 가운데 이름표 → 한 문장 → 한 줄 → 흰 테두리 알약 단추. 주 단추는 모집 중이면 '지원서 쓰기'(지원서 주소가 있을 때만), 아니면 '지원 안내 보기'.
 * 떠오르기: 이름표 200 · 제목 250 · 한 줄 300 · 단추 350ms (그 사이트 값).
 */
export function JoinPanel() {
  const today = useToday()
  const st = recruitStatus(today)
  const apply = applyTarget(st)
  return (
    <section className={s.section} aria-labelledby="join-title">
      <div className={`on-dark ${s.panel}`}>
        <HomeHead id="join-title" eng={HOME_JOIN.eng} title={HOME_JOIN.title} tone="dark" center />
        <p className={s.sub} {...aos(300)}>
          {fill(HOME_JOIN.sub, { next: st.generation, handle: SITE.links.instagramHandle })}
        </p>
        <div className={s.actions} {...aos(350)}>
          <MoreLink to={apply ? apply.href : '/recruits'} tone="dark">
            {apply ? HOME_JOIN.apply : HOME_JOIN.guide}
          </MoreLink>
          <MoreLink to={st.channelUrl} tone="dark">
            {HOME_JOIN.instagram}
          </MoreLink>
        </div>
      </div>
    </section>
  )
}
