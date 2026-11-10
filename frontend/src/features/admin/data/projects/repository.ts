import type { AdminProject, ProjectInput, ProjectListQuery, ProjectPage } from './types'

/** 프로젝트 관리 저장소 (메서드 하나 = 명세서 API 하나). 주인: 2단계 프로젝트 담당 */
export interface ProjectsRepository {
  /** API-APJ-001 GET /api/admin/projects?q&page — 비공개 포함, 최신 등록순, 페이지당 10개. 검색: 제목 + 설명 */
  list(query: ProjectListQuery): Promise<ProjectPage>
  /** API-APJ-002 DELETE /api/admin/projects { projectIds[] } — 삭제 상태로 */
  remove(projectIds: string[]): Promise<{ deleted: number }>
  /** API-APJ-003 POST /api/admin/projects */
  create(input: ProjectInput): Promise<AdminProject>
  /** API-APJ-005 GET /api/admin/projects/{projectId} (수정 모드) */
  get(projectId: string): Promise<AdminProject>
  /** API-APJ-006 PUT /api/admin/projects/{projectId} */
  update(projectId: string, input: ProjectInput): Promise<AdminProject>
}
