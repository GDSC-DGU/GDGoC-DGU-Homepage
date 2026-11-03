import { partShort } from '@/features/teams/data/rules'
import { COMMUNITY_CATEGORIES, TEAMS_CATEGORIES, type BoardId, type PostCategory, type PostRow } from '../data/boards/types'
import { ADMIN_SAMPLE } from '../sample'

/**
 * 분류 탭. Community 의 정보 공유 · 기타(회원 글)는 공개 사이트에 그 게시판이 없어 예시 화면에서만 보인다.
 */
export const boardCategories = (board: BoardId): readonly PostCategory[] =>
  board === 'teams' ? TEAMS_CATEGORIES : ADMIN_SAMPLE ? COMMUNITY_CATEGORIES : COMMUNITY_CATEGORIES.filter((c) => c === '공지' || c === '세션' || c === '행사')

/** 작성자 · 기수: '김민준 · 4기' (관리자 글은 '운영진') */
export const authorText = (p: { authorName: string; authorGeneration?: number | null }) => (p.authorGeneration ? `${p.authorName} · ${p.authorGeneration}기` : p.authorName)

/** 구하는 파트: 'FE · BE' · 비면 '파트 무관' */
export const partsText = (parts: PostRow['parts']) => (parts?.length ? parts.map(partShort).join(' · ') : '파트 무관')
