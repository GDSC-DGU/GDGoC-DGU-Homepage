import type { Adjacent, Attachment, BoardSummary, Credentials, ListPage, ListQuery, PostInput, PostUpdate, TeamComment, TeamPost } from './types'
import type { FieldErrors } from './rules'

/**
 * 팀원 찾기 게시판의 '창구'. 화면은 이 인터페이스만 쓴다.
 * 지금은 예시 구현(sampleRepository.ts: 브라우저 메모리, 새로고침하면 처음으로)이고,
 * 백엔드 API 가 생기면 같은 모양의 http 구현을 만들어 teamsRepo.ts 에서 바꿔 끼운다. 화면 코드는 그대로다.
 */
export interface TeamsRepository {
  /** 목록 (최신순, 한 쪽 10개). 분류 · 모집 상태 · 파트 · 검색어(제목 · 내용 · 작성자)를 함께 적용 */
  list(query: ListQuery): Promise<ListPage>
  /** 머리 안내판 숫자 + 옆 칸 (마감 임박 · 많이 본 글) */
  summary(): Promise<BoardSummary>
  /** 이 글의 이전 글(더 오래된) · 다음 글(더 새로운) */
  adjacent(id: string): Promise<Adjacent>
  /** 글 하나. 삭제된 글은 DELETED, 없는 글은 NOT_FOUND */
  get(id: string): Promise<TeamPost>
  /** 들어올 때마다 조회수 +1. 바뀐 조회수를 돌려준다 */
  countView(id: string): Promise<number>
  /** 댓글 (작성 순서) */
  comments(postId: string): Promise<TeamComment[]>
  /** 첨부파일 올리기 (학번 · PIN 을 넣어야 고를 수 있다). 등록 전에는 목록에서 빼기만 하면 된다 */
  upload(file: File, cred: Credentials): Promise<Attachment>
  create(input: PostInput, cred: Credentials): Promise<TeamPost>
  /** 본인 확인 (수정 · 삭제 전, P-COM-03). 작성자가 아니면 NOT_AUTHOR */
  verifyAuthor(id: string, cred: Credentials): Promise<void>
  update(id: string, input: PostUpdate, cred: Credentials): Promise<TeamPost>
  /** 실제로 지우지 않고 삭제 상태로 (댓글도 함께 숨김) */
  remove(id: string, cred: Credentials): Promise<void>
  addComment(postId: string, content: string, cred: Credentials): Promise<TeamComment>
}

export type TeamsErrorCode =
  /** 입력 칸 오류 (fields) */
  | 'INVALID'
  /** 학번 또는 PIN 이 틀림 (남은 횟수) */
  | 'AUTH_WRONG'
  /** 5번 틀려서 잠시 막힘 (until) */
  | 'AUTH_LIMITED'
  /** 계정 잠김 (운영진이 풀어 줌) */
  | 'AUTH_LOCKED'
  /** PIN 을 아직 설정하지 않음 · 초기화됨 (메일 링크) */
  | 'PIN_NOT_SET'
  | 'NOT_AUTHOR'
  | 'NOT_FOUND'
  | 'DELETED'

export class TeamsError extends Error {
  readonly code: TeamsErrorCode
  readonly fields?: FieldErrors
  /** AUTH_LIMITED: 다시 시도할 수 있는 시각 */
  readonly until?: number
  constructor(code: TeamsErrorCode, message: string, extra: { fields?: FieldErrors; until?: number } = {}) {
    super(message)
    this.name = 'TeamsError'
    this.code = code
    this.fields = extra.fields
    this.until = extra.until
  }
}

/** 학번 · PIN 문제인지 (작성자 확인 칸 아래에 보여 줄 오류) */
export const isAuthError = (e: unknown): e is TeamsError => e instanceof TeamsError && ['AUTH_WRONG', 'AUTH_LIMITED', 'AUTH_LOCKED', 'PIN_NOT_SET', 'NOT_AUTHOR'].includes(e.code)

export function errorText(e: unknown): string {
  if (e instanceof TeamsError) return e.message
  return '잠시 문제가 생겼습니다. 다시 시도해 주세요.'
}
