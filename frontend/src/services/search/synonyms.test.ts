import { describe, expect, it } from 'vitest'
import { expandKeywords } from './synonyms'

describe('expandKeywords', () => {
  it('영어 행사 이름에 한글 키워드를 붙인다', () => {
    const k = expandKeywords('Camping Seminar 3회', 'GDG on Campus DGU 3rd Camping Seminar')
    expect(k).toContain('캠핑')
    expect(k).toContain('캠핑세미나')
  })

  it('한글 제목에 영어 키워드를 붙인다', () => {
    expect(expandKeywords('2기 데모데이')).toContain('demoday')
  })

  it('짧은 말(ot)은 낱말 단위로만 맞춘다', () => {
    expect(expandKeywords('4기 OT')).toContain('오리엔테이션')
    expect(expandKeywords('Robot Hot Topics')).not.toContain('오리엔테이션')
  })

  it('같은 말은 한 번만, 빈 값은 건너뛴다', () => {
    const words = expandKeywords('Gemini Gemini', undefined, '', false).split(' ')
    expect(words.filter((w) => w === 'gemini')).toHaveLength(1)
  })
})
