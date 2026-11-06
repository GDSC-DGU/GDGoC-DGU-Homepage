import { CHAPTER, GENERATIONS, PUBLIC_PROJECTS, SEMINARS } from '@/content'
import s from './impact.module.css'

type Art = 'square' | 'dots' | 'network' | 'bars'

function ImpactArt({ kind }: { kind: Art }) {
  return (
    <svg className={s.art} viewBox="0 0 120 120" aria-hidden="true">
      {kind === 'square' && (
        <>
          {[0, 8, 16, 24, 32].map((d) => (
            <rect key={d} x={10 + d} y={10 + d} width={100 - 2 * d} height={100 - 2 * d} />
          ))}
          <rect className={s.fill} x="53" y="53" width="14" height="14" />
        </>
      )}
      {kind === 'dots' && (
        <>
          <rect x="10" y="10" width="100" height="100" />
          {[30, 60, 90].map((x) => [30, 60, 90].map((y) => <circle key={`${x}-${y}`} className={s.grey} cx={x} cy={y} r="5" />))}
          <circle className={s.fill} cx="60" cy="60" r="10" />
        </>
      )}
      {kind === 'network' && (
        <>
          {[
            [60, 14],
            [96, 34],
            [104, 72],
            [78, 104],
            [36, 104],
            [16, 72],
            [24, 34],
          ].map(([x, y]) => (
            <g key={`${x}-${y}`}>
              <line x1="60" y1="60" x2={x} y2={y} />
              <circle cx={x} cy={y} r="5" />
            </g>
          ))}
          <circle className={s.fill} cx="60" cy="60" r="9" />
        </>
      )}
      {kind === 'bars' && (
        <>
          <rect x="14" y="78" width="18" height="30" />
          <rect x="40" y="58" width="18" height="50" />
          <rect x="66" y="38" width="18" height="70" />
          <rect className={s.fill} x="92" y="12" width="18" height="96" />
        </>
      )}
    </svg>
  )
}

/**
 * 홈 'Impact' (dcamp 홈): 왼쪽 영문 제목 | 오른쪽 따뜻한 회색 카드 2 × 2 (주황 한 점이 든 선 그림 · 한 줄 · 괘선 · 이름 · 큰 숫자).
 * 숫자는 모두 저장소 자료에서 센다 (projects.json · seminars.json · generations.json · chapter.json).
 */
export function ImpactSection() {
  const gens = [...GENERATIONS].sort((a, b) => a.n - b.n)
  const current = gens.find((g) => g.current) ?? gens[gens.length - 1]
  const cards: { id: string; art: Art; line: string; label: string; value: string; unit: string }[] = [
    { id: 'projects', art: 'square', line: '팀으로 만들어 공개한 서비스', label: '공개 프로젝트', value: String(PUBLIC_PROJECTS.length), unit: '개' },
    { id: 'seminars', art: 'dots', line: '멤버가 직접 준비한 발표', label: '멤버 세미나', value: String(SEMINARS.length), unit: '개' },
    ...(CHAPTER.members ? [{ id: 'members', art: 'network' as const, line: '함께 소식을 받는 사람들', label: '챕터 페이지 가입자', value: CHAPTER.members.value.toLocaleString('ko-KR'), unit: '명' }] : []),
    ...(current && gens[0]?.start ? [{ id: 'gens', art: 'bars' as const, line: `${gens[0].start.slice(0, 4)}년부터 이어 온 기수`, label: '지금 기수', value: String(current.n), unit: '기' }] : []),
  ]
  return (
    <section className={s.section} aria-labelledby="impact-title">
      <div className={`container ${s.grid}`}>
        <h2 id="impact-title" className={s.title} lang="en">
          Impact
        </h2>
        <div>
          <ul className={s.cards}>
            {cards.map((c) => (
              <li key={c.id} className={s.card}>
                <ImpactArt kind={c.art} />
                <p className={s.line}>{c.line}</p>
                <p className={s.label}>{c.label}</p>
                <p className={s.value}>
                  <span className="num">{c.value}</span>
                  {c.unit}
                </p>
              </li>
            ))}
          </ul>
          {CHAPTER.members && (
            <p className={s.note}>
              *챕터 페이지 가입자는 gdg.community.dev {CHAPTER.members.asOf.slice(0, 4)}년 {Number(CHAPTER.members.asOf.slice(5, 7))}월 기준
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
