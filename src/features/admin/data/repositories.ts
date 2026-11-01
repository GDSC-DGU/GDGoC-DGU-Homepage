import type { AuthRepository } from './auth/repository'
import { createMockAuthRepository } from './auth/mockRepository'
import type { SessionStore } from './auth/session'
import type { BoardsRepository } from './boards/repository'
import { createMockBoardsRepository } from './boards/mockRepository'
import { actorOf } from './common/accounts'
import type { MockContext } from './common/mockContext'
import type { FileRef } from './common/types'
import { createMockUploadRepository, type UploadRepository } from './common/uploads'
import type { ContentsRepository } from './contents/repository'
import { createMockContentsRepository } from './contents/mockRepository'
import type { DashboardRepository } from './dashboard/repository'
import { createMockDashboardRepository } from './dashboard/mockRepository'
import { canUseAdmin } from './permissions'
import type { ProjectsRepository } from './projects/repository'
import { createMockProjectsRepository } from './projects/mockRepository'
import type { RecruitRepository } from './recruit/repository'
import { createMockRecruitRepository } from './recruit/mockRepository'
import type { AdminStore } from './store'
import type { UsersRepository } from './users/repository'
import { createMockUsersRepository } from './users/mockRepository'

/**
 * 관리자 화면이 데이터를 가져오는 창구 (Repository 패턴, 공개 사이트 src/data 와 같은 생각).
 * 화면은 useAdminRepos() 로 이 묶음만 쓴다. 지금은 예시(mock) 구현, 서버가 생기면 http 구현을 같은 모양으로 만들어
 * AdminDataProvider 에서 바꿔 끼운다 (docs/ADMIN.md '나중에 API 붙이는 법').
 */
export interface AdminRepositories {
  auth: AuthRepository
  dashboard: DashboardRepository
  boards: BoardsRepository
  projects: ProjectsRepository
  contents: ContentsRepository
  users: UsersRepository
  recruit: RecruitRepository
  uploads: UploadRepository
}

/** 예시 저장소 묶음. 지금 로그인한 관리자(actor)는 session + users 칸에서 읽는다 (서버가 쿠키로 아는 것처럼) */
export function createMockAdminRepositories({ store, session, now = Date.now }: { store: AdminStore; session: SessionStore; now?: () => number }): AdminRepositories {
  const ctx: MockContext = {
    store,
    now,
    files: new Map<string, FileRef>(),
    actor() {
      const s = session.read()
      const u = s ? store.get('users').users.find((x) => x.id === s.userId) : undefined
      return u && canUseAdmin(u).allowed ? actorOf(u) : null
    },
  }
  return {
    auth: createMockAuthRepository(ctx, session),
    dashboard: createMockDashboardRepository(ctx),
    boards: createMockBoardsRepository(ctx),
    projects: createMockProjectsRepository(ctx),
    contents: createMockContentsRepository(ctx),
    users: createMockUsersRepository(ctx),
    recruit: createMockRecruitRepository(ctx),
    uploads: createMockUploadRepository(ctx),
  }
}
