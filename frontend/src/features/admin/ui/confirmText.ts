/**
 * 확인 팝업 문구 규칙 (모든 관리자 화면이 같은 말투를 쓰도록).
 *
 * 1. 제목 = 묻는 문장 하나, '~할까요?' 로 끝난다. 명세서에 문구가 있으면 그대로 ('선택한 N개의 게시글을 삭제할까요?').
 * 2. 본문 = 누르면 생기는 일 · 되돌릴 수 있는지, ~습니다체 한두 문장. '정말' · '확실' 같은 겁주는 말은 쓰지 않는다.
 * 3. 확인 버튼 = 하는 일 동사 ('삭제' · '비활성화' · '발송' · '초기화'). '확인' · '예' 는 쓰지 않는다.
 *    취소 버튼은 늘 '취소'. 되돌리기 어려운 일(삭제 · 발송 · 잠금 해제)은 tone 'danger'.
 * 4. 수를 세면 단위를 붙인다: 게시글 · 댓글 · 프로젝트 '개', 사람 '명', 메일 · 이력 '건'.
 * 5. 끝나면 토스트 한 줄로 결과를 말한다 ('게시글 3개를 삭제했습니다.'). 실패는 이유와 다음 행동.
 */
export interface ConfirmText {
  title: string
  body?: string
  confirmLabel: string
  tone?: 'default' | 'danger'
}

/** 세는 단위 */
export const UNIT: Record<string, string> = { 게시글: '개', 댓글: '개', 프로젝트: '개', 리뷰: '개', 이미지: '장', 사용자: '명', 지원자: '명', 메일: '건', 템플릿: '개' }
const unitOf = (noun: string) => UNIT[noun] ?? '개'

/** '선택한 3개의 게시글을 삭제할까요?' (한 개면 '이 게시글을 삭제할까요?') */
export function deleteConfirm(noun: string, count: number, body?: string): ConfirmText {
  const title = count === 1 ? `이 ${noun}${objectParticle(noun)} 삭제할까요?` : `선택한 ${count}${unitOf(noun)}의 ${noun}${objectParticle(noun)} 삭제할까요?`
  return { title, body, confirmLabel: '삭제', tone: 'danger' }
}

/** 결과 토스트: '게시글 3개를 삭제했습니다.' */
export function doneMessage(noun: string, count: number, verb: string): string {
  const unit = unitOf(noun)
  return `${noun} ${count}${unit}${objectParticle(unit)} ${verb}했습니다.`
}

/**
 * 을/를: 앞 글자의 받침으로 고른다. 한글이 아니면(영문 · 숫자) 읽는 소리로 대강 정한다.
 * 숫자 · 영문 끝: 받침 있게 읽히는 것(0 영, 1 일, 3 삼, 6 육, 7 칠, 8 팔, L M N R)만 '을'.
 */
export function objectParticle(word: string): '을' | '를' {
  const last = word.trim().slice(-1)
  if (!last) return '를'
  const code = last.charCodeAt(0)
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 === 0 ? '를' : '을'
  return /[013678lmnrLMNR]/.test(last) ? '을' : '를'
}
