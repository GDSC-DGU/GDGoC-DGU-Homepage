import type { BoardId, CommentPage, CommunityPostInput, PostListQuery, PostPage, PostRow } from './types'
import type { PageQuery } from '../common/types'

/**
 * 게시판 관리 저장소. 메서드 하나가 명세서 API 하나다 (나중에 http 구현이 같은 모양으로 붙는다).
 * 주인: 2단계 게시판 담당. 메서드를 더하거나 바꿔도 되지만 이름 · 모양을 바꾸면 mockRepository.ts 도 같이 고친다.
 */
export interface BoardsRepository {
  /**
   * API-ABD-001 GET /api/admin/boards/{board}/posts?category&q&page — 최신순, 삭제 상태 제외, 페이지당 10개.
   * 검색: 제목 + 내용 + 작성자 이름 (관리자 글은 '운영진'으로만 찾힌다).
   * Community 공지는 '전체' · 검색어 없음일 때 모든 페이지 위에 고정(pinned): items 맨 앞, 쪽 나누기는 나머지 글로, total 은 공지 포함
   */
  listPosts(board: BoardId, query: PostListQuery): Promise<PostPage>
  /** API-ABD-002 DELETE /api/admin/boards/{board}/posts { postIds[] } — 삭제 상태(누가 · 언제)로 바꾸고 달린 댓글도 숨김 */
  deletePosts(board: BoardId, postIds: string[]): Promise<{ deleted: number }>
  /** API-ABD-003 GET /api/admin/boards/{board}/comments?page — 최신순, 페이지당 10개, 지운 글의 댓글 제외 */
  listComments(board: BoardId, query: PageQuery): Promise<CommentPage>
  /** API-ABD-004 DELETE /api/admin/comments { commentIds[] } */
  deleteComments(commentIds: string[]): Promise<{ deleted: number }>
  /** API-ABD-005 POST /api/admin/boards/community/posts — '운영진' 이름으로 게시 */
  createCommunityPost(input: CommunityPostInput): Promise<PostRow>
}
