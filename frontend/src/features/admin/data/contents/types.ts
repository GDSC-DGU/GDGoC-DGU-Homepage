import type { AuditStamp } from '../common/types'

/**
 * 홈페이지 콘텐츠 관리 (P-ACT-01 · 02, API-ACT-001~008).
 * 주인: 2단계 게시판 · 프로젝트 · 콘텐츠 담당.
 */
export interface IntroImage {
  id: string
  url: string
  /** 그림 설명 (대체 글) */
  alt: string
  created: AuditStamp
}

export interface Review {
  id: string
  /** 사진. 없으면 기본 이미지 (F-ACT-009) */
  photoUrl: string | null
  /** 활동한 기수. 비워 두면 홈 카드에 기수를 붙이지 않는다 (공개 홈 Interview 와 같은 규칙, content/story.ts) */
  generation: number | null
  /** 본인이 고른 표기 (실명 · 성만 · 이니셜) */
  name: string
  /** 트랙 / 파트 */
  track: string
  /** 후기 (200자 이내) */
  content: string
  isPublic: boolean
  created: AuditStamp
  updated: AuditStamp | null
}

export interface RecruitPoster {
  url: string
  alt: string
}

/** 영역별 마지막 변경 (F-ACT-001 '각 영역의 마지막 변경자 · 시각') */
export interface ContentsChanges {
  introImages: AuditStamp | null
  reviews: AuditStamp | null
  poster: AuditStamp | null
}

/** store 의 contents 칸 = API-ACT-001 응답 { introImages[], reviews[], poster } + 변경 기록 */
export interface ContentsState {
  /** 표시 순서대로 (최대 8장) */
  introImages: IntroImage[]
  reviews: Review[]
  /** 없으면 Recruits 에는 지원 기간 안내만 (F-ACT-006) */
  poster: RecruitPoster | null
  changes: ContentsChanges
}

/** API-ACT-005 · 006 요청 */
export interface ReviewInput {
  photoFileId: string | null
  /** 수정할 때 기존 사진을 그대로 두려면 photoFileId 대신 이 주소를 넘긴다 */
  photoUrl?: string | null
  generation: number | null
  name: string
  track: string
  content: string
  isPublic: boolean
}
