import type { ApplyErrors } from './rules'
import type { ApplicationInput, ApplyReceipt, PublicApplyForm } from './types'

/**
 * 지원서의 '창구'. 화면은 이 인터페이스만 쓴다.
 * 지금은 예시 구현(sampleRepository.ts: 이 탭의 메모리)이고, 백엔드 API 가 생기면 같은 모양의 http 구현을 applyRepo.ts 에서 바꿔 끼운다.
 * API 이름은 백엔드 API 가 정해지면 맞춘다 (지금 이름은 자리 표시):
 *   getForm → GET /api/recruit/form (게시본만, 없으면 null)
 *   submit  → POST /api/recruit/applications
 */
export interface ApplyRepository {
  /** 지금 게시된 지원폼. 아직 게시하지 않았으면 null */
  getForm(): Promise<PublicApplyForm | null>
  /** 제출. 같은 기수에 같은 학번으로 낸 지원서가 있으면 DUPLICATE */
  submit(input: ApplicationInput): Promise<ApplyReceipt>
}

export type ApplyErrorCode =
  /** 입력 칸 오류 (fields) */
  | 'INVALID'
  /** 같은 학번으로 이미 냈음 */
  | 'DUPLICATE'
  /** 지원 기간이 아님 (마감 직후 제출 등) */
  | 'CLOSED'

export class ApplyError extends Error {
  readonly code: ApplyErrorCode
  readonly fields?: ApplyErrors
  constructor(code: ApplyErrorCode, message: string, fields?: ApplyErrors) {
    super(message)
    this.name = 'ApplyError'
    this.code = code
    this.fields = fields
  }
}

export const applyErrorText = (e: unknown) => (e instanceof ApplyError ? e.message : '제출하지 못했습니다. 잠시 뒤 다시 시도해 주세요. 쓴 내용은 그대로 남아 있습니다.')
