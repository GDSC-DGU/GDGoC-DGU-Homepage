import { isEmail, isStudentId } from '../data/common/mask'
import type { ManagementType } from '../data/common/types'
import { LOGIN_ID_PATTERN } from '../data/users/rules'
import { isAdminType } from './display'

/**
 * 사용자 추가 · 수정 팝업(P-AMB-02)의 입력 확인. 서버(예시 저장소)도 같은 규칙으로 다시 본다.
 * 칸 이름은 저장소 오류의 fields 와 같다 (name · studentId · email · generation · loginId).
 */
export interface UserFormValues {
  name: string
  studentId: string
  email: string
  type: ManagementType
  generation: string
  loginId: string
}

export type UserFormErrors = Partial<Record<keyof UserFormValues, string>>

/** 아이디 중복 확인 상태: 확인한 값과 결과 (값을 바꾸면 다시 확인해야 한다, F-AMB-007 3) */
export interface LoginIdCheck {
  value: string
  available: boolean
  message: string
}

export function loginIdFormatError(loginId: string): string | null {
  if (!loginId.trim()) return '아이디를 입력해 주세요.'
  if (!LOGIN_ID_PATTERN.test(loginId)) return '영문 · 숫자 4~20자로 입력해 주세요.'
  return null
}

/**
 * mode: add = 학번도 확인, edit = 학번은 바꿀 수 없어 확인하지 않음.
 * needsLoginId: 새 관리자 아이디를 받는 경우 (추가할 때 Lead · Core, 수정에서 General → Lead · Core)
 */
export function validateUserForm(v: UserFormValues, { mode, needsLoginId, check }: { mode: 'add' | 'edit'; needsLoginId: boolean; check: LoginIdCheck | null }): UserFormErrors {
  const e: UserFormErrors = {}
  if (!v.name.trim()) e.name = '이름을 입력해 주세요.'
  if (mode === 'add') {
    if (!v.studentId) e.studentId = '학번을 입력해 주세요.'
    else if (!isStudentId(v.studentId)) e.studentId = '학번은 숫자 10자리로 입력해 주세요.'
  }
  if (!v.email.trim()) e.email = '이메일을 입력해 주세요.'
  else if (!isEmail(v.email)) e.email = '이메일 형식이 올바르지 않습니다.'
  if (!v.generation) e.generation = '기수를 선택해 주세요.'
  if (needsLoginId && isAdminType(v.type)) {
    const format = loginIdFormatError(v.loginId)
    if (format) e.loginId = format
    else if (!check || check.value !== v.loginId) e.loginId = '아이디 중복 확인을 해 주세요.'
    else if (!check.available) e.loginId = check.message
  }
  return e
}

/** 학번 입력: 숫자만 남기고 10자리까지 */
export const digitsOnly = (s: string) => s.replace(/\D/g, '').slice(0, 10)
