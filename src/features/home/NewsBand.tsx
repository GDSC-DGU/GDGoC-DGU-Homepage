import { SITE } from '@/config/site'
import { RECRUITING } from '@/content'
import s from './newsBand.module.css'

/**
 * 홈 끝 소식 띠 (dcamp 홈 '놓치면 아쉬운 소식과 스타트업 뉴스, 디캠프가 알려드려요'): 따뜻한 회색 면,
 * 왼쪽 큰 문장(이름만 주황) · 주황 말풍선 | 오른쪽 인스타그램 버튼. 뉴스레터가 없어 인스타그램으로 받는다.
 */
export function NewsBand() {
  const gen = RECRUITING.current.generation
  return (
    <section className={s.band} aria-labelledby="news-band-title">
      <div className={`container ${s.inner}`}>
        <div>
          <h2 id="news-band-title" className={s.title}>
            놓치면 아쉬운 {gen}기 모집 · 행사 소식,
            <br />
            <span className={s.name}>{SITE.shortName}</span>가 알려 드립니다
          </h2>
          <p className={s.bubble}>인스타그램 {SITE.links.instagramHandle}</p>
        </div>
        <a className={s.cta} href={RECRUITING.current.channel} target="_blank" rel="noreferrer">
          {gen}기 소식 받기<span className="visually-hidden"> (인스타그램, 새 창)</span>
          <span aria-hidden="true">↗</span>
        </a>
      </div>
    </section>
  )
}
