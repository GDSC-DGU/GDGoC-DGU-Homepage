import type { AdminMe } from '../common/accounts'

/** 관리자 인증 (API-ACM-001~004). 주인: 기초(1단계) */
export interface AuthRepository {
  /** API-ACM-001 POST /api/admin/auth/login { loginId, password }. 실패하면 AdminRepoError (INVALID_CREDENTIALS · INACTIVE · RATE_LIMITED · LOCKED) */
  login(input: { loginId: string; password: string }): Promise<AdminMe>
  /** API-ACM-002 PATCH /api/admin/auth/password { currentPassword, newPassword } */
  changePassword(input: { currentPassword: string; newPassword: string }): Promise<AdminMe>
  /** API-ACM-003 GET /api/admin/me. 로그인하지 않았으면 null (서버의 401) */
  me(): Promise<AdminMe | null>
  /** API-ACM-004 POST /api/admin/auth/logout */
  logout(): Promise<void>
}
