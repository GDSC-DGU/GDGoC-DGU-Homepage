import { useRef } from 'react'
import { SITE } from '@/config/site'
import { CHAPTER, GENERATIONS, SEMINARS } from '@/content'
import { HOME_ABOUT } from '@/content/home'
import { MoreLink } from './HomeHead'
import { fill } from './homeData'
import { LogoWordmark } from './LogoWordmark'
import { LogoMarquee } from './LogoMarquee'
import { aos, useCountUp } from './useReveal'
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

interface Stat {
  id: string
  art: Art
  value: number
  unit: string
  label: string
  note?: string
}

/** 숫자 하나: 0 부터 2초 동안 올라간다 (칸마다 120ms 늦게). 읽기 프로그램은 끝 숫자를 한 번에 읽는다 */
function StatItem({ x, index }: { x: Stat; index: number }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const shown = useCountUp(ref, x.value, index * 120)
  return (
    <li className={s.stat}>
      <Art kind={x.art} />
      <p ref={ref} className={s.value}>
        <span className="num" aria-hidden="true">
          {shown.toLocaleString('ko-KR')}
        </span>
        <span className="visually-hidden">{x.value.toLocaleString('ko-KR')}</span>
        <span className={s.unit}>{x.unit}</span>
      </p>
      <p className={s.label}>
        {x.label}
        {x.note && <span className={s.note}>{x.note}</span>}
      </p>
    </li>
  )
}

/**
 * 4 소개 (슈어소프트테크 'About'): 왼쪽 이름표 · 로고 · 한 문장 · 문단 · View More | 오른쪽 선 그림 + 큰 숫자 + 이름, 아래 로고 흐름 두 줄.
 * 숫자는 저장소 자료에서 센다: 세미나 수(seminars.json) · 지금 기수(generations.json) · 챕터 페이지 가입자(chapter.json, 기준일과 함께).
 * 떠오르기 늦춤은 그 사이트 값: 이름표 200 · 로고 250 · 문장 300 · 문단 350 · 버튼 400 · 숫자 500 · 로고 흐름 500.
 */
export function AboutNumbers() {
  const gens = [...GENERATIONS].sort((a, b) => a.n - b.n)
  const current = gens.find((g) => g.current) ?? gens[gens.length - 1]
  const start = gens[0]?.start?.slice(0, 4) ?? ''
  const stats: Stat[] = [
    { id: 'seminars', art: 'mic', value: SEMINARS.length, unit: '개', label: HOME_ABOUT.stats.seminars },
    ...(current ? [{ id: 'gen', art: 'bars' as const, value: current.n, unit: '기', label: HOME_ABOUT.stats.generation }] : []),
    ...(CHAPTER.members ? [{ id: 'members', art: 'network' as const, value: CHAPTER.members.value, unit: '명', label: HOME_ABOUT.stats.members, note: `${CHAPTER.members.asOf.replaceAll('-', '.')} 기준` }] : []),
  ]
  return (
    <section className={s.section} aria-labelledby="about-title">
      <div className={`container ${s.grid}`}>
        <div className={s.text}>
          <p className={s.eng} lang="en" {...aos(200)}>
            {HOME_ABOUT.eng}
          </p>
          <div className={s.logo} {...aos(250)}>
            <LogoWordmark name={SITE.shortName} className={s.wordmark} />
          </div>
          <h2 id="about-title" className={s.title} {...aos(300)}>
            {fill(HOME_ABOUT.title, { start })}
          </h2>
          <p className={s.body} {...aos(350)}>
            {HOME_ABOUT.body}
          </p>
          <div className={s.btn} {...aos(400)}>
            <MoreLink to="/about">{HOME_ABOUT.action}</MoreLink>
          </div>
        </div>
        <ul className={s.stats} {...aos(500)}>
          {stats.map((x, i) => (
            <StatItem key={x.id} x={x} index={i} />
          ))}
        </ul>
      </div>
      <div className={s.logos} {...aos(500)}>
        <LogoMarquee />
      </div>
    </section>
  )
}
