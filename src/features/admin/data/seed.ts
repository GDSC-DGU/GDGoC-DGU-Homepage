import { BOARDS_SEED_VERSION, createBoardsSeed } from './boards/seed'
import type { BoardsState } from './boards/types'
import type { SeedContext } from './common/seedContext'
import { CONTENTS_SEED_VERSION, createContentsSeed } from './contents/seed'
import type { ContentsState } from './contents/types'
import { createProjectsSeed, PROJECTS_SEED_VERSION } from './projects/seed'
import type { ProjectsState } from './projects/types'
import { createRecruitSeed, RECRUIT_SEED_VERSION } from './recruit/seed'
import type { RecruitState } from './recruit/types'
import { createUsersSeed, USERS_SEED_VERSION } from './users/seed'
import type { UsersState } from './users/types'

/**
 * 관리자 예시 데이터 전체 = 구역 seed 를 모은 것.
 * 이 파일은 기초(1단계)가 관리한다. 구역 담당은 자기 seed.ts 만 고친다 (함수 · 버전 이름은 유지).
 */
export interface AdminData {
  boards: BoardsState
  projects: ProjectsState
  contents: ContentsState
  users: UsersState
  recruit: RecruitState
}

export const SLICE_VERSIONS: Record<keyof AdminData, number> = {
  boards: BOARDS_SEED_VERSION,
  projects: PROJECTS_SEED_VERSION,
  contents: CONTENTS_SEED_VERSION,
  users: USERS_SEED_VERSION,
  recruit: RECRUIT_SEED_VERSION,
}

export function createAdminSeed(ctx: SeedContext): AdminData {
  return {
    boards: createBoardsSeed(ctx),
    projects: createProjectsSeed(ctx),
    contents: createContentsSeed(ctx),
    users: createUsersSeed(ctx),
    recruit: createRecruitSeed(ctx),
  }
}
