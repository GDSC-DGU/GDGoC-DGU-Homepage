import { describe, expect, it } from 'vitest'
import type { FileRef } from '../data/common/types'
import { categoryHelp, emptyDraft, isDirty, needsPeriod, toCommunityInput, validateDraft } from './writeForm'

const file: FileRef = { fileId: 'f1', url: 'blob:x', name: '예시.pdf', type: 'application/pdf', size: 10 }

describe('Community 관리자 글 작성 폼 (P-ABD-03)', () => {
  it('분류를 안 고르면 분류 오류, 제목 · 내용 필수', () => {
    expect(Object.keys(validateDraft(emptyDraft())).sort()).toEqual(['category', 'content', 'title'])
  })

  it('세션 · 행사만 기간이 보이고 필수, 종료일은 시작일과 같거나 이후', () => {
    expect(needsPeriod('세션')).toBe(true)
    expect(needsPeriod('행사')).toBe(true)
    expect(needsPeriod('공지')).toBe(false)
    expect(needsPeriod(null)).toBe(false)
    const base = { ...emptyDraft(), category: '행사' as const, title: '예시 행사', content: '예시' }
    expect(Object.keys(validateDraft(base)).sort()).toEqual(['endDate', 'startDate'])
    expect(validateDraft({ ...base, startDate: '2026-11-10', endDate: '2026-11-09' })).toEqual({ endDate: '종료일은 시작일과 같거나 이후여야 합니다.' })
    expect(validateDraft({ ...base, startDate: '2026-11-10', endDate: '2026-11-10' })).toEqual({})
  })

  it('요청 모양: 앞뒤 공백을 지우고, 다른 분류로 바꾸면 적어 둔 기간은 보내지 않는다, 첨부는 id 만', () => {
    const d = { ...emptyDraft(), category: '공지' as const, title: '  예시 공지 ', content: ' 내용 ', startDate: '2026-11-10', endDate: '2026-11-11', attachments: [file] }
    expect(toCommunityInput(d)).toEqual({ category: '공지', title: '예시 공지', startDate: null, endDate: null, content: '내용', attachmentIds: ['f1'] })
    expect(toCommunityInput({ ...d, category: '세션' })).toMatchObject({ startDate: '2026-11-10', endDate: '2026-11-11' })
  })

  it('무언가 썼는지 ([취소] 확인)', () => {
    expect(isDirty(emptyDraft())).toBe(false)
    expect(isDirty({ ...emptyDraft(), title: ' ' })).toBe(false)
    expect(isDirty({ ...emptyDraft(), category: '기타' })).toBe(true)
    expect(isDirty({ ...emptyDraft(), attachments: [file] })).toBe(true)
  })

  it('분류 안내가 고른 분류를 따라간다', () => {
    expect(categoryHelp('공지')).toContain('맨 위에 고정')
    expect(categoryHelp('세션')).toContain('기간이 필수')
    expect(categoryHelp('정보 공유')).toContain('기간은 입력하지 않습니다')
    expect(categoryHelp(null)).toContain('모든 분류')
  })
})
