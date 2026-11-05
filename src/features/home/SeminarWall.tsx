import { Link } from 'react-router-dom'
import { SEMINARS } from '@/content'
import { useSeminars } from '@/data/queries'
import { StorySection } from '@/features/common'
import { latestByGeneration, seminarHref } from '@/features/pages/archive/seminars'
import s from './seminarWall.module.css'

/** 기수마다 거는 발표 수 */
const PER_GEN = 3
const dot = (ymd: string) => ymd.replaceAll('-', '.')

/**
 * 홈 '멤버 세미나' (AI 티 점검 2026-11-05: 지어 쓴 '역량' 카드 네 장 대신 실제 발표 제목).
 * 기수마다 가장 최근 발표 세 개를 한 줄에 (최근 기수 먼저). 제목은 크게, 발표자 · 날짜는 작게.
 * 제목을 누르면 아카이브 세미나 보기에서 그 발표를 찾아 둔 화면이 열린다. 전부는 /archive?view=seminars.
 * 자료(content/seminars.json, 노션 '전 기수 데이터 모음집')를 받기 전에도 저장소 스냅샷으로 먼저 그린다.
 */
export function SeminarWall() {
  const { data } = useSeminars()
  const groups = latestByGeneration(data ?? SEMINARS, PER_GEN)
  if (groups.length === 0) return null
  const gens = groups.map((g) => g.gen)
  const span = gens.length > 1 ? `${Math.min(...gens)}–${Math.max(...gens)}` : String(gens[0])
  return (
    <StorySection
      id="seminars"
      titleSize="h2"
      title="멤버 세미나"
      sub={`${span}기 세션에서 멤버들이 발표한 세미나입니다.`}
      action={
        <Link className="link-go" to="/archive?view=seminars#archive-views">
          세미나 전체 보기
        </Link>
      }
    >
      <div className={s.wall}>
        {groups.map((g) => (
          <section key={g.gen} className={s.row} aria-labelledby={`seminar-wall-${g.gen}`}>
            <h3 id={`seminar-wall-${g.gen}`} className={s.gen}>
              <span className="num">{g.gen}</span>기
            </h3>
            <ul className={s.talks}>
              {g.items.map((t) => (
                <li key={t.id} className={s.talk}>
                  <Link className={s.title} to={seminarHref(t)}>
                    {t.title}
                  </Link>
                  <p className={s.meta}>
                    {t.speaker} · <time className="num" dateTime={t.date}>{dot(t.date)}</time>
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </StorySection>
  )
}
