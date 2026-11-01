import { validateCommunityPostInput } from '../data/boards/mockRepository'
import { PERIOD_CATEGORIES, PINNED_CATEGORY, type CommunityCategory, type CommunityPostInput } from '../data/boards/types'
import type { FileRef } from '../data/common/types'

/**
 * Community 관리자 글 작성 폼 (P-ABD-03) 의 화면 밖 계산: 입력 → API 요청 모양 · 오류 · 분류 안내.
 * 테스트: writeForm.test.ts
 */
export interface CommunityDraft {
  category: CommunityCategory | null
  title: string
  startDate: string
  endDate: string
  content: string
  attachments: FileRef[]
}

export const emptyDraft = (): CommunityDraft => ({ category: null, title: '', startDate: '', endDate: '', content: '', attachments: [] })

/** 세션 · 행사인지 (기간 입력이 보이고 필수) */
export const needsPeriod = (c: CommunityCategory | null): boolean => !!c && PERIOD_CATEGORIES.includes(c)

/** 무언가 썼는지 ([취소] · 탭 닫기 전에 물을지) */
export function isDirty(d: CommunityDraft): boolean {
  return !!(d.category || d.title.trim() || d.startDate || d.endDate || d.content.trim() || d.attachments.length)
}

/** API-ABD-005 요청. 기간은 세션 · 행사만 보낸다 (다른 분류로 바꾸면 적어 둔 기간은 버린다) */
export function toCommunityInput(d: CommunityDraft): CommunityPostInput {
  const period = needsPeriod(d.category)
  return {
    category: d.category as CommunityCategory,
    title: d.title.trim(),
    startDate: period && d.startDate ? d.startDate : null,
    endDate: period && d.endDate ? d.endDate : null,
    content: d.content.trim(),
    attachmentIds: d.attachments.map((f) => f.fileId),
  }
}

/** 칸별 오류 (예시 저장소 · 서버와 같은 규칙). 분류를 안 골랐으면 분류 오류 */
export function validateDraft(d: CommunityDraft): Record<string, string> {
  const e = validateCommunityPostInput(toCommunityInput(d))
  if (!d.category) e.category = '분류를 골라 주세요.'
  return e
}

/** 분류 칸 아래 안내 (고른 분류에 따라) */
export function categoryHelp(c: CommunityCategory | null): string {
  if (!c) return '공지 · 세션 · 행사를 포함한 모든 분류로 게시할 수 있습니다.'
  if (c === PINNED_CATEGORY) return '공지는 Community 목록 맨 위에 고정됩니다.'
  if (needsPeriod(c)) return '세션 · 행사는 기간이 필수입니다. 기간은 홈 캘린더와 대시보드 행사 일정에 표시됩니다.'
  return '정보 공유 · 기타는 회원도 쓰는 분류입니다. 기간은 입력하지 않습니다.'
}
