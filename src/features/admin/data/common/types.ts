/**
 * 관리자 데이터 공통 모양. 명세서 API(spec_api_admin) 의 요청 · 응답을 기준으로 한다.
 * 시각은 모두 ISO 문자열(UTC, `new Date().toISOString()`), 화면에서는 ui/format.ts 로 한국 시간으로 보여 준다.
 * 날짜만 있는 값(행사 기간 · 지원 기간)은 'YYYY-MM-DD' (한국 날짜).
 */

/** ISO 8601 시각 문자열 (예: '2026-10-31T09:30:00.000Z') */
export type IsoTime = string

/** 'YYYY-MM-DD' (한국 날짜) */
export type Ymd = string

/** 관리 유형 (명세 F-AMB-001). 관리자 화면에 들어올 수 있는 것은 Lead · Core 뿐 */
export type ManagementType = 'Lead' | 'Core' | 'General'
export type AdminRole = Exclude<ManagementType, 'General'>

/**
 * 누가 했는지 (처리자 · 삭제한 계정 · 변경자).
 * 명세 F-AMB-005: 처리자는 관리자 계정 / 본인 / 시스템.
 */
export type ActorRef = { kind: 'admin'; id: string; name: string; role: ManagementType } | { kind: 'self'; name: string } | { kind: 'system'; name: string }

/** 언제 누가 (등록 · 수정 · 삭제 기록) */
export interface AuditStamp {
  by: ActorRef
  at: IsoTime
}

/** 목록 요청의 공통 쿼리 (page 는 1부터) */
export interface PageQuery {
  page?: number
  pageSize?: number
}

/** 목록 응답 (Spring Page 를 줄인 모양) */
export interface Page<T> {
  items: T[]
  /** 조건에 맞는 전체 개수 ('전체 N개') */
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/** 올린 파일 (API-COM-005 응답). 예시 화면에서는 object URL 이라 새로고침하면 그림이 사라진다 */
export interface FileRef {
  fileId: string
  url: string
  name: string
  /** MIME 타입 (image/png · application/pdf …) */
  type: string
  size: number
}
