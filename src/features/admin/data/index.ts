/**
 * 관리자 데이터 층 입구. 화면은 여기서 꺼내 쓴다:
 *   import { useAdminRepos, adminKeys, errorMessage, canEditUser } from '@/features/admin/data'
 * 구역 타입은 구역 파일에서 직접: import type { PostRow } from '@/features/admin/data/boards/types'
 */
export { useAdminRepos, useAdminSnapshot, useResetExampleData } from './useAdminData'
export { adminKeys, adminMeKey } from './queryKeys'
export type { AdminRepositories } from './repositories'
export { AdminRepoError, errorMessage, isAdminRepoError, type AdminErrorCode } from './common/errors'
export type { ActorRef, AdminRole, AuditStamp, FileRef, IsoTime, ManagementType, Page, PageQuery, Ymd } from './common/types'
export { actorLabel, EXAMPLE_ACCOUNTS, type AdminMe, type UserCore, type UserStatus } from './common/accounts'
export { isEmail, isHttpUrl, isStudentId, maskStudentId } from './common/mask'
export { checkFile, fileSizeLabel, FILE_RULES, type FileRule, type FileRuleId } from './common/fileRules'
export { DEFAULT_PAGE_SIZE } from './common/list'
export { getMockOptions, setMockOptions } from './common/mockContext'
export * from './permissions'
