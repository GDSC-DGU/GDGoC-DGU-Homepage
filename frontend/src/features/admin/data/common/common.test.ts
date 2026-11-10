import { describe, expect, it } from 'vitest'
import { checkFile, FILE_RULES, fileSizeLabel } from './fileRules'
import { matchesQuery, paginate } from './list'
import { isEmail, isHttpUrl, isStudentId, maskStudentId } from './mask'

describe('학번 · 이메일 · 주소 (F-AMB-001 · 006, F-APJ-004)', () => {
  it('학번은 가운데를 가린다: 2026****42', () => {
    expect(maskStudentId('2026000042')).toBe('2026****42')
    expect(maskStudentId('12345')).toBe('*****')
  })
  it('학번은 숫자 10자리', () => {
    expect(isStudentId('2026000001')).toBe(true)
    expect(isStudentId('202600001')).toBe(false)
    expect(isStudentId('20260000a1')).toBe(false)
  })
  it('이메일 · URL 형식', () => {
    expect(isEmail('member01@example.com')).toBe(true)
    expect(isEmail('member01@')).toBe(false)
    expect(isHttpUrl('https://github.com/GDSC-DGU')).toBe(true)
    expect(isHttpUrl('github.com/GDSC-DGU')).toBe(false)
    expect(isHttpUrl('javascript:alert(1)')).toBe(false)
  })
})

describe('목록 계산 (예시 저장소가 서버 대신)', () => {
  it('검색: 대소문자 · 앞뒤 공백 무시, 빈 검색어는 모두', () => {
    expect(matchesQuery(' SPRING ', ['Spring Boot 세션'])).toBe(true)
    expect(matchesQuery('', ['아무거나'])).toBe(true)
    expect(matchesQuery('없음', ['제목', null, undefined])).toBe(false)
  })
  it('페이지 나누기: 전체 개수 · 쪽 수, 넘는 쪽은 마지막 쪽으로', () => {
    const items = Array.from({ length: 23 }, (_, i) => i)
    expect(paginate(items, { page: 1 })).toMatchObject({ total: 23, totalPages: 3, page: 1, items: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] })
    expect(paginate(items, { page: 9 })).toMatchObject({ page: 3, items: [20, 21, 22] })
    expect(paginate([], {})).toMatchObject({ total: 0, totalPages: 1, page: 1, items: [] })
  })
})

describe('파일 규칙 (명세 숫자 · 문구)', () => {
  const MB = 1024 * 1024
  it('형식 · 용량이 맞지 않으면 명세 안내 문구', () => {
    expect(checkFile({ type: 'image/png', size: 4 * MB }, FILE_RULES.projectThumbnail)).toBeNull()
    expect(checkFile({ type: 'image/png', size: 6 * MB }, FILE_RULES.projectThumbnail)).toBe('5MB 이하 이미지만 올릴 수 있어요.')
    expect(checkFile({ type: 'image/gif', size: 1 }, FILE_RULES.projectThumbnail)).not.toBeNull()
    expect(checkFile({ type: 'application/pdf', size: 9 * MB }, FILE_RULES.postAttachment)).toBeNull()
    expect(checkFile({ type: 'image/jpeg', size: 3 * MB }, FILE_RULES.reviewPhoto)).toBe('JPG · PNG 이미지만, 2MB 이하로 올릴 수 있어요.')
  })
  it('파일 크기 표시', () => {
    expect(fileSizeLabel(2.4 * MB)).toBe('2.4MB')
    expect(fileSizeLabel(3 * MB)).toBe('3MB')
    expect(fileSizeLabel(320 * 1024)).toBe('320KB')
  })
})
