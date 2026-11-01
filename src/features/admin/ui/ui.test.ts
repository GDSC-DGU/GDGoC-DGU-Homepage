import { describe, expect, it } from 'vitest'
import { deleteConfirm, doneMessage, objectParticle } from './confirmText'
import { formatDate, formatDateTime, formatDateTimeLong, formatDay, formatPeriod, relativeTime } from './format'
import { pageList } from './pagination'

describe('날짜 · 시각 표기 (한국 시간, 명세 표기)', () => {
  it('UTC 시각도 한국 날짜 · 시각으로', () => {
    // 2026-10-23 05:00 UTC = 14:00 KST (금)
    expect(formatDateTimeLong('2026-10-23T05:00:00Z')).toBe('2026.10.23 (금) 14:00')
    expect(formatDateTime('2026-10-31T15:30:00Z')).toBe('2026.11.01 00:30')
    expect(formatDate('2026-11-01')).toBe('2026.11.01')
    expect(formatDay('2026-10-14')).toBe('2026.10.14 (수)')
  })
  it('기간', () => {
    expect(formatPeriod('2026-10-23', '2026-10-25')).toBe('2026.10.23 – 10.25')
    expect(formatPeriod('2026-12-31', '2027-01-01')).toBe('2026.12.31 – 2027.01.01')
    expect(formatPeriod('2026-10-23', null)).toBe('2026.10.23')
  })
  it('경과 시간 (대시보드)', () => {
    const now = Date.parse('2026-11-01T03:00:00Z')
    expect(relativeTime('2026-11-01T02:59:40Z', now)).toBe('방금 전')
    expect(relativeTime('2026-11-01T02:48:00Z', now)).toBe('12분 전')
    expect(relativeTime('2026-11-01T00:00:00Z', now)).toBe('3시간 전')
    expect(relativeTime('2026-10-30T03:00:00Z', now)).toBe('2일 전')
    expect(relativeTime('2026-10-01T03:00:00Z', now)).toBe('2026.10.01')
  })
})

describe('확인 문구 규칙', () => {
  it('명세 문구: 선택한 N개의 게시글을 삭제할까요?', () => {
    expect(deleteConfirm('게시글', 3)).toEqual({ title: '선택한 3개의 게시글을 삭제할까요?', body: undefined, confirmLabel: '삭제', tone: 'danger' })
    expect(deleteConfirm('댓글', 1).title).toBe('이 댓글을 삭제할까요?')
    expect(deleteConfirm('사용자', 2).title).toBe('선택한 2명의 사용자를 삭제할까요?')
  })
  it('결과 토스트: 단위 + 을/를', () => {
    expect(doneMessage('게시글', 3, '삭제')).toBe('게시글 3개를 삭제했습니다.')
    expect(doneMessage('사용자', 2, '비활성화')).toBe('사용자 2명을 비활성화했습니다.')
  })
  it('을/를 고르기', () => {
    expect(objectParticle('게시글')).toBe('을')
    expect(objectParticle('프로젝트')).toBe('를')
    expect(objectParticle('Teams')).toBe('를')
    expect(objectParticle('PIN')).toBe('을')
  })
})

describe('페이지 번호', () => {
  it('7쪽 이하는 모두, 넘으면 처음 · 끝 · 지금 앞뒤', () => {
    expect(pageList(2, 5)).toEqual([1, 2, 3, 4, 5])
    expect(pageList(1, 12)).toEqual([1, 2, 3, 4, null, 12])
    expect(pageList(6, 12)).toEqual([1, null, 5, 6, 7, null, 12])
    expect(pageList(12, 12)).toEqual([1, null, 9, 10, 11, 12])
  })
})
