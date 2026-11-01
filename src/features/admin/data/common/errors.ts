/**
 * 저장소(Repository)가 실패를 알리는 방법. http 구현에서는 상태 코드를 이 code 로 바꿔 던진다.
 * message 는 화면에 그대로 보여 줄 수 있는 문장(명세서의 안내 문구 우선, ~습니다체).
 */
export type AdminErrorCode =
  /** 400: 입력 형식이 틀림 */
  | 'VALIDATION'
  /** 401: 로그인이 필요함 · 아이디 또는 비밀번호가 틀림 */
  | 'UNAUTHORIZED'
  | 'INVALID_CREDENTIALS'
  /** 403: 권한 없음 · 비활성 계정 */
  | 'FORBIDDEN'
  | 'INACTIVE'
  /** 404 */
  | 'NOT_FOUND'
  /** 409: 중복 · 겹침 · 상태 충돌 (학번 중복, 면접 시간 겹침, 마지막 소개 이미지 삭제 …) */
  | 'CONFLICT'
  /** 423: 잠긴 계정 · 잠긴 결과 */
  | 'LOCKED'
  /** 429: 횟수 · 간격 제한 (로그인 5회 실패 15분, 링크 재발송 1분) */
  | 'RATE_LIMITED'
  /** 예시 화면에서 '실패 흉내'를 켰을 때 */
  | 'NETWORK'
  /** 아직 연결하지 않은 기능 (2단계가 채운다) */
  | 'NOT_READY'

export class AdminRepoError extends Error {
  readonly code: AdminErrorCode
  /** 입력 칸별 오류 (VALIDATION) */
  readonly fields?: Record<string, string>
  /** 덧붙일 값 (겹치는 담당자, 제외된 인원 …) */
  readonly detail?: unknown

  constructor(code: AdminErrorCode, message: string, extra: { fields?: Record<string, string>; detail?: unknown } = {}) {
    super(message)
    this.name = 'AdminRepoError'
    this.code = code
    this.fields = extra.fields
    this.detail = extra.detail
  }
}

export const isAdminRepoError = (e: unknown): e is AdminRepoError => e instanceof AdminRepoError

/** 화면에 보여 줄 실패 문장 (알 수 없는 오류는 한 문장으로) */
export function errorMessage(e: unknown): string {
  if (isAdminRepoError(e)) return e.message
  return '처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

/** 아직 만들지 않은 기능을 부르면 (2단계가 채울 자리) */
export function notReady(featureId: string): never {
  throw new AdminRepoError('NOT_READY', `아직 연결하지 않은 기능입니다 (${featureId}).`)
}
