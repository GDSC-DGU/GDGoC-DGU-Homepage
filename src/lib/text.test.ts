import { describe, expect, it } from 'vitest'
import { WORD_JOINER, keepHyphenated } from './text'

describe('keepHyphenated', () => {
  it('영문 하이픈 낱말의 하이픈 뒤에 낱말 이음표를 넣는다', () => {
    expect(keepHyphenated('4기 G-Sprint 프로젝트')).toBe(`4기 G-${WORD_JOINER}Sprint 프로젝트`)
    expect(keepHyphenated('GitHub GDSC-DGU')).toBe(`GitHub GDSC-${WORD_JOINER}DGU`)
  })

  it('보이는 글자는 그대로다 (이음표만 빼면 같은 글)', () => {
    const s = 'G-Sprint 킥오프 · 팀 회의'
    expect(keepHyphenated(s).replaceAll(WORD_JOINER, '')).toBe(s)
  })

  it('한글 · 숫자 기간 · 띄어 쓴 하이픈은 건드리지 않는다', () => {
    for (const s of ['2026.08~09', '중간 - 기말', '3-4월', '휴회']) expect(keepHyphenated(s)).toBe(s)
  })
})
