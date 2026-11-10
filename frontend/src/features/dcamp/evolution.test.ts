import { describe, expect, it } from 'vitest'
import { GENERATIONS } from '@/content'
import { evolutionRows } from './evolution'

describe('연혁 (dcamp Our Evolution)', () => {
  it('최근 기수 먼저, 기간은 generations.json 그대로, 지금 기수는 끝을 비운다', () => {
    const rows = evolutionRows(GENERATIONS)
    expect(rows.map((r) => r.n)).toEqual([4, 3, 2, 1])
    expect(rows[0]).toMatchObject({ label: '4기', period: '2026.09~', current: true })
    expect(rows[3].period).toBe('2023.09~2024.07')
  })

  it('첫 기수는 시작 이름, 이름이 바뀐 기수는 바뀐 줄이 맨 앞 (지어낸 줄 없이 highlights 만)', () => {
    const rows = evolutionRows(GENERATIONS)
    const first = rows.find((r) => r.n === 1)!
    const second = rows.find((r) => r.n === 2)!
    expect(first.lines[0]).toBe('GDSC DGU로 시작했습니다')
    expect(second.lines[0]).toBe('GDSC DGU에서 GDGoC DGU로 이름을 바꿨습니다')
    for (const r of rows) {
      const g = GENERATIONS.find((x) => x.n === r.n)!
      for (const l of r.lines.slice(r.n <= 2 ? 1 : 0)) expect(g.highlights).toContain(l)
    }
  })
})
