import k from './values.module.css'

/**
 * 인재상 (2026-11-12, BOAZ '보아즈의 인재상' 참고): 검정 면에 큰 문장 → 세 칸.
 * 칸마다 주황 선 그림(--brand, 검정 위 주황) + 번호 · 이름 · 한 줄. 카드는 검정보다 한 단계 밝은 면 + 1px 선.
 * 아이콘은 작게 계속 움직인다: transform · opacity 만 쓰고, 동작 줄이기 설정이면 멈춘다 (DESIGN 스킬 규칙).
 *  - 자유: 종이비행기가 떠다니고, 지나온 길의 점이 차례로 깜박임
 *  - 열정: 불꽃이 일렁이고, 불티가 위로 떠오름
 *  - 끈기: 산길 발자국이 차례로 찍히고, 꼭대기 깃발이 흔들림
 * 이름은 4기 FE 박정은 제안(자유 · 열정 · 끈기). 설명 한 줄은 팀에서 다듬는다.
 */
export interface Value {
  id: 'freedom' | 'passion' | 'grit'
  name: string
  desc: string
}

export const VALUES: readonly Value[] = [
  { id: 'freedom', name: '자유', desc: '하고 싶은 것을 먼저 꺼내고, 정해진 답보다 내 방식으로 풀어 봅니다.' },
  { id: 'passion', name: '열정', desc: '만들고 싶은 것이 생기면 밤을 새워서라도 끝까지 붙잡습니다.' },
  { id: 'grit', name: '끈기', desc: '한 학기 동안 팀과 함께 같은 서비스를 꾸준히 다듬어 갑니다.' },
]

function ValueIcon({ id }: { id: Value['id'] }) {
  return (
    <svg className={k.icon} viewBox="0 0 120 120" aria-hidden="true">
      {/* 바탕 고리: 아이콘 자리를 잡는 옅은 원 두 개 */}
      <circle className={k.ring} cx="60" cy="60" r="54" />
      <circle className={k.ringInner} cx="60" cy="60" r="42" />
      {id === 'freedom' && (
        <>
          {/* 지나온 길 (점선 곡선 위 점 다섯이 차례로 깜박) */}
          <path className={k.faint} d="M18 92c10-4 16-14 26-16s14 6 24 2" />
          {[
            [18, 92],
            [28, 86],
            [38, 78],
            [50, 77],
            [60, 80],
          ].map(([x, y], i) => (
            <circle key={i} className={k.dot} style={{ animationDelay: `${i * 0.25}s` }} cx={x} cy={y} r="1.8" />
          ))}
          <g className={k.plane}>
            <path d="M44 62 96 36 84 88 66 72Z" />
            <path d="M66 72 96 36" />
            <path d="M66 72v14l8-9" />
            <path className={k.faint} d="M58 66 84 46" />
          </g>
          {/* 구름 두 조각 */}
          <path className={k.cloud} d="M26 44a6 6 0 0 1 11-3 5 5 0 0 1 8 4H24a3 3 0 0 1 2-1Z" />
          <path className={k.cloud2} d="M78 22a5 5 0 0 1 9-2 4 4 0 0 1 6 3H76a2 2 0 0 1 2-1Z" />
        </>
      )}
      {id === 'passion' && (
        <>
          <g className={k.flame}>
            <path d="M60 18c4 14 22 22 22 44a22 22 0 0 1-44 0c0-12 8-18 11-27 3 7 6 10 9 12 2-11-1-19 2-29Z" />
          </g>
          <g className={k.flameInner}>
            <path d="M60 56c3 6 10 9 10 17a10 10 0 0 1-20 0c0-6 5-9 10-17Z" />
          </g>
          <path className={k.faint} d="M40 94h40" />
          <path className={k.faint} d="M46 100h28" />
          {/* 불티 셋: 위로 떠오르며 사라짐 */}
          <circle className={k.spark} cx="38" cy="40" r="2" />
          <circle className={k.spark} style={{ animationDelay: '0.7s' }} cx="84" cy="34" r="1.6" />
          <circle className={k.spark} style={{ animationDelay: '1.4s' }} cx="76" cy="52" r="1.4" />
        </>
      )}
      {id === 'grit' && (
        <>
          <path d="M14 94 46 44l14 20 10-14 36 44Z" />
          <path className={k.faint} d="M38 58l8 6 6-4" />
          {/* 산길 발자국: 아래에서 위로 차례로 찍힘 */}
          {[
            [34, 88],
            [42, 82],
            [38, 74],
            [46, 68],
            [44, 60],
          ].map(([x, y], i) => (
            <circle key={i} className={k.step} style={{ animationDelay: `${i * 0.35}s` }} cx={x} cy={y} r="2" />
          ))}
          <path d="M46 44V16" />
          <g className={k.flag}>
            <path d="M46 16h22l-6 7 6 7H46" />
          </g>
          <path className={k.faint} d="M8 100h104" />
        </>
      )}
    </svg>
  )
}

export function Values({ generation, name }: { generation: number; name: string }) {
  return (
    <section className={`on-dark ${k.section}`} data-band="dark" aria-labelledby="values-title">
      <div className={`container ${k.inner}`}>
        <h2 id="values-title" className={k.title}>
          {generation}기 {name}가
          <br />
          함께 성장하고 싶은 사람이에요
        </h2>
        <ul className={k.list}>
          {VALUES.map((v, i) => (
            <li key={v.id} className={k.item}>
              <ValueIcon id={v.id} />
              <span className={`${k.no} num`} aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className={k.name}>{v.name}</h3>
              <p className={k.desc}>{v.desc}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
