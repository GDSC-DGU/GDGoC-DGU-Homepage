/**
 * 팀원 찾기 게시판 (명세 P-TEM-001 · 002 · 003, P-COM-03).
 * 명세에 없는 칸: 구하는 파트 · 모집 인원 · 연락 방법 링크 (4기 Organizer 결정 2026-11, 백엔드 명세에 추가 요청 필요).
 */

/** 분류 (F-TEM-002) */
export const TEAMS_CATEGORIES = ['프로젝트', '스터디', '소모임', '공모전', '기타'] as const
export type TeamsCategory = (typeof TEAMS_CATEGORIES)[number]

/** 모집 상태: 종료일 다음 날 0시(KST)에 자동으로 마감, 작성자가 수정에서 바로 마감할 수도 있다 */
export const RECRUIT_STATUSES = ['모집중', '마감'] as const
export type RecruitStatus = (typeof RECRUIT_STATUSES)[number]

/** 구하는 파트 (4기 네 파트, 홈 '역량' 카드와 같은 짧은 이름) */
export const TEAM_PARTS = [
  { id: 'design', short: 'PD', name: 'Product Design' },
  { id: 'ai', short: 'AI/ML', name: 'AI/ML' },
  { id: 'frontend', short: 'FE', name: 'Frontend' },
  { id: 'backend', short: 'BE', name: 'Backend' },
] as const
export type TeamPartId = (typeof TEAM_PARTS)[number]['id']

/** 'YYYY-MM-DD' (한국 날짜) */
export type Ymd = string

/** 글 · 댓글 작성자: 학번으로 확인된 사용자의 이름 + 기수 (누구나 읽는 게시판이라 학번은 보이지 않는다) */
export interface Author {
  name: string
  generation: number
}

export interface Attachment {
  id: string
  name: string
  /** MIME (application/pdf · image/jpeg · image/png) */
  type: string
  size: number
  /** 내려받는 주소 (서버에서는 짧은 시간만 유효한 주소) */
  url: string
}

export interface TeamPost {
  id: string
  /** 목록 번호 (오래된 글부터 1) */
  no: number
  category: TeamsCategory
  title: string
  /** 일반 텍스트 */
  content: string
  author: Author
  createdAt: string
  /** 수정한 시각. 있으면 '수정됨' */
  editedAt: string | null
  views: number
  startDate: Ymd
  endDate: Ymd
  status: RecruitStatus
  parts: TeamPartId[]
  /** 모집 인원. 정하지 않았으면 null */
  headcount: number | null
  /** 연락 방법 링크 (오픈채팅 · 디스코드 등) */
  contactUrl: string | null
  attachments: Attachment[]
  commentCount: number
}

export interface TeamComment {
  id: string
  postId: string
  author: Author
  content: string
  createdAt: string
}

/** 정렬: 최신순 (기본, 명세) · 마감 임박순 (모집 중인 글을 종료일 가까운 순으로 먼저) · 조회순 */
export const SORTS = [
  { id: 'latest', label: '최신순' },
  { id: 'deadline', label: '마감 임박순' },
  { id: 'views', label: '조회순' },
] as const
export type SortId = (typeof SORTS)[number]['id']

export interface ListQuery {
  category?: TeamsCategory
  status?: RecruitStatus
  part?: TeamPartId
  q?: string
  /** 비우면 최신순 */
  sort?: Exclude<SortId, 'latest'>
  page: number
}

export interface ListPage {
  items: TeamPost[]
  total: number
  page: number
  pageCount: number
}

/** 옆 칸 · 이전/다음 글에 쓰는 짧은 글 정보 */
export interface PostBrief {
  id: string
  category: TeamsCategory
  title: string
  status: RecruitStatus
  endDate: Ymd
  views: number
  commentCount: number
}

export interface BoardSummary {
  /** 지금 모집 중인 글 */
  open: number
  /** 24시간 안 새 글 (목록의 N 표시와 같은 기준) */
  newToday: number
  total: number
  /** 모집 중이고 종료일이 3일 안인 글 (가까운 순, 최대 3개) */
  closingSoon: PostBrief[]
  /** 최근 7일 많이 본 글 5개 */
  popular: PostBrief[]
}

/** 글 보기 아래 이전 글(더 오래된) · 다음 글(더 새로운) */
export interface Adjacent {
  prev: PostBrief | null
  next: PostBrief | null
}

/** 학번 + PIN (로그인 없이 요청마다 보낸다. 브라우저 저장소에 남기지 않는다) */
export interface Credentials {
  studentId: string
  pin: string
}

export interface PostInput {
  category: TeamsCategory
  title: string
  startDate: Ymd
  endDate: Ymd
  parts: TeamPartId[]
  headcount: number | null
  contactUrl: string | null
  content: string
  /** 올려 둔 첨부파일 (upload 결과의 id) */
  attachmentIds: string[]
}

/** 수정: 모집 상태도 바꿀 수 있다 */
export interface PostUpdate extends PostInput {
  status: RecruitStatus
}
