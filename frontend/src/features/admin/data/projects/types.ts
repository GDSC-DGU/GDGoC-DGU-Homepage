import type { AuditStamp, IsoTime, Page, PageQuery } from '../common/types'

/**
 * 프로젝트 관리 (P-APJ-01 · 02, API-APJ-001~006).
 * 주인: 2단계 게시판 · 프로젝트 · 콘텐츠 담당.
 */
export interface AdminProject {
  id: string
  /** 목록 번호 (등록 순서) */
  no: number
  /** 썸네일 주소. 없으면 화면이 글자 표지 */
  thumbnailUrl: string | null
  title: string
  /** 간단한 설명 (입력은 60자 이내, F-APJ-004. 저장소에서 가져온 예전 설명은 더 길 수 있음) */
  summary: string
  /** 기수. 저장소 기록에 없으면 null */
  generation: number | null
  /** 팀원 (자유 입력) */
  members: string
  githubUrl: string | null
  serviceUrl: string | null
  isPublic: boolean
  createdAt: IsoTime
  /** 예전 기록을 옮겨 올 때 날짜가 없던 프로젝트 (createdAt 은 정렬용으로만 쓰고 화면에는 '-') */
  createdAtUnknown?: boolean
  created: AuditStamp
  updated: AuditStamp | null
  deleted: AuditStamp | null
}

export interface ProjectsState {
  projects: AdminProject[]
}

export interface ProjectListQuery extends PageQuery {
  q?: string
}

/** API-APJ-003 · 006 요청 */
export interface ProjectInput {
  thumbnailUrl: string | null
  title: string
  summary: string
  generation: number | null
  members: string
  githubUrl: string | null
  serviceUrl: string | null
  isPublic: boolean
}

export type ProjectPage = Page<AdminProject>
