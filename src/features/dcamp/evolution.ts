import type { Generation } from '@/domain/types'

/** 연혁 한 줄 (dcamp 'Our Evolution': 연도 | 점 | 그해 일) */
export interface EvolutionRow {
  n: number
  /** 큰 글자: '4기' */
  label: string
  /** 작은 글자: '2026.09–' · '2023.09–2024.07' */
  period: string
  /** 그 기수 이름이 바뀌었으면 '이름 GDSC DGU → GDGoC DGU' 같은 줄이 앞에 붙는다 */
  lines: string[]
  current: boolean
}

const ym = (s: string) => s.replace('-', '.')

/**
 * 기수 연혁 (generations.json 의 확인된 기간 · highlights 만). 최근 기수 먼저.
 * 이름이 바뀐 첫 기수에는 '… 에서 … 로 이름을 바꿈' 줄을 맨 앞에.
 */
export function evolutionRows(gens: readonly Generation[], max = 3): EvolutionRow[] {
  const asc = [...gens].sort((a, b) => a.n - b.n)
  return asc
    .map((g, i) => {
      const prev = asc[i - 1]
      const renamed = prev && prev.name !== g.name ? [`${prev.name}에서 ${g.name}로 이름을 바꿨습니다`] : []
      const first = i === 0 ? [`${g.name}로 시작했습니다`] : []
      return {
        n: g.n,
        label: `${g.n}기`,
        period: g.start ? `${ym(g.start)}–${g.end ? ym(g.end) : ''}` : '',
        lines: [...first, ...renamed, ...(g.highlights ?? [])].slice(0, max + 1),
        current: Boolean(g.current),
      }
    })
    .reverse()
}
