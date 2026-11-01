import { describe, expect, it } from 'vitest'
import { digitsOnly, validateUserForm, type UserFormValues } from './form'

const v = (over: Partial<UserFormValues> = {}): UserFormValues => ({ name: '예시 멤버 30', studentId: '2026000130', email: 'm30@example.com', type: 'General', generation: '4', loginId: '', ...over })

describe('사용자 추가 · 수정 입력 확인 (P-AMB-02)', () => {
  it('필수: 이름 · 학번 · 이메일 · 기수 (관리 유형 기본 General)', () => {
    expect(validateUserForm(v(), { mode: 'add', needsLoginId: false, check: null })).toEqual({})
    expect(validateUserForm(v({ name: ' ', studentId: '', email: '', generation: '' }), { mode: 'add', needsLoginId: false, check: null })).toEqual({
      name: '이름을 입력해 주세요.',
      studentId: '학번을 입력해 주세요.',
      email: '이메일을 입력해 주세요.',
      generation: '기수를 선택해 주세요.',
    })
  })

  it('학번은 숫자 10자리 (수정에서는 바꿀 수 없어 보지 않는다)', () => {
    expect(validateUserForm(v({ studentId: '202600013' }), { mode: 'add', needsLoginId: false, check: null }).studentId).toBe('학번은 숫자 10자리로 입력해 주세요.')
    expect(validateUserForm(v({ studentId: '' }), { mode: 'edit', needsLoginId: false, check: null }).studentId).toBeUndefined()
    expect(digitsOnly('2026-000-130 9')).toBe('2026000130')
  })

  it('Lead · Core 는 아이디 형식 + 중복 확인을 통과해야 추가 (F-AMB-007 3), 값을 바꾸면 다시 확인', () => {
    const opts = { mode: 'add' as const, needsLoginId: true }
    expect(validateUserForm(v({ type: 'Core', loginId: 'ab' }), { ...opts, check: null }).loginId).toBe('영문 · 숫자 4~20자로 입력해 주세요.')
    expect(validateUserForm(v({ type: 'Core', loginId: 'core30' }), { ...opts, check: null }).loginId).toBe('아이디 중복 확인을 해 주세요.')
    expect(validateUserForm(v({ type: 'Core', loginId: 'core30' }), { ...opts, check: { value: 'core31', available: true, message: '' } }).loginId).toBe('아이디 중복 확인을 해 주세요.')
    expect(validateUserForm(v({ type: 'Core', loginId: 'core30' }), { ...opts, check: { value: 'core30', available: false, message: '이미 사용 중인 아이디입니다.' } }).loginId).toBe('이미 사용 중인 아이디입니다.')
    expect(validateUserForm(v({ type: 'Core', loginId: 'core30' }), { ...opts, check: { value: 'core30', available: true, message: '사용할 수 있는 아이디입니다.' } })).toEqual({})
    // General 이면 아이디를 보지 않는다
    expect(validateUserForm(v({ type: 'General', loginId: '' }), { ...opts, check: null })).toEqual({})
  })
})
