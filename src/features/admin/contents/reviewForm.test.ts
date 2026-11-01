import { describe, expect, it } from 'vitest'
import { publicSummary, validateReviewForm, type ReviewDraft } from './reviewForm'

const draft = (extra: Partial<ReviewDraft> = {}): ReviewDraft => ({ photo: null, generation: '4', name: '예시 멤버 09', track: 'Frontend', content: '예시 후기', isPublic: true, ...extra })

describe('리뷰 팝업 (P-ACT-02)', () => {
  it('기수 · 이름 · 트랙/파트 · 후기 필수, 사진은 선택', () => {
    expect(validateReviewForm(draft())).toEqual({})
    expect(Object.keys(validateReviewForm(draft({ generation: '', name: '', track: ' ', content: '' }))).sort()).toEqual(['content', 'generation', 'name', 'track'])
  })
  it('후기는 200자까지', () => {
    expect(validateReviewForm(draft({ content: '가'.repeat(200) }))).toEqual({})
    expect(validateReviewForm(draft({ content: '가'.repeat(201) }))).toHaveProperty('content')
  })
  it('공개 · 비공개 수', () => {
    expect(publicSummary([{ isPublic: true }, { isPublic: false }, { isPublic: true }])).toBe('공개 2 · 비공개 1')
    expect(publicSummary([])).toBe('공개 0 · 비공개 0')
  })
})
