import { describe, expect, it } from 'vitest'
import { selectedDeleteConfirm } from './listHooks'

describe('선택 삭제 확인 문구 (F-ABD-003 1)', () => {
  it("한 개를 골라도 '선택한 N개의 …' 명세 문구, 확인 버튼은 '삭제'", () => {
    expect(selectedDeleteConfirm('게시글', 1)).toMatchObject({ title: '선택한 1개의 게시글을 삭제할까요?', confirmLabel: '삭제', tone: 'danger' })
    expect(selectedDeleteConfirm('게시글', 3).title).toBe('선택한 3개의 게시글을 삭제할까요?')
    expect(selectedDeleteConfirm('프로젝트', 1).title).toBe('선택한 1개의 프로젝트를 삭제할까요?')
    expect(selectedDeleteConfirm('댓글', 2, '본문').body).toBe('본문')
  })
})
