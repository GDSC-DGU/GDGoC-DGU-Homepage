/**
 * 지원서 데이터 모양. docs/api/openapi.yaml (API 명세서 0.1.0) 의 RCT · 모집 공개 API 와 필드 이름 · 값을 똑같이 맞춘다.
 *  - API-RCT-001 GET  /api/v1/recruitments/current                 → CurrentRecruitment
 *  - API-RCT-002 GET  /api/v1/recruitments/{rid}/form              → ApplicationForm
 *  - API-RCT-003 POST /api/v1/recruitments/{rid}/applications/check → DuplicateCheck
 *  - API-RCT-005 POST /api/v1/recruitments/{rid}/applications      ← ApplicationRequest → ApplicationResult
 * 명세가 바뀌면 이 파일부터 고친다.
 */

/** 지원 가능 상태 (RCT-001 · 005 · 030 이 같은 판단 함수를 쓴다) */
export type ApplyState = 'NOT_PUBLISHED' | 'BEFORE_START' | 'OPEN' | 'ENDED' | 'CLOSED_MANUALLY'

/** API-RCT-001 현재 모집 안내. 시각은 ISO 8601 (KST +09:00) */
export interface CurrentRecruitment {
  rid: string
  cohort: number
  title: string
  status: string
  applyStartAt: string
  applyEndAt: string
  /** 지원 파트 코드 (예: BE · FE · AI · Mobile) */
  tracks: string[]
  noticeMarkdown?: string
  applyState: ApplyState
  canApply: boolean
  formVersion: number
  posterUrl?: string
}

/** 문항 타입: SHORT_TEXT(최대 100자) · LONG_TEXT(최대 1000자) · SINGLE_CHOICE · MULTI_CHOICE · URL(http · https, 최대 2048자) */
export type QuestionType = 'SHORT_TEXT' | 'LONG_TEXT' | 'SINGLE_CHOICE' | 'MULTI_CHOICE' | 'URL'

/** API-RCT-002 문항 하나 */
export interface FormQuestion {
  questionId: string
  type: QuestionType
  title: string
  description?: string
  required: boolean
  maxLength?: number
  options?: string[]
  /** 이 파트 지원자에게만 보이는 문항 (비어 있으면 모두에게) */
  trackOnly?: string[]
}

/** API-RCT-002 게시된 지원폼 */
export interface ApplicationForm {
  rid: string
  formVersion: number
  questions: FormQuestion[]
}

/** API-RCT-003 중복 지원 사전 확인 (학번만) */
export interface DuplicateCheck {
  duplicated: boolean
}

/** API-RCT-005 지원자 기본 정보 */
export interface Applicant {
  name: string
  studentId: string
  major: string
  email: string
  phone: string
}

/** API-RCT-005 답 하나: 단일 · 주관식 · URL 은 value, 복수 선택은 values */
export interface Answer {
  questionId: string
  value?: string
  values?: string[]
}

/** API-RCT-005 제출 요청 */
export interface ApplicationRequest {
  applicant: Applicant
  track: string
  answers: Answer[]
  privacyConsent: boolean
  formVersion: number
}

/** API-RCT-005 제출 결과 (201) */
export interface ApplicationResult {
  aid: string
  submittedAt: string
}

/** 공통 응답 감싸기: 성공 { success: true, data } · 실패 { success: false, code, message } */
export interface ApiSuccess<T> {
  success: true
  data: T
}
export interface ApiFailure {
  success: false
  code: string
  message: string
}

/** 화면에서 쓰는 쓰던 지원서 (임시 보관 단위). 복수 선택 답은 배열 */
export interface ApplyDraft {
  applicant: Applicant
  track: string
  answers: Record<string, string | string[]>
}

/** 동의 두 개 (기능 명세 F-RCT-005). API 에는 privacyConsent 만 보낸다. AI 채점 동의는 화면 체크박스로만 받는다 (2026-11-17 결정, 서버로 보내지 않음) */
export interface Consents {
  privacy: boolean
  ai: boolean
}
