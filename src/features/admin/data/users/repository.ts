import type { Page } from '../common/types'
import type {
  IssuedCredential,
  MailResult,
  StatusChangeResult,
  UserCreateInput,
  UserDetail,
  UserHistoryEntry,
  UserHistoryQuery,
  UserListQuery,
  UserListResult,
  UserRow,
  UserUpdateInput,
} from './types'

/** 메일을 보낸 동작의 결과: 바뀐 사용자 + 발송 결과 (완료 / 실패) */
export interface MailOutcome {
  user: UserRow
  mail: MailResult
}

/**
 * 사용자 관리 저장소 (메서드 하나 = 명세서 API 하나). 주인: 2단계 사용자 담당.
 * 권한 · 상태 규칙은 data/permissions.ts + data/users/rules.ts 를 서버처럼 한 번 더 확인한다 (막히면 FORBIDDEN · CONFLICT).
 */
export interface UsersRepository {
  /** API-AMB-001 GET /api/admin/users?type&q&page — 학번 가림, 탭별 인원 · PIN 미설정 인원 */
  list(query: UserListQuery): Promise<UserListResult>
  /** 수정 팝업용 한 명 (전체 학번 포함, 수정할 수 있는 사람만). 명세 API 에는 없어 서버에서는 GET /api/admin/users/{userId} 를 더하거나 목록 응답으로 대신한다 */
  get(userId: string): Promise<UserDetail>
  /** API-AMB-002 PATCH /api/admin/users/status { userIds[], status } — 규칙에 걸린 사람은 빼고 바꾼다 */
  setStatus(userIds: string[], status: 'active' | 'inactive'): Promise<StatusChangeResult>
  /** API-AMB-003 GET /api/admin/users/history?type&from&to&q&page (20건, 최신순) */
  history(query: UserHistoryQuery): Promise<Page<UserHistoryEntry>>
  /** API-AMB-004 GET /api/admin/users/login-id/availability?loginId */
  checkLoginId(loginId: string): Promise<{ available: boolean; message: string }>
  /** API-AMB-005 POST /api/admin/users — PIN 설정 링크 메일 발송, Lead · Core 는 임시 비밀번호 발급. 학번 중복 409 */
  create(input: UserCreateInput): Promise<IssuedCredential>
  /** API-AMB-006 PATCH /api/admin/users/{userId} (학번 변경 불가). General → Lead · Core 면 임시 비밀번호 발급 */
  update(userId: string, input: UserUpdateInput): Promise<IssuedCredential>
  /** API-AMB-007 POST /api/admin/users/{userId}/password-reset (Lead 만) */
  resetPassword(userId: string): Promise<IssuedCredential>
  /** API-AMB-008 POST /api/admin/users/{userId}/pin-reset — 재설정 링크 발송, 잠겼으면 함께 해제 */
  resetPin(userId: string): Promise<MailOutcome>
  /** API-AMB-009 POST /api/admin/users/{userId}/pin-setup-mail (이전 링크 무효, 1분 간격 429) */
  resendPinMail(userId: string): Promise<MailOutcome>
  /** API-AMB-010 POST /api/admin/users/{userId}/unlock { resetPin } */
  unlock(userId: string, options: { resetPin: boolean }): Promise<{ user: UserRow; mail: MailResult | null }>
}
