import type { AdminRole, ManagementType } from '../data/common/types'
import type { LockReason, UserRow } from '../data/users/types'

/** 화면 글자 모음 (사용자 관리). 부품이 아닌 것만: 부품 파일은 부품만 내보낸다 (oxlint only-export-components) */

export const TYPE_OPTIONS: readonly ManagementType[] = ['General', 'Core', 'Lead']

/** 관리 유형별 권한 안내 (F-AMB-001: 상단에 관리 유형별 권한 안내). 규칙은 data/permissions.ts · data/users/rules.ts */
export const ROLE_GUIDE: readonly { type: ManagementType; text: string }[] = [
  { type: 'Lead', text: '모든 사용자 추가 · 수정 · 비활성화, 관리 유형 변경, 관리자 비밀번호 초기화, Lead · Core 잠금 해제' },
  { type: 'Core', text: 'General 사용자만 추가 · 수정 · 비활성화 · PIN 초기화 · 잠금 해제' },
  { type: 'General', text: '관리자 화면 없음. 학번 + PIN으로 게시글 · 댓글 작성' },
]

export const LOCK_REASON_LABEL: Record<LockReason, string> = {
  pin: '학번 + PIN 5회 연속 실패 (15분 제한 뒤 다시 5회 실패)',
  password: '관리자 로그인 5회 연속 실패 (15분 제한 뒤 다시 5회 실패)',
}

/** 잠긴 까닭 (예전 기록 · 로그인 화면에서 잠긴 계정은 까닭이 없을 수 있어 관리 유형으로 짐작) */
export function lockReasonOf(u: Pick<UserRow, 'lockReason' | 'type'>): string {
  if (u.lockReason) return LOCK_REASON_LABEL[u.lockReason]
  return u.type === 'General' ? LOCK_REASON_LABEL.pin : '인증 5회 연속 실패 (15분 제한 뒤 다시 5회 실패)'
}

export const isAdminType = (t: ManagementType): t is AdminRole => t === 'Lead' || t === 'Core'

/** '예시 멤버 01 · 2026****01' (팝업 · 알림의 대상 표시) */
export const targetLabel = (u: Pick<UserRow, 'name' | 'maskedStudentId'>) => `${u.name} · ${u.maskedStudentId}`

/** 메일 결과 알림 (목록 화면 토스트) */
export const mailFailedHint = '이메일 주소를 확인하고 목록의 [링크 재발송]으로 다시 보내 주세요.'
