import type { ApplicationForm, ApplicationRequest, ApplicationResult, CurrentRecruitment, DuplicateCheck } from './types'

/**
 * 지원서의 '창구'. 화면은 이 인터페이스만 쓴다.
 * 구현은 둘: httpRepository.ts (API 명세 docs/api/openapi.yaml 그대로) · sampleRepository.ts (이 탭의 메모리, API 붙기 전 예시).
 * 어느 쪽을 쓸지는 applyRepo.ts 가 config/site.ts 의 APPLY_FORM_LIVE 로 고른다.
 */
export interface ApplyRepository {
  /** API-RCT-001 현재 모집 안내. 회차가 하나도 없으면 ApplyError('NOT_FOUND') */
  getCurrent(): Promise<CurrentRecruitment>
  /** API-RCT-002 게시된 지원폼. 없으면 ApplyError('FORM_NOT_PUBLISHED') */
  getForm(rid: string): Promise<ApplicationForm>
  /** API-RCT-003 학번 중복 사전 확인 */
  checkDuplicate(rid: string, studentId: string): Promise<DuplicateCheck>
  /** API-RCT-005 제출 */
  submit(rid: string, req: ApplicationRequest): Promise<ApplicationResult>
}

/** 명세의 실패 code (모르는 값도 문자열로 받는다) */
export type ApplyErrorCode =
  | 'VALIDATION_FAILED'
  | 'RECRUITMENT_CLOSED'
  | 'FORM_CHANGED'
  | 'APPLICATION_DUPLICATED'
  | 'FORM_NOT_PUBLISHED'
  | 'NOT_FOUND'
  /** 서버에 닿지 못함 · 응답을 읽지 못함 */
  | 'NETWORK'
  | (string & {})

/** 실패 응답 { success: false, code, message } 를 그대로 담는다 */
export class ApplyError extends Error {
  readonly code: ApplyErrorCode
  readonly status?: number
  constructor(code: ApplyErrorCode, message: string, status?: number) {
    super(message)
    this.name = 'ApplyError'
    this.code = code
    this.status = status
  }
}

/** 화면에 보일 문장: 서버 message 가 있으면 그것, 없으면 code 별 기본 문장 */
const DEFAULT_TEXT: Record<string, string> = {
  VALIDATION_FAILED: '입력한 내용을 확인해 주세요.',
  RECRUITMENT_CLOSED: '지원 기간이 아닙니다.',
  FORM_CHANGED: '지원폼이 변경되었습니다. 새 지원서를 불러온 뒤 다시 확인해 주세요. 쓴 답은 그대로 남아 있습니다.',
  APPLICATION_DUPLICATED: '이미 제출된 지원서가 있습니다. 고칠 내용이 있으면 운영진 메일로 알려 주세요.',
  FORM_NOT_PUBLISHED: '게시된 지원폼이 없습니다.',
  NOT_FOUND: '모집 정보가 없습니다.',
}
export function applyErrorText(e: unknown): string {
  if (e instanceof ApplyError) return e.message || DEFAULT_TEXT[e.code] || '제출하지 못했습니다.'
  return '제출하지 못했습니다. 잠시 뒤 다시 시도해 주세요. 쓴 내용은 그대로 남아 있습니다.'
}
