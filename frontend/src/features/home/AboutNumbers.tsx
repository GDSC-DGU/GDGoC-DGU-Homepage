import { Link } from 'react-router-dom'
import { CHAPTER, GENERATIONS, SEMINARS } from '@/content'
import { HOME_ABOUT } from '@/content/home'
import { fill } from './homeData'
import s from './aboutNumbers.module.css'

type Art = 'mic' | 'bars' | 'network'

/** 숫자 위 작은 선 그림 (선 + 주황 점 하나) */
function Art({ kind }: { kind: Art }) {
  return (
    <svg className={s.art} viewBox="0 0 48 48" aria-hidden="true">
      {kind === 'mic' && (
        <>
          <rect x="18" y="6" width="12" height="22" rx="6" />
          <path d="M12 22a12 12 0 0 0 24 0M24 34v8M17 42h14" />
          <circle className={s.dot} cx="24" cy="17" r="3" />
        </>
      )}
      {kind === 'bars' && (
        <>
          <path d="M8 40h32M14 40V30M24 40V22M34 40V12" />
          <circle className={s.dot} cx="34" cy="12" r="3.5" />
        </>
      )}
      {kind === 'network' && (
        <>
          {[
            [24, 6],
            [40, 16],
            [40, 34],
            [24, 42],
            [8, 34],
            [8, 16],
          ].map(([x, y]) => (
            <g key={`${x}-${y}`}>
              <line x1="24" y1="24" x2={x} y2={y} />
              <circle cx={x} cy={y} r="2.5" />
            </g>
          ))}
          <circle className={s.dot} cx="24" cy="24" r="4" />
        </>
      )}
    </svg>
  )
}

/**
 * 4 소개 한 문단 + 숫자 셋 (슈어소프트테크 'About SURESOFT'): 왼쪽 제목 · 문단 · '소개 보기' | 오른쪽 선 그림 + 큰 숫자 + 이름.
 * 숫자는 저장소 자료에서 센다: 세미나 수(seminars.json) · 지금 기수(generations.json) · 챕터 페이지 가입자(chapter.json, 기준일과 함께).
 * 프로젝트 수는 바로 위 '팀 프로젝트' 제목에 있어 여기서 다시 쓰지 않는다.
 */
export function AboutNumbers() {
  const gens = [...GENERATIONS].sort((a, b) => a.n - b.n)
  const current = gens.find((g) => g.current) ?? gens[gens.length - 1]
  const start = gens[0]?.start?.slice(0, 4) ?? ''
  const stats: { id: string; art: Art; value: string; unit: string; label: string; note?: string }[] = [
    { id: 'seminars', art: 'mic', value: String(SEMINARS.length), unit: '개', label: HOME_ABOUT.stats.seminars },
    ...(current ? [{ id: 'gen', art: 'bars' as const, value: String(current.n), unit: '기', label: HOME_ABOUT.stats.generation }] : []),
    ...(CHAPTER.members
      ? [{ id: 'members', art: 'network' as const, value: CHAPTER.members.value.toLocaleString('ko-KR'), unit: '명', label: HOME_ABOUT.stats.members, note: `${CHAPTER.members.asOf.replaceAll('-', '.')} 기준` }]
      : []),
  ]
  return (
    <section className={`story paper ${s.section}`} aria-labelledby="about-title">
      <div className={`container ${s.grid}`}>
        <div className={s.text}>
          <h2 id="about-title" className={s.title}>
            {fill(HOME_ABOUT.title, { start })}
          </h2>
          <p className={s.body}>{HOME_ABOUT.body}</p>
          <Link className="btn-secondary" to="/about">
            {HOME_ABOUT.action}
          </Link>
        </div>
        <ul className={s.stats}>
          {stats.map((x) => (
            <li key={x.id} className={s.stat}>
              <Art kind={x.art} />
              <p className={s.value}>
                <span className="num">{x.value}</span>
                <span className={s.unit}>{x.unit}</span>
              </p>
              <p className={s.label}>
                {x.label}
                {x.note && <span className={s.note}>{x.note}</span>}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
