import type { AuditStamp, FileRef, IsoTime, Page, PageQuery, Ymd } from '../common/types'

/**
 * 게시판 관리 (P-ABD-01 · 02 · 03, API-ABD-001~005).
 * 주인: 게시판 · 프로젝트 · 콘텐츠 담당 (2단계). 대시보드가 posts · comments 를 읽으므로
 * AdminPost 의 id · board · category · title · authorName · createdAt · deleted, AdminComment 의 id · board · postId · authorName · content · createdAt · deleted 는 이름을 유지해 주세요.
 */
export type BoardId = 'teams' | 'community'

/** Teams 분류 (F-TEM-002) */
export const TEAMS_CATEGORIES = ['프로젝트', '스터디', '소모임', '공모전', '기타'] as const
/** Community 분류 (F-ABD-007). 공지 · 세션 · 행사는 관리자 게시글 */
export const COMMUNITY_CATEGORIES = ['공지', '세션', '행사', '정보 공유', '기타'] as const
export type TeamsCategory = (typeof TEAMS_CATEGORIES)[number]
export type CommunityCategory = (typeof COMMUNITY_CATEGORIES)[number]
export type PostCategory = TeamsCategory | CommunityCategory

export const BOARD_LABEL: Record<BoardId, string> = { teams: 'Teams', community: 'Community' }

export interface AdminPost {
  id: string
  board: BoardId
  /** 목록 번호 (게시판마다 1부터) */
  no: number
  category: PostCategory
  title: string
  /** 일반 텍스트 (명세 v1.2) */
  content: string
  /** 작성자 표시 이름. 관리자 게시글은 '운영진' */
  authorName: string
  /** 관리자 게시글(공지 · 세션 · 행사 등, F-ABD-010): 목록에서 음영 */
  byAdmin: boolean
  createdAt: IsoTime
  views: number
  /** Teams 모집 기간 · Community 세션 · 행사 기간 */
  startDate: Ymd | null
  endDate: Ymd | null
  /** Teams 모집 상태 */
  recruitStatus: '모집중' | '마감' | null
  attachments: FileRef[]
  /** 게시한 관리자 계정 (관리자 게시글의 내부 기록) */
  posted: AuditStamp | null
  /** 삭제 상태 (실제로 지우지 않음, F-ABD-003). 삭제한 계정 · 시각 */
  deleted: AuditStamp | null
}

export interface AdminComment {
  id: string
  board: BoardId
  postId: string
  authorName: string
  content: string
  createdAt: IsoTime
  deleted: AuditStamp | null
}

/** store 의 boards 칸 */
export interface BoardsState {
  posts: AdminPost[]
  comments: AdminComment[]
}

/** 목록 한 줄 (API-ABD-001 응답): 게시글 + 댓글 수 */
export interface PostRow extends AdminPost {
  commentCount: number
  /** Community 공지가 목록 위에 고정된 줄 ('전체' 탭 · 검색어 없음일 때 모든 페이지 위, F-CMU-001 2) */
  pinned: boolean
}

/** 기간이 필수이고 홈 캘린더 · 대시보드 행사 일정에 나오는 분류 (F-ABD-010 2) */
export const PERIOD_CATEGORIES: readonly CommunityCategory[] = ['세션', '행사']
/** 위에 고정되는 분류 (F-ABD-010 3) */
export const PINNED_CATEGORY: CommunityCategory = '공지'
/** 게시글당 첨부파일 수 (F-TEM-011 1, 용량 · 개수 미정 → 명세 예시 값) */
export const ATTACHMENT_MAX = 3

/** 댓글 목록 한 줄 (API-ABD-003 응답): 게시글 제목을 함께 */
export interface CommentRow extends AdminComment {
  postTitle: string
}

export interface PostListQuery extends PageQuery {
  /** '전체' 면 비움 */
  category?: PostCategory
  q?: string
}

/** API-ABD-005 요청 */
export interface CommunityPostInput {
  category: CommunityCategory
  title: string
  startDate: Ymd | null
  endDate: Ymd | null
  content: string
  attachmentIds: string[]
}

export type PostPage = Page<PostRow>
export type CommentPage = Page<CommentRow>
