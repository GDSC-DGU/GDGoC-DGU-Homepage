import type { FormQuestion } from '@/features/admin/data/recruit/types'

/**
 * 지원서 작성 (P-RCT-03) 데이터 모양.
 * 질문 모양은 관리자 지원폼(features/admin/data/recruit/types.ts 의 FormQuestion)과 같다: 운영진이 게시한 질문을 그대로 그린다.
 * (type import 라서 관리자 코드가 공개 페이지 파일에 들어가지 않는다)
 */
export type { FormQuestion, QuestionType } from '@/features/admin/data/recruit/types'

/** 'YYYY-MM-DD' (한국 날짜) */
export type Ymd = string

/** 게시된 지원폼 (공개 API: 지원자에게 보이는 것만) */
export interface PublicApplyForm {
  generation: number
  /** 지원 기간 (KST, 시작일 0시 ~ 종료일 23:59) */
  startDate: Ymd | null
  endDate: Ymd | null
  questions: FormQuestion[]
}

/** 동의 두 개 (F-RCT-005 4 · 5): 둘 다 필수 */
export interface Consents {
  privacy: boolean
  ai: boolean
}

/** 제출 요청: 질문 id → 답 (객관식은 고른 선택지 글자) */
export interface ApplicationInput {
  generation: number
  answers: Record<string, string>
  consents: Consents
}

/** 제출 결과 (접수 확인 화면) */
export interface ApplyReceipt {
  /** 접수 번호 (접수 순서) */
  no: number
  /** ISO 시각 */
  submittedAt: string
  /** 접수 확인 메일을 보낸 주소 */
  email: string
}
